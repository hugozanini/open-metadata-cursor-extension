import * as vscode from 'vscode'
import { DictationService } from './DictationService'

/**
 * Progress item interface for model loading
 */
export interface ProgressItem {
  file: string
  progress: number
  total?: number
  status?: string
}

interface DictationState {
  isActive: boolean
  mic: any | null
  worker: Worker | null
  statusBarItem: vscode.StatusBarItem
}

export class WhisperService {
  private worker: Worker | null = null
  private isInitialized = false
  private isModelLoaded = false
  private dictationService: DictationService | null = null
  private loadingProgress: ProgressItem[] = []
  private messageHandler?: (message: any) => void

  constructor(private context: vscode.ExtensionContext) {
    console.log('WhisperService constructor')
  }

  setMessageHandler(handler: (message: any) => void) {
    this.messageHandler = handler
  }

  private sendMessage(message: any) {
    if (this.messageHandler) {
      this.messageHandler(message)
    }
  }

  async initialize(): Promise<void> {
    console.log('WhisperService initializing...')
    
    if (this.isInitialized) {
      console.log('WhisperService already initialized')
      return
    }
    
    try {
      // Don't create worker here - it will be created in the webview
      // Just initialize the dictation service without worker for now
      this.dictationService = new DictationService(null, this.context)
      
      // Set up message handler to forward messages to webview
      this.dictationService.setMessageHandler((message) => {
        console.log('DictationService sending message to webview:', message)
        this.sendMessage(message)
      })
      
      this.isInitialized = true
      console.log('WhisperService initialized successfully (worker will be created in webview)')
    } catch (error) {
      console.error('Failed to initialize WhisperService:', error)
      this.isInitialized = false
      throw error
    }
  }

  private setupWorkerHandlers(): void {
    if (!this.worker) return

    this.worker.onmessage = (e) => {
      const { status, data, error } = e.data

      switch (status) {
        case 'loading':
          console.log('Model loading:', data)
          break

        case 'initiate':
          // New progress item
          this.loadingProgress.push(e.data)
          this.notifyProgress()
          break

        case 'progress':
          // Update existing progress item
          this.loadingProgress = this.loadingProgress.map(item => 
            item.file === e.data.file ? { ...item, ...e.data } : item
          )
          this.notifyProgress()
          break

        case 'done':
          // Remove completed progress item
          this.loadingProgress = this.loadingProgress.filter(item => item.file !== e.data.file)
          this.notifyProgress()
          break

        case 'ready':
          console.log('Whisper model ready!')
          this.isModelLoaded = true
          this.loadingProgress = []
          this.notifyModelReady()
          break

        case 'error':
          console.error('Whisper worker error:', error)
          this.notifyError(error || 'Unknown error occurred')
          break

        default:
          // Forward other messages to dictation service if needed
          if (this.dictationService) {
            this.dictationService.handleWorkerMessage(e.data)
          }
      }
    }

    this.worker.onerror = (error) => {
      console.error('Whisper worker error:', error)
      this.notifyError('Worker error occurred')
    }
  }

  private notifyProgress(): void {
    this.sendMessage({
      type: 'modelLoadProgress',
      progress: this.loadingProgress
    })
  }

  private notifyModelReady(): void {
    this.sendMessage({
      type: 'modelReady',
      isModelLoaded: true
    })
  }

  private notifyError(error: string): void {
    vscode.window.showErrorMessage(`Whisper Service Error: ${error}`)
  }

  /**
   * Load the Whisper model (delegated to webview)
   */
  async loadModel(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('WhisperService not initialized')
    }

    if (this.isModelLoaded) {
      console.log('Model already loaded')
      return
    }

    console.log('Requesting model load from webview...')
    // Send message to webview to create worker and load model
    this.sendMessage({
      type: 'loadModelInWebview'
    })
  }

  /**
   * Check if the model is ready for use
   */
  isModelReady(): boolean {
    return this.isModelLoaded
  }

  /**
   * Get current loading progress
   */
  getLoadingProgress(): ProgressItem[] {
    return [...this.loadingProgress]
  }

  async startAgent(): Promise<void> {
    vscode.window.showInformationMessage('Agent mode coming soon!')
  }

  async startDictation(): Promise<void> {
    if (!this.dictationService) {
      throw new Error('Dictation service not initialized')
    }

    if (!this.isModelLoaded) {
      throw new Error('Whisper model not loaded. Please load the model first.')
    }

    return this.dictationService.startDictation()
  }

  async stopDictation(): Promise<void> {
    if (!this.dictationService) {
      throw new Error('Dictation service not initialized')
    }
    return this.dictationService.stopDictation()
  }

  async testMicrophone(): Promise<{ success: boolean; message: string }> {
    if (!this.dictationService) {
      return { success: false, message: 'Dictation service not initialized' }
    }
    return this.dictationService.testMicrophone()
  }

  onTranscript(callback: (text: string, isFinal: boolean) => void): () => void {
    if (!this.dictationService) {
      console.warn('Cannot set up transcript listener: Dictation service not initialized')
      return () => {}
    }
    return this.dictationService.onTranscript(callback)
  }

  isDictationActive(): boolean {
    return this.dictationService?.isDictationActive() || false
  }

  /**
   * Handle messages from webview worker
   */
  handleWorkerMessage(data: any): void {
    const { status, error } = data

    switch (status) {
      case 'loading':
        console.log('Model loading:', data.data)
        break

      case 'initiate':
        // New progress item
        this.loadingProgress.push(data)
        this.notifyProgress()
        break

      case 'progress':
        // Update existing progress item
        this.loadingProgress = this.loadingProgress.map(item => 
          item.file === data.file ? { ...item, ...data } : item
        )
        this.notifyProgress()
        break

      case 'done':
        // Remove completed progress item
        this.loadingProgress = this.loadingProgress.filter(item => item.file !== data.file)
        this.notifyProgress()
        break

      case 'ready':
        console.log('Whisper model ready!')
        this.isModelLoaded = true
        this.loadingProgress = []
        this.notifyModelReady()
        break

      case 'error':
        console.error('Whisper worker error:', error)
        this.notifyError(error || 'Unknown error occurred')
        break

      default:
        // Forward transcription messages to dictation service if needed
        if (this.dictationService && (status === 'start' || status === 'update' || status === 'complete')) {
          this.dictationService.handleWorkerMessage(data)
        }
    }
  }

  /**
   * Set worker reference from webview
   */
  setWorker(worker: any): void {
    this.worker = worker
    if (this.dictationService) {
      // Update dictation service with worker reference
      (this.dictationService as any).whisperWorker = worker
    }
  }

  async dispose(): Promise<void> {
    console.log('WhisperService disposing...')
    
    try {
      if (this.dictationService) {
        await this.dictationService.stopDictation()
      }
    } catch (error) {
      console.error('Error stopping dictation during dispose:', error)
    }

    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }

    this.isInitialized = false
    this.isModelLoaded = false
    this.loadingProgress = []
    console.log('WhisperService disposed')
  }
}
