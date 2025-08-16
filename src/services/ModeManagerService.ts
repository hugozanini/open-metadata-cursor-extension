import * as vscode from 'vscode'
import { DeepgramService } from './DeepgramService'
import { LLMService } from './LLMService'
import { PromptManagementService } from './PromptManagementService'

export type Mode = 'vibe' | 'code'

export class ModeManagerService {
  public readonly deepgramService: DeepgramService
  private readonly llmService: LLMService
  public readonly promptManager: PromptManagementService
  public currentMode: Mode = 'code'
  private isInitialized = false
  private finalTranscripts: string[] = []
  private interimTranscript = ''
  private isDictationActive = false
  
  // Message handler for webview communication
  private messageHandler?: (message: any) => void

  constructor(private context: vscode.ExtensionContext) {
    console.log('ModeManagerService constructor')
    
    // Initialize basic services first
    this.llmService = new LLMService(context)
    this.promptManager = new PromptManagementService(context)
    this.promptManager.setOnPromptsChanged(() => this.refreshWebviewPrompts())

    // Initialize Deepgram service (will be initialized in the initialize method)
    this.deepgramService = new DeepgramService(context)

    // Register toggle command
    context.subscriptions.push(
      vscode.commands.registerCommand('openmetadataExplorer.toggleDictation', async () => {
        if (this.currentMode !== 'code') return
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
      console.log('Received transcript in mode manager:', text, 'isFinal:', isFinal, 'Mode:', this.currentMode, 'Dictation Active:', this.isDictationActive)
      if (this.currentMode === 'code' && this.isDictationActive) {
        if (isFinal) {
          this.finalTranscripts.push(text)
          this.interimTranscript = ''
        } else {
          this.interimTranscript = text
        }
        const displayTranscript = this.finalTranscripts.join(' ') + (this.interimTranscript ? ' ' + this.interimTranscript : '')
        this.sendMessage({ 
          type: 'updateTranscript', 
          text: displayTranscript,
          target: 'transcript'
        })
      }
    })
  }

  async setMode(mode: Mode) {
    console.log('Setting mode to:', mode)
    
    // Clean up previous mode
    if (this.currentMode === 'code' && this.isDictationActive) {
      await this.stopDictation()
    }

    this.currentMode = mode
    this.sendMessage({ type: 'updateMode', mode })
  }

  public async toggleDictation() {
    console.log(`toggleDictation called. Current state: isDictationActive=${this.isDictationActive}, mode=${this.currentMode}`)
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
      this.finalTranscripts = []
      this.interimTranscript = ''
      console.log('Starting dictation in DeepgramService...')
      await this.deepgramService.startDictation()
      console.log('Dictation started successfully')
      this.sendMessage({ 
        type: 'updateStatus', 
        text: 'Recording...',
        target: 'code-status'
      })
    } catch (error) {
      console.error('Failed to start dictation:', error)
      this.isDictationActive = false
      this.sendMessage({ 
        type: 'updateStatus', 
        text: 'Error starting recording',
        target: 'code-status'
      })
    }
  }

  private async stopDictation() {
    console.log('Stopping dictation')
    if (!this.isDictationActive) return
    this.isDictationActive = false
    try {
      await this.deepgramService.stopDictation()
      const haveAnyTranscript = this.finalTranscripts.length > 0 || this.interimTranscript.trim()
      if (haveAnyTranscript) {
        this.sendMessage({ 
          type: 'updateStatus', 
          text: 'Processing...',
          target: 'code-status'
        })
        this.sendMessage({
          type: 'updateTranscript',
          text: '',
          target: 'prompt-output'
        })
        const userText = this.finalTranscripts.join(' ') + ' ' + this.interimTranscript
        const streamResponse = await this.llmService.streamProcessText({
          text: this.finalTranscripts.join(' ') + ' ' + this.interimTranscript,
          prompt: this.promptManager.getCurrentPrompt(),
          onToken: (token: string) => {
            this.sendMessage({
              type: 'appendTranscript',
              text: token,
              target: 'prompt-output'
            })
          }
        })
        if (streamResponse.error) {
          vscode.window.showErrorMessage(streamResponse.error)
        } else {
          await vscode.env.clipboard.writeText(streamResponse.text)
          this.sendMessage({ type: 'showSuccess' })
        }
      }
    } catch (error) {
      console.error('Failed to stop dictation:', error)
    } finally {
      this.finalTranscripts = []
      this.interimTranscript = ''
      this.sendMessage({ 
        type: 'updateStatus', 
        text: 'Ready',
        target: 'code-status'
      })
    }
  }

  private refreshPrompts() {
    this.sendMessage({
      type: 'populatePrompts',
      prompts: [this.promptManager.getDefaultPrompt(), ...this.promptManager.getAllPrompts()]
    })
    this.sendMessage({
      type: 'setCurrentPrompt',
      id: this.promptManager.getCurrentPrompt().id
    })
  }

  public refreshWebviewPrompts() {
    this.refreshPrompts()
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
      case 'switchMode':
        await this.setMode(message.mode as Mode)
        break
      
      case 'toggleDictation':
        await this.toggleDictation()
        break
      
      case 'setPrompt':
        await this.promptManager.setCurrentPrompt(message.id)
        this.refreshPrompts()
        break
      
      case 'getApiKeyStatus':
        const hasDeepgramKey = !!(await this.context.secrets.get('openmetadataExplorer.deepgramApiKey'))
        const hasOpenAIKey = !!(await this.context.secrets.get('openmetadataExplorer.openaiApiKey'))
        return { 
          type: 'apiKeyStatus', 
          hasDeepgramKey,
          hasOpenAIKey
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
        } else if (message.service === 'openai') {
          await this.context.secrets.store('openmetadataExplorer.openaiApiKey', message.key)
          vscode.window.showInformationMessage('OpenAI API key saved')
        }
        break
      
      case 'clearApiKey':
        if (message.service === 'deepgram') {
          await this.context.secrets.delete('openmetadataExplorer.deepgramApiKey')
          vscode.window.showInformationMessage('Deepgram API key cleared')
        } else if (message.service === 'openai') {
          await this.context.secrets.delete('openmetadataExplorer.openaiApiKey')
          vscode.window.showInformationMessage('OpenAI API key cleared')
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
      
      case 'getPromptsList':
        const prompts = [
          this.promptManager.getDefaultPrompt(),
          ...this.promptManager.getAllPrompts()
        ]
        return {
          type: 'promptsList',
          prompts
        }
      
      case 'getPromptPreview':
        const prompt = message.id === 'default' 
          ? this.promptManager.getDefaultPrompt() 
          : this.promptManager.getPromptById(message.id)
          
        if (prompt) {
          return {
            type: 'promptPreview',
            id: prompt.id,
            prompt: prompt.prompt
          }
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
