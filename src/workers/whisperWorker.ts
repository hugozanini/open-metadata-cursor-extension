import {
    AutoProcessor,
    AutoTokenizer,
    TextStreamer,
    WhisperForConditionalGeneration,
    env,
    full,
} from "@huggingface/transformers";
import { pipeline } from '@xenova/transformers';
// VAD
// onnxruntime-web is optional; worker will fall back to energy-based VAD if unavailable
let ort: any = null;
try {
  // Dynamically require inside worker bundle if present
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ort = require('onnxruntime-web');
} catch (_) {
  ort = null;
}

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
  // Remove bracketed artifacts like [BLANK_AUDIO], [MUSIC], etc., and any other bracketed tokens
  out = out.replace(/\[[^\]]+\]/g, ' ');
  // Remove any parenthetical cues entirely, e.g. (people chattering), (upbeat music), (indistinct)
  out = out.replace(/\([^)]*\)/g, ' ');
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
  static xenovaAsr: any = null;

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

// -----------------------------
// VAD (Silero) integration
// -----------------------------
let vadSession: any = null;
let vadInitialized = false;
let vadThreshold = 0.6; // slightly relaxed to avoid over-filtering
let vadMinSpeechMs = 200;

async function initVAD(modelUrl?: string) {
  if (!ort || vadInitialized) return;
  if (!modelUrl) return;
  try {
    vadSession = await ort.InferenceSession.create(modelUrl, { executionProviders: ['wasm'] });
    vadInitialized = true;
    self.postMessage({ status: 'loading', data: 'VAD model loaded' });
  } catch (e) {
    // Fall back silently; we will use energy-based VAD
    vadSession = null;
    vadInitialized = false;
    self.postMessage({ status: 'loading', data: 'VAD unavailable, using energy-based fallback' });
  }
}

async function vadFrameHasSpeech(frameFloat32: Float32Array): Promise<boolean> {
  if (vadSession) {
    try {
      const input = new ort.Tensor('float32', frameFloat32, [1, frameFloat32.length]);
      const result = await vadSession.run({ input });
      const out = (result.output?.data?.[0] ?? 0) as number;
      return out > vadThreshold;
    } catch (_) {
      // fallthrough to energy-based
    }
  }
  // Energy-based fallback: simple RMS threshold
  let sum = 0;
  for (let i = 0; i < frameFloat32.length; i++) sum += frameFloat32[i] * frameFloat32[i];
  const rms = Math.sqrt(sum / Math.max(1, frameFloat32.length));
  return rms > 0.015; // relax slightly
}

async function extractSpeechSegments(
  chunk: Float32Array,
  frameMs = 30,
  sampleRate = 16000,
  minSpeechMs = 150,
): Promise<Array<{ audio: Float32Array; timestamp: { start: number; end: number } }>> {
  const frameLen = Math.floor(sampleRate * (frameMs / 1000));
  const speechMask: boolean[] = [];
  for (let i = 0; i < chunk.length; i += frameLen) {
    const frame = chunk.subarray(i, Math.min(i + frameLen, chunk.length));
    const framed = frame.length === frameLen ? frame : (() => {
      const f = new Float32Array(frameLen);
      f.set(frame);
      return f;
    })();
    // eslint-disable-next-line no-await-in-loop
    const hasSpeech = await vadFrameHasSpeech(framed);
    speechMask.push(hasSpeech);
  }
  // Merge contiguous speech frames
  const segments: Array<{ start: number; end: number }> = [];
  let start: number | null = null;
  for (let i = 0; i < speechMask.length; i++) {
    if (speechMask[i] && start === null) start = i * frameLen;
    const isLast = i === speechMask.length - 1;
    if ((!speechMask[i] || isLast) && start !== null) {
      const end = (speechMask[i] && isLast ? i + 1 : i) * frameLen;
      if ((end - start) >= Math.floor(sampleRate * (minSpeechMs / 1000))) {
        segments.push({ start, end });
      }
      start = null;
    }
  }
  return segments.map(s => ({
    audio: chunk.subarray(s.start, Math.min(s.end, chunk.length)),
    timestamp: { start: s.start / sampleRate, end: Math.min(s.end, chunk.length) / sampleRate },
  }));
}

async function transcribeInternal({ audio, language }: { audio: Float32Array; language: string }): Promise<string> {
  if (processing) return;
  processing = true;

  // Tell the main thread we are starting
  self.postMessage({ status: "start" });

  try {
    // Pre-process audio (normalize + high-pass)
    const preprocessed = preprocessAudio(audio);

    // Prefer Xenova pipeline if available
    if (!AutomaticSpeechRecognitionPipeline.xenovaAsr) {
      try {
        AutomaticSpeechRecognitionPipeline.xenovaAsr = await (pipeline as any)(
          'automatic-speech-recognition',
          (self as any).asrModelId || 'Xenova/whisper-small.en',
          { device: 'webgpu' }
        );
      } catch (_) {
        // fallback below
      }
    }

    if (AutomaticSpeechRecognitionPipeline.xenovaAsr) {
      const asr: any = AutomaticSpeechRecognitionPipeline.xenovaAsr;
      const res = await asr(preprocessed, {
        chunk_length_s: (self as any).asrChunkS || 30,
        stride_length_s: (self as any).asrStrideS || 5,
        return_timestamps: false,
        language: language || (self as any).asrLanguage || 'en',
        temperature: (self as any).asrTemperature ?? 0,
        num_beams: (self as any).asrNumBeams ?? 5,
        suppress_blank: true,
        suppress_non_speech_tokens: true,
      });
      const text = typeof res?.text === 'string' ? res.text : '';
      return cleanText(text);
    } else {
      // Fallback to ONNX path
      const [tokenizer, processor, model] =
        await AutomaticSpeechRecognitionPipeline.getInstance();
      const inputs = await processor(preprocessed);
      const outputs = await model.generate({
        ...inputs,
        max_new_tokens: MAX_NEW_TOKENS,
        language,
      });
      const decoded = tokenizer.batch_decode(outputs, { skip_special_tokens: true });
      const rawText = decoded[0] || decoded;
      const cleaned = typeof rawText === 'string' ? cleanText(rawText) : '';
      return cleaned || (typeof rawText === 'string' ? rawText : '');
    }
  } catch (error) {
    console.error('Whisper generation error:', error);
    self.postMessage({ status: "error", error: error instanceof Error ? error.message : 'Unknown error occurred' });
    return '';
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
    // Initialize VAD if model URI was provided by main thread via global
    const vadUrl = (self as any).vadModelUrl || (typeof window !== 'undefined' ? (window as any).vadModelUri : undefined);
    await initVAD(vadUrl);
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
      // Allow passing VAD/ASR config via message
      if (data?.vadModelUrl) (self as any).vadModelUrl = data.vadModelUrl;
      if (typeof data?.vadThreshold === 'number') vadThreshold = data.vadThreshold;
      if (typeof data?.vadMinSpeechMs === 'number') vadMinSpeechMs = data.vadMinSpeechMs;
      if (data?.asrModelId) (self as any).asrModelId = data.asrModelId;
      if (typeof data?.asrTemperature === 'number') (self as any).asrTemperature = data.asrTemperature;
      if (typeof data?.asrNumBeams === 'number') (self as any).asrNumBeams = data.asrNumBeams;
      if (typeof data?.asrChunkS === 'number') (self as any).asrChunkS = data.asrChunkS;
      if (typeof data?.asrStrideS === 'number') (self as any).asrStrideS = data.asrStrideS;
      if (data?.asrLanguage) (self as any).asrLanguage = data.asrLanguage;
      await load();
      break;

    case "generate":
      // Preprocess + VAD segmentation, then transcribe segments and emit single combined result
      try {
        const pre = preprocessAudio(data.audio as Float32Array);
        const segs = await extractSpeechSegments(pre, 30, 16000, vadMinSpeechMs);
        if (!segs.length) {
          // If VAD found nothing, fallback to transcribing the full preprocessed chunk
          const txt = await transcribeInternal({ audio: pre, language: data.language });
          const cleaned = cleanText(txt);
          if (cleaned) {
            self.postMessage({ status: 'complete', output: cleaned });
          } else {
            self.postMessage({ status: 'update', output: '' });
          }
          break;
        }
        const parts: string[] = [];
        for (const s of segs) {
          // eslint-disable-next-line no-await-in-loop
          const txt = await transcribeInternal({ audio: s.audio, language: data.language });
          const cleaned = cleanText(txt);
          if (cleaned) parts.push(cleaned);
        }
        const combined = cleanText(parts.join(' '));
        if (combined) {
          self.postMessage({ status: 'complete', output: combined });
        } else {
          self.postMessage({ status: 'update', output: '' });
        }
      } catch (err) {
        self.postMessage({ status: 'error', error: err instanceof Error ? err.message : 'VAD/transcription error' });
      }
      break;

    default:
      console.warn('Unknown message type:', type);
  }
});

// Export for TypeScript
export { };

