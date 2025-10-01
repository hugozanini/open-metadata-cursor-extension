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
  private messageHandler?: (message: any) => void

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

  setMessageHandler(handler: (message: any) => void) {
    this.messageHandler = handler
  }

  private sendMessage(message: any) {
    if (this.messageHandler) {
      this.messageHandler(message)
    }
  }

  async startDictation(): Promise<void> {
    console.log('DictationService.startDictation called')
    if (this.state.isActive) {
      console.log('Dictation already active, stopping first...')
      await this.stopDictation()
      console.log('Previous dictation stopped')
    }

    // Check if we have a message handler (connection to webview worker)
    if (!this.messageHandler) {
      throw new Error('Message handler not initialized. Cannot communicate with webview worker.')
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
        console.log('Received audio chunk:', chunk.length, 'bytes')
        
        // Convert Buffer to Float32Array for Whisper
        const audioData = this.convertBufferToFloat32Array(chunk)
        console.log('Converted to Float32Array:', audioData.length, 'samples')
        this.audioChunks.push(audioData)
        
        const totalSamples = this.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0)
        console.log('Audio chunks collected:', this.audioChunks.length, 'chunks, total samples:', totalSamples)
        
        // Process audio in chunks (every 3 seconds worth of data)
        // At 16kHz, 3 seconds = 48,000 samples
        if (totalSamples >= 48000) {
          console.log('Processing audio chunks - threshold reached')
          this.processAudioChunks()
        }
      })

      audioStream.on('end', () => {
        console.log('Audio stream ended')
      })

      audioStream.on('close', () => {
        console.log('Audio stream closed')
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
    if (this.audioChunks.length === 0) {
      console.log('No audio chunks to process')
      return
    }

    if (!this.messageHandler) {
      console.log('No message handler available, cannot process audio')
      return
    }

    console.log('processAudioChunks called with', this.audioChunks.length, 'chunks')

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
    
    // Send to webview worker via message handler
    this.sendMessage({
      type: 'generateAudio',
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
      console.log('Stopping microphone recording...')
      this.state.mic.stopRecording()
      this.state.mic = null
    }

    // Process any remaining audio chunks before stopping
    const totalSamples = this.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0)
    console.log('stopDictation: audioChunks.length:', this.audioChunks.length, 'totalSamples:', totalSamples)
    
    if (this.audioChunks.length > 0) {
      console.log('Processing remaining audio chunks:', this.audioChunks.length, 'chunks, total samples:', totalSamples)
      this.processAudioChunks()
    } else {
      console.log('No remaining audio chunks to process')
    }

    this.state.isActive = false
    this.state.statusBarItem.text = '$(unmute) Dictation: Off'
    this.audioChunks = []
  }

  onTranscript(callback: (text: string, isFinal: boolean) => void) {
    console.log('Setting up transcript listener')
    this.eventEmitter.on('transcript', callback)
    return () => {
      console.log('Removing transcript listener')
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
