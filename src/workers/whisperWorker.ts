import {
    AutoProcessor,
    AutoTokenizer,
    TextStreamer,
    WhisperForConditionalGeneration,
    full,
} from "@huggingface/transformers";

const MAX_NEW_TOKENS = 64;

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
    this.tokenizer ??= AutoTokenizer.from_pretrained(this.model_id, {
      progress_callback,
    });
    this.processor ??= AutoProcessor.from_pretrained(this.model_id, {
      progress_callback,
    });

    this.model ??= WhisperForConditionalGeneration.from_pretrained(
      this.model_id,
      {
        dtype: {
          encoder_model: "fp32", // 'fp16' works too
          decoder_model_merged: "q4", // or 'fp32' ('fp16' is broken)
        },
        device: "webgpu",
        progress_callback,
      },
    );

    return Promise.all([this.tokenizer, this.processor, this.model]);
  }
}

let processing = false;

async function generate({ audio, language }: { audio: Float32Array; language: string }) {
  if (processing) return;
  processing = true;

  // Tell the main thread we are starting
  self.postMessage({ status: "start" });

  try {
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

    const inputs = await processor(audio);

    const outputs = await model.generate({
      ...inputs,
      max_new_tokens: MAX_NEW_TOKENS,
      language,
      streamer,
    });

    const decoded = tokenizer.batch_decode(outputs, {
      skip_special_tokens: true,
    });

    // Send the output back to the main thread
    self.postMessage({
      status: "complete",
      output: decoded[0] || decoded, // Handle both array and string responses
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
  self.postMessage({
    status: "loading",
    data: "Loading model...",
  });

  try {
    // Load the pipeline and save it for future use.
    const [tokenizer, processor, model] =
      await AutomaticSpeechRecognitionPipeline.getInstance((progress) => {
        // We also add a progress callback to the pipeline so that we can
        // track model loading.
        self.postMessage(progress);
      });

    self.postMessage({
      status: "loading",
      data: "Compiling shaders and warming up model...",
    });

    // Run model with dummy input to compile shaders
    await model.generate({
      input_features: full([1, 80, 3000], 0.0),
      max_new_tokens: 1,
    });
    
    self.postMessage({ status: "ready" });
  } catch (error) {
    console.error('Whisper model loading error:', error);
    self.postMessage({
      status: "error",
      error: error instanceof Error ? error.message : 'Failed to load model'
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

