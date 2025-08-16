import * as vscode from 'vscode'
import { DeepgramService } from './DeepgramService'

export class ModeManagerService {
  public readonly deepgramService: DeepgramService
  private isInitialized = false
  private finalTranscripts: string[] = []
  private interimTranscript = ''
  private isDictationActive = false
  
  // Message handler for webview communication
  private messageHandler?: (message: any) => void

  constructor(private context: vscode.ExtensionContext) {
    console.log('ModeManagerService constructor')
    
    // Initialize Deepgram service (will be initialized in the initialize method)
    this.deepgramService = new DeepgramService(context)

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
      await this.deepgramService.initialize()
      console.log('Deepgram service initialized successfully')
    } catch (error) {
      console.warn('Failed to initialize Deepgram service:', error)
      // Continue initialization even if Deepgram fails
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
    this.deepgramService.onTranscript((text: string, isFinal: boolean) => {
      console.log('Received transcript:', text, 'isFinal:', isFinal, 'Dictation Active:', this.isDictationActive)
      if (this.isDictationActive) {
        if (isFinal) {
          this.finalTranscripts.push(text)
          this.interimTranscript = ''
        } else {
          this.interimTranscript = text
        }
        const newText = this.finalTranscripts.join(' ') + (this.interimTranscript ? ' ' + this.interimTranscript : '')
        this.sendMessage({ 
          type: 'updateTranscript', 
          text: newText,
          isAppending: true // Signal that this should be appended to existing text
        })
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
      console.log('Starting dictation in DeepgramService...')
      await this.deepgramService.startDictation()
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
    this.isDictationActive = false
    try {
      await this.deepgramService.stopDictation()
      // Don't auto-copy, let user decide when to copy
    } catch (error) {
      console.error('Failed to stop dictation:', error)
    } finally {
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
      
      case 'getApiKeyStatus':
        const hasDeepgramKey = !!(await this.context.secrets.get('openmetadataExplorer.deepgramApiKey'))
        return { 
          type: 'apiKeyStatus', 
          hasDeepgramKey
        }
      
      case 'saveApiKey':
        if (message.service === 'deepgram') {
          await this.context.secrets.store('openmetadataExplorer.deepgramApiKey', message.key)
          vscode.window.showInformationMessage('Deepgram API key saved')
          // Reinitialize the service with the new key
          try {
            this.deepgramService.updateApiKey(message.key)
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
    }
  }

  dispose() {
    if (this.isDictationActive) {
      this.deepgramService.stopDictation()
    }
  }
}
