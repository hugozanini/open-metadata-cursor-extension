import {
    AutoProcessor,
    AutoTokenizer,
    TextStreamer,
    WhisperForConditionalGeneration,
    env,
    full,
} from "@huggingface/transformers";

// Configure environment for local WASM files
env.allowRemoteModels = true;
env.allowLocalModels = true;

const MAX_NEW_TOKENS = 64;

// -----------------------------
// Audio preprocessing utilities
// -----------------------------

function peakNormalizeMono(data: Float32Array): Float32Array {
  let max = 1e-6;
  for (let i = 0; i < data.length; i++) {
    const v = Math.abs(data[i]);
    if (v > max) max = v;
  }
  if (max === 0) return data;
  const out = new Float32Array(data.length);
  const inv = 1 / max;
  for (let i = 0; i < data.length; i++) out[i] = data[i] * inv;
  return out;
}

// One-pole high-pass filter to reduce low-frequency rumble
function highPassFilterMono(data: Float32Array, alpha: number = 0.97): Float32Array {
  if (data.length === 0) return data;
  const out = new Float32Array(data.length);
  out[0] = data[0];
  for (let i = 1; i < data.length; i++) {
    out[i] = alpha * (out[i - 1] + data[i] - data[i - 1]);
  }
  return out;
}

function preprocessAudio(input: Float32Array): Float32Array {
  // Peak normalize to [-1, 1] and apply light high-pass
  const normalized = peakNormalizeMono(input);
  return highPassFilterMono(normalized, 0.97);
}

// -----------------------------
// Text post-processing utilities
// -----------------------------

function cleanText(text: string): string {
  if (!text) return '';
  let out = text;
  // Remove bracketed artifacts
  out = out.replace(/\[(?:BLANK_AUDIO|NOISE|MUSIC|INAUDIBLE|APPLAUSE|COUGH|SILENCE)\]/gi, ' ');
  // Remove any other bracketed tokens conservatively
  out = out.replace(/\[[^\]]+\]/g, ' ');
  // Remove parenthetical stage directions with common noise words
  out = out.replace(/\((?:audience|people|crowd|chatter|chattering|noise|music|inaudible|applause|cough|silence)[^)]*\)/gi, ' ');
  // Collapse whitespace
  out = out.replace(/\s+/g, ' ').trim();
  return out;
}

/**
 * This class uses the Singleton pattern to ensure that only one instance of the model is loaded.
 * Adapted from realtime-whisper-webgpu for VS Code extension use
 */
class AutomaticSpeechRecognitionPipeline {
  static model_id = "onnx-community/whisper-base";
  static tokenizer: any = null;
  static processor: any = null;
  static model: any = null;

  static async getInstance(progress_callback: ((progress: any) => void) | null = null) {
    console.log('Worker: getInstance called, loading tokenizer and processor...');
    
    try {
      this.tokenizer ??= AutoTokenizer.from_pretrained(this.model_id, {
        progress_callback,
      });
      console.log('Worker: Tokenizer loading initiated');
      
      this.processor ??= AutoProcessor.from_pretrained(this.model_id, {
        progress_callback,
      });
      console.log('Worker: Processor loading initiated');
    } catch (error) {
      console.error('Worker: Failed to initiate tokenizer/processor loading:', error);
      throw error;
    }

    // Try different backends in order of preference
    if (!this.model) {
      console.log('Worker: Model not loaded yet, attempting to load...');
      // Only use backends that are actually supported by the model
      const backends = ["webgpu", "wasm"];
      let lastError: any = null;
      
      for (const device of backends) {
        try {
          console.log(`Worker: Attempting to load model with ${device} backend...`);
          
          // Log WebGPU availability for informational purposes
          if (device === "webgpu") {
            if (!navigator.gpu) {
              console.log("Worker: WebGPU not available in this environment, but trying anyway");
            } else {
              console.log("Worker: WebGPU is available, attempting to use it");
            }
          }
          
          this.model = await WhisperForConditionalGeneration.from_pretrained(
            this.model_id,
            {
              dtype: {
                encoder_model: "fp32",
                decoder_model_merged: "q4",
              },
              device,
              progress_callback,
            },
          );
          console.log(`Worker: Successfully loaded model with ${device} backend`);
          break;
        } catch (error) {
          console.warn(`Worker: Failed to load model with ${device} backend:`, error);
          lastError = error;
        }
      }
      
      if (!this.model) {
        const errorMsg = `Failed to load model with any backend. Last error: ${lastError?.message || 'Unknown error'}`;
        console.error('Worker:', errorMsg);
        throw new Error(errorMsg);
      }
    } else {
      console.log('Worker: Model already loaded, reusing existing instance');
    }

    console.log('Worker: Waiting for all components (tokenizer, processor, model) to be ready...');
    try {
      const result = await Promise.all([this.tokenizer, this.processor, this.model]);
      console.log('Worker: All components loaded successfully');
      return result;
    } catch (error) {
      console.error('Worker: Failed to load one or more components:', error);
      throw error;
    }
  }
}

let processing = false;

async function generate({ audio, language }: { audio: Float32Array; language: string }) {
  if (processing) return;
  processing = true;

  // Tell the main thread we are starting
  self.postMessage({ status: "start" });

  try {
    // Pre-process audio (normalize + high-pass)
    const preprocessed = preprocessAudio(audio);

    // Retrieve the text-generation pipeline.
    const [tokenizer, processor, model] =
      await AutomaticSpeechRecognitionPipeline.getInstance();

    let startTime: number;
    let numTokens = 0;
    let tps: number;
    const token_callback_function = () => {
      startTime ??= performance.now();

      if (numTokens++ > 0) {
        tps = (numTokens / (performance.now() - startTime)) * 1000;
      }
    };
    const callback_function = (output: any) => {
      self.postMessage({
        status: "update",
        output,
        tps,
        numTokens,
      });
    };

    const streamer = new TextStreamer(tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function,
      token_callback_function,
    });

    const inputs = await processor(preprocessed);

    const outputs = await model.generate({
      ...inputs,
      max_new_tokens: MAX_NEW_TOKENS,
      language,
      streamer,
    });

    const decoded = tokenizer.batch_decode(outputs, {
      skip_special_tokens: true,
    });

    // Clean the decoded text to suppress artifacts
    const rawText = decoded[0] || decoded;
    const cleaned = typeof rawText === 'string' ? cleanText(rawText) : '';

    // Send the output back to the main thread
    self.postMessage({
      status: "complete",
      output: cleaned || rawText, // Prefer cleaned text
    });
  } catch (error) {
    console.error('Whisper generation error:', error);
    self.postMessage({
      status: "error",
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  } finally {
    processing = false;
  }
}

async function load() {
  console.log('Worker: Starting model load process...');
  self.postMessage({
    status: "loading",
    data: "Loading model...",
  });

  try {
    console.log('Worker: Requesting model instance...');
    // Load the pipeline and save it for future use.
    let tokenizer, processor, model;
    
    try {
      [tokenizer, processor, model] = await AutomaticSpeechRecognitionPipeline.getInstance((progress) => {
        // We also add a progress callback to the pipeline so that we can
        // track model loading.
        console.log('Worker: Progress update:', progress);
        self.postMessage(progress);
      });
      console.log('Worker: getInstance completed successfully');
    } catch (instanceError) {
      console.error('Worker: getInstance failed:', instanceError);
      throw instanceError;
    }

    console.log('Worker: Model components loaded, starting warm-up...');
    self.postMessage({
      status: "loading",
      data: "Compiling shaders and warming up model...",
    });

    // Run model with dummy input to compile shaders
    console.log('Worker: Running warm-up inference...');
    try {
      const dummyInput = full([1, 80, 3000], 0.0);
      console.log('Worker: Created dummy input, calling model.generate...');
      await model.generate({
        input_features: dummyInput,
        max_new_tokens: 1,
      });
      console.log('Worker: Warm-up completed successfully');
    } catch (warmupError) {
      console.warn('Worker: Warm-up failed, but model should still work:', warmupError);
      // Continue anyway - warm-up failure doesn't mean the model won't work
    }
    
    console.log('Worker: Model is ready!');
    self.postMessage({ status: "ready" });
  } catch (error) {
    console.error('Whisper model loading error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to load model';
    
    // Provide helpful error messages for common issues
    let userFriendlyMessage = errorMessage;
    if (errorMessage.includes('Failed to fetch dynamically imported module')) {
      userFriendlyMessage = 'Network error loading model components. Please check your internet connection and try again.';
    } else if (errorMessage.includes('no available backend')) {
      userFriendlyMessage = 'No compatible processing backend found. Please ensure your browser supports WebAssembly.';
    } else if (errorMessage.includes('Failed to load model with any backend')) {
      userFriendlyMessage = 'Failed to initialize speech recognition. Please check your internet connection and try again.';
    }
    
    self.postMessage({
      status: "error",
      error: userFriendlyMessage,
      originalError: errorMessage
    });
  }
}

// Listen for messages from the main thread
self.addEventListener("message", async (e) => {
  const { type, data } = e.data;

  switch (type) {
    case "load":
      await load();
      break;

    case "generate":
      await generate(data);
      break;

    default:
      console.warn('Unknown message type:', type);
  }
});

// Export for TypeScript
export { };

