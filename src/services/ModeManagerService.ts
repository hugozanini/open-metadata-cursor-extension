import * as vscode from 'vscode'
import { WhisperService } from './WhisperService'

export class ModeManagerService {
  public readonly whisperService: WhisperService
  private isInitialized = false
  private finalTranscripts: string[] = []
  private interimTranscript = ''
  private isDictationActive = false
  private finalTranscriptionTimeout?: NodeJS.Timeout
  
  // Message handler for webview communication
  private messageHandler?: (message: any) => void

  constructor(private context: vscode.ExtensionContext) {
    console.log('ModeManagerService constructor')
    
    // Initialize Whisper service (will be initialized in the initialize method)
    this.whisperService = new WhisperService(context)

    // Register toggle command
    context.subscriptions.push(
      vscode.commands.registerCommand('openmetadataExplorer.toggleDictation', async () => {
        await this.toggleDictation()
      })
    )
  }

  async initialize(): Promise<void> {
    console.log('ModeManagerService initializing...')
    
    if (this.isInitialized) {
      console.log('ModeManagerService already initialized')
      return
    }
    
    try {
      // Set up message handler before initializing
      this.whisperService.setMessageHandler((message: any) => {
        this.sendMessage(message)
      })
      
      await this.whisperService.initialize()
      console.log('Whisper service initialized successfully')
    } catch (error) {
      console.warn('Failed to initialize Whisper service:', error)
      // Continue initialization even if Whisper fails
    }
    
    try {
      this.setupTranscriptListeners()
      console.log('Transcript listeners set up successfully')
    } catch (error) {
      console.error('Failed to set up transcript listeners:', error)
    }
    
    this.isInitialized = true
    console.log('ModeManagerService initialized successfully')
  }

  private setupTranscriptListeners() {
    console.log('Setting up transcript listeners')
    this.whisperService.onTranscript((text: string, isFinal: boolean) => {
      console.log('🎤 Received transcript:', text, 'isFinal:', isFinal, 'isDictationActive:', this.isDictationActive)
      if (this.isDictationActive) {
        console.log('✅ Processing transcript (dictation is active)')
        if (isFinal) {
          this.finalTranscripts.push(text)
          this.interimTranscript = ''
          
          // If we're waiting for final transcription after stopping, mark as complete
          if (this.finalTranscriptionTimeout) {
            console.log('🏁 Final transcription received, marking dictation as inactive')
            clearTimeout(this.finalTranscriptionTimeout)
            this.finalTranscriptionTimeout = undefined
            this.isDictationActive = false
            
            // Send the final transcript first
            const newText = this.finalTranscripts.join(' ')
            console.log('📤 Sending final transcript to UI:', newText)
            this.sendMessage({ 
              type: 'updateTranscript', 
              text: newText,
              isAppending: true
            })
            
            // Then update status to Ready
            this.sendMessage({ 
              type: 'updateStatus', 
              text: 'Ready'
            })
            return
          }
        } else {
          this.interimTranscript = text
        }
        const newText = this.finalTranscripts.join(' ') + (this.interimTranscript ? ' ' + this.interimTranscript : '')
        console.log('📤 Sending transcript to UI:', newText)
        this.sendMessage({ 
          type: 'updateTranscript', 
          text: newText,
          isAppending: true // Signal that this should be appended to existing text
        })
      } else {
        console.log('❌ Ignoring transcript (dictation not active)')
      }
    })
  }



  public async toggleDictation() {
    console.log(`toggleDictation called. Current state: isDictationActive=${this.isDictationActive}`)
    if (this.isDictationActive) {
      await this.stopDictation()
    } else {
      await this.startDictation()
    }
  }

  private async startDictation() {
    console.log('startDictation called')
    if (this.isDictationActive) {
      console.log('Dictation already active, ignoring start request')
      return
    }
    try {
      this.isDictationActive = true
      // Clear session arrays for new recording session
      this.finalTranscripts = []
      this.interimTranscript = ''
      console.log('Starting dictation in WhisperService...')
      await this.whisperService.startDictation()
      console.log('Dictation started successfully')
      this.sendMessage({ 
        type: 'updateStatus', 
        text: 'Recording...'
      })
    } catch (error) {
      console.error('Failed to start dictation:', error)
      this.isDictationActive = false
      this.sendMessage({ 
        type: 'updateStatus', 
        text: 'Error starting recording'
      })
    }
  }

  private async stopDictation() {
    console.log('Stopping dictation')
    if (!this.isDictationActive) return
    
    try {
      // First, stop the microphone recording
      await this.whisperService.stopDictation()
      console.log('Microphone stopped, waiting for final transcription...')
      
      // Update UI to show processing state but keep isDictationActive true
      // until we get the final transcription
      this.sendMessage({ 
        type: 'updateStatus', 
        text: 'Processing...'
      })
      
      // Set a timeout to ensure we don't wait forever
      const timeoutId = setTimeout(() => {
        console.log('Timeout waiting for final transcription, marking dictation as inactive')
        this.isDictationActive = false
        this.sendMessage({ 
          type: 'updateStatus', 
          text: 'Ready'
        })
      }, 5000) // 5 second timeout
      
      // We'll set isDictationActive = false when we receive the final transcript
      // in setupTranscriptListeners, or after the timeout
      this.finalTranscriptionTimeout = timeoutId
      
    } catch (error) {
      console.error('Failed to stop dictation:', error)
      this.isDictationActive = false
      this.sendMessage({ 
        type: 'updateStatus', 
        text: 'Ready'
      })
    }
  }



  // Set message handler for webview communication
  setMessageHandler(handler: (message: any) => void) {
    this.messageHandler = handler
  }

  // Send message to webview
  private sendMessage(message: any) {
    if (this.messageHandler) {
      this.messageHandler(message)
    }
  }

  // Handle messages from webview
  async handleMessage(message: any): Promise<any> {
    console.log('ModeManagerService received message:', message)
    
    switch (message.type) {
      case 'toggleDictation':
        await this.toggleDictation()
        break
      
      case 'loadWhisperModel':
        try {
          await this.whisperService.loadModel()
          return { type: 'modelLoadStarted' }
        } catch (error) {
          console.error('Failed to load Whisper model:', error)
          return { 
            type: 'error', 
            message: error instanceof Error ? error.message : 'Failed to load model' 
          }
        }
      
      case 'getApiKeyStatus':
        // For Whisper, we check model status instead of API key
        return { 
          type: 'apiKeyStatus', 
          hasDeepgramKey: this.whisperService.isModelReady() // Use model ready status
        }
      
      case 'getModelStatus':
        return {
          type: 'modelStatus',
          isModelLoaded: this.whisperService.isModelReady(),
          loadingProgress: this.whisperService.getLoadingProgress()
        }
      
      case 'saveApiKey':
        if (message.service === 'deepgram') {
          await this.context.secrets.store('openmetadataExplorer.deepgramApiKey', message.key)
          vscode.window.showInformationMessage('Deepgram API key saved')
          // Reinitialize the service with the new key
          try {
            // Whisper doesn't need API key - this case is no longer needed
          } catch (error) {
            console.error('Failed to update Deepgram API key:', error)
          }
        }
        break
      
      case 'clearApiKey':
        if (message.service === 'deepgram') {
          await this.context.secrets.delete('openmetadataExplorer.deepgramApiKey')
          vscode.window.showInformationMessage('Deepgram API key cleared')
        }
        break
      
      case 'getMicrophoneDevices':
        // Return a simple list of devices for now
        return {
          type: 'microphoneDevices',
          devices: ['default', 'Built-in Microphone'],
          configuredDevice: 'default'
        }
      
      case 'testMicrophone':
        try {
          const { MicrophoneWrapper } = await import('../utils/MicrophoneWrapper')
          const mic = new MicrophoneWrapper()
          await mic.testMicrophone()
          return {
            type: 'microphoneTestResult',
            success: true,
            message: 'Microphone test successful! Audio is being captured correctly.'
          }
        } catch (error) {
          return {
            type: 'microphoneTestResult',
            success: false,
            message: 'Microphone test failed: ' + (error as Error).message
          }
        }
        break

      case 'copyToClipboard':
        try {
          await vscode.env.clipboard.writeText(message.text)
          this.sendMessage({ type: 'showSuccess' })
        } catch (error) {
          console.error('Failed to copy to clipboard:', error)
        }
        break
      
      case 'workerMessage':
        // Forward worker messages from webview to WhisperService
        this.whisperService.handleWorkerMessage(message.data)
        break
    }
  }

  dispose() {
    if (this.isDictationActive) {
      this.whisperService.dispose()
    }
  }
}
