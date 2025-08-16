import { EventEmitter } from 'events'
import * as vscode from 'vscode'
import { MicrophoneWrapper } from '../utils/MicrophoneWrapper'

interface DictationState {
  isActive: boolean
  mic: MicrophoneWrapper | null
  worker: Worker | null
  statusBarItem: vscode.StatusBarItem
}

export class DictationService {
  private state: DictationState
  private eventEmitter = new EventEmitter()
  private audioChunks: Float32Array[] = []
  private language = 'en' // Default language

  constructor(
    private whisperWorker: Worker | null,
    private context: vscode.ExtensionContext
  ) {
    this.state = {
      isActive: false,
      mic: null,
      worker: this.whisperWorker,
      statusBarItem: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right)
    }
    this.state.statusBarItem.text = '$(unmute) Dictation: Off'
    this.state.statusBarItem.show()
  }

  async startDictation(): Promise<void> {
    console.log('DictationService.startDictation called')
    if (this.state.isActive) {
      console.log('Dictation already active, stopping first...')
      await this.stopDictation()
      console.log('Previous dictation stopped')
    }

    if (!this.whisperWorker) {
      throw new Error('Whisper worker not initialized.')
    }

    try {
      console.log('Creating microphone wrapper...')
      const mic = new MicrophoneWrapper()
      console.log('Microphone wrapper instance created')
      
      const audioStream = mic.startRecording()
      console.log('Microphone recording started')

      // Store references
      this.state.mic = mic
      this.state.isActive = true
      this.state.statusBarItem.text = '$(megaphone) Dictation: On'
      console.log('References stored')

      // Clear audio chunks for new session
      this.audioChunks = []

      audioStream.on('error', (error: any) => {
        console.error('Microphone stream error:', error)
        console.error('Microphone state:', {
          isActive: this.state.isActive,
          hasStream: !!audioStream,
          error: error
        })
        
        // Show error message to user if it's a command not found error
        if (error.message?.includes('command') && error.message?.includes('not')) {
          vscode.window.showErrorMessage(error.message)
        }
      })

      // Collect audio chunks for processing
      audioStream.on('data', (chunk: Buffer) => {
        // Convert Buffer to Float32Array for Whisper
        const audioData = this.convertBufferToFloat32Array(chunk)
        this.audioChunks.push(audioData)
        
        // Process audio in chunks (every 2 seconds worth of data)
        // At 16kHz, 2 seconds = 32,000 samples
        const totalSamples = this.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0)
        if (totalSamples >= 32000) {
          this.processAudioChunks()
        }
      })

      console.log('All handlers set up successfully')
    } catch (error) {
      console.error('Error in startDictation:', error)
      // Show error message to user
      if (error instanceof Error) {
        vscode.window.showErrorMessage(`Failed to start dictation: ${error.message}`)
      }
      throw error
    }
  }

  private convertBufferToFloat32Array(buffer: Buffer): Float32Array {
    // Convert Buffer (16-bit signed integers) to Float32Array
    const int16Array = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2)
    const float32Array = new Float32Array(int16Array.length)
    
    for (let i = 0; i < int16Array.length; i++) {
      // Normalize from [-32768, 32767] to [-1, 1]
      float32Array[i] = int16Array[i] / 32768.0
    }
    
    return float32Array
  }

  private processAudioChunks(): void {
    if (this.audioChunks.length === 0 || !this.whisperWorker) {
      return
    }

    // Combine all audio chunks into a single Float32Array
    const totalLength = this.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const combinedAudio = new Float32Array(totalLength)
    
    let offset = 0
    for (const chunk of this.audioChunks) {
      combinedAudio.set(chunk, offset)
      offset += chunk.length
    }

    // Limit to max 30 seconds (480,000 samples at 16kHz)
    const maxSamples = 30 * 16000
    const audioToProcess = combinedAudio.length > maxSamples 
      ? combinedAudio.slice(-maxSamples) 
      : combinedAudio

    console.log('Processing audio chunk:', audioToProcess.length, 'samples')
    
    // Send to Whisper worker
    this.whisperWorker.postMessage({
      type: 'generate',
      data: { audio: audioToProcess, language: this.language }
    })

    // Clear processed chunks
    this.audioChunks = []
  }

  handleWorkerMessage(data: any): void {
    const { status, output, error } = data

    switch (status) {
      case 'start':
        console.log('Whisper processing started')
        break

      case 'update':
        // Real-time updates during processing
        console.log('Whisper processing update:', output)
        break

      case 'complete':
        console.log('Whisper transcription complete:', output)
        if (output && output.trim()) {
          // Emit transcript with isFinal=true for Whisper (batch processing)
          this.eventEmitter.emit('transcript', output.trim(), true)
        }
        break

      case 'error':
        console.error('Whisper processing error:', error)
        break
    }
  }

  setLanguage(language: string): void {
    this.language = language
    console.log('Language set to:', language)
  }

  async stopDictation(): Promise<void> {
    console.log('stopDictation called')

    if (this.state.mic) {
      this.state.mic.stopRecording()
      this.state.mic = null
    }

    // Process any remaining audio chunks before stopping
    if (this.audioChunks.length > 0) {
      this.processAudioChunks()
    }

    this.state.isActive = false
    this.state.statusBarItem.text = '$(unmute) Dictation: Off'
    this.audioChunks = []
  }

  onTranscript(callback: (text: string, isFinal: boolean) => void) {
    if (!this.whisperWorker) {
      console.warn('Cannot set up transcript listener: Whisper worker not initialized')
      // Return a no-op function
      return () => {}
    }
    
    this.eventEmitter.on('transcript', callback)
    return () => {
      this.eventEmitter.removeListener('transcript', callback)
    }
  }

  async testMicrophone(): Promise<{ success: boolean; message: string }> {
    try {
      const mic = new MicrophoneWrapper()
      const audioStream = mic.startRecording()
      
      return new Promise((resolve) => {
        let hasData = false
        
        const timeout = setTimeout(() => {
          mic.stopRecording()
          if (!hasData) {
            resolve({ success: false, message: 'No audio data received from microphone' })
          }
        }, 3000)
        
        audioStream.on('data', () => {
          hasData = true
          clearTimeout(timeout)
          mic.stopRecording()
          resolve({ success: true, message: 'Microphone is working correctly' })
        })
        
        audioStream.on('error', (error: any) => {
          clearTimeout(timeout)
          mic.stopRecording()
          resolve({ success: false, message: error.message || 'Microphone error' })
        })
      })
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown microphone error' 
      }
    }
  }

  isDictationActive(): boolean {
    return this.state.isActive
  }
}
