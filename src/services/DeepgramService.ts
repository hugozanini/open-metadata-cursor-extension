import {
    createClient,
    ListenLiveClient
} from '@deepgram/sdk'
import * as vscode from 'vscode'
import { DictationService } from './DictationService'

/**
 * Configuration interface for Deepgram service
 */
export interface DeepgramConfig {
  apiKey: string
}

interface DictationState {
  isActive: boolean
  mic: any | null
  wsConnection: ListenLiveClient | null
  statusBarItem: vscode.StatusBarItem
}

export class DeepgramService {
  private client!: ReturnType<typeof createClient>
  private isInitialized = false
  private dictationService: DictationService | null = null

  constructor(private context: vscode.ExtensionContext) {
    console.log('DeepgramService constructor')
  }

  async initialize(): Promise<void> {
    console.log('DeepgramService initializing...')
    
    if (this.isInitialized) {
      console.log('DeepgramService already initialized')
      return
    }
    
    try {
      const apiKey = await this.context.secrets.get('openmetadataExplorer.deepgramApiKey')
      
      // Initialize with empty key if not available, but mark as not fully initialized
      this.client = createClient(apiKey || 'dummy-key-for-initialization')
      this.dictationService = new DictationService(this.client, this.context)
      
      // Only mark as fully initialized if we have an API key
      this.isInitialized = !!apiKey
      console.log('DeepgramService initialized successfully, API key available:', !!apiKey)
    } catch (error) {
      console.warn('Failed to initialize Deepgram client, will prompt for key when needed:', error)
      try {
        // Create a placeholder client that will be replaced when a key is provided
        this.dictationService = new DictationService(null as any, this.context)
      } catch (dictationError) {
        console.error('Failed to create DictationService:', dictationError)
      }
      this.isInitialized = false
    }
  }

  /**
   * Update the API key and reinitialize the client
   */
  updateApiKey(apiKey: string): void {
    this.client = createClient(apiKey)
    if (this.dictationService) {
      this.dictationService.updateClient(this.client)
    } else {
      this.dictationService = new DictationService(this.client, this.context)
    }
    this.isInitialized = true
  }

  async startAgent(): Promise<void> {
    vscode.window.showInformationMessage('Agent mode coming soon!')
  }

  async startDictation(): Promise<void> {
    if (!this.dictationService)
      throw new Error('Dictation service not initialized')

    // Check for API key and prompt if needed
    const apiKey = await this.context.secrets.get('openmetadataExplorer.deepgramApiKey')
    if (!apiKey) {
      // Show a message with a button to configure API key
      const action = await vscode.window.showErrorMessage(
        'Deepgram API key is required for dictation',
        'Configure API Key'
      )
      
      if (action === 'Configure API Key') {
        // Open settings to configure the API key
        await vscode.commands.executeCommand('workbench.action.openSettings', 'openmetadataExplorer.deepgramApiKey')
      }
      
      throw new Error('Deepgram API key is required')
    } else if (!this.isInitialized) {
      // If we have a key but aren't initialized, update the key
      this.updateApiKey(apiKey)
    }

    await this.dictationService.startDictation()
  }

  async stopDictation(): Promise<void> {
    if (!this.dictationService)
      throw new Error('Dictation service not initialized')

    await this.dictationService.stopDictation()
  }

  dispose(): void {
    this.dictationService?.stopDictation()
  }

  /**
   * Provide a callback that receives (text, isFinal).
   */
  onTranscript(callback: (text: string, isFinal: boolean) => void) {
    console.log('Setting up transcript listener')
    if (!this.dictationService) {
      console.warn('Dictation service not fully initialized in onTranscript, creating empty listener')
      // Return a no-op function that can be called later when dictation is properly initialized
      return () => {
        console.log('Transcript listener called but dictation service not initialized')
      }
    }
    return this.dictationService.onTranscript(callback)
  }
}
