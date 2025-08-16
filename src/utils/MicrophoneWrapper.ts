import * as cp from 'child_process'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as vscode from 'vscode'

interface MicrophoneCommandInfo {
  commandName: 'rec' | 'sox' | 'arecord' | null
  commandAvailable: boolean
  installInstructions: string
  defaultDevice: string
  deviceListCommand?: string
}

interface MicrophoneOptions {
  // Audio format options
  bitwidth?: string
  channels?: string
  rate?: string
  encoding?: 'signed-integer' | 'unsigned-integer'
  endian?: 'little' | 'big'
  
  // Device selection
  device?: string
  
  // Additional options
  additionalParameters?: string[]
  useDataEmitter?: boolean
}

function detectMicrophoneCommand(): MicrophoneCommandInfo {
  const currentPlatform = os.platform()
  let commandName: MicrophoneCommandInfo['commandName'] = null
  let commandAvailable = false
  let installInstructions = ''
  let defaultDevice = ''
  let deviceListCommand = ''

  try {
    switch (currentPlatform) {
      case 'darwin': {
        commandName = 'rec'
        defaultDevice = 'default'
        deviceListCommand = 'system_profiler SPAudioDataType | grep "Input Sources:"'
        try {
          execSync('which rec', { stdio: 'ignore' })
          commandAvailable = true
        } catch {
          installInstructions = 'Install SoX on macOS using: brew install sox'
        }
        break
      }
      case 'win32': {
        commandName = 'sox'
        defaultDevice = 'default'
        deviceListCommand = 'sox -h'
        try {
          execSync('where sox', { stdio: 'ignore' })
          commandAvailable = true
        } catch {
          installInstructions = 'Install SoX for Windows from: https://sourceforge.net/projects/sox/'
        }
        break
      }
      default: {
        // Linux and other Unix-like systems
        commandName = 'arecord'
        defaultDevice = 'plughw:1,0'
        deviceListCommand = 'arecord -L'
        try {
          execSync('which arecord', { stdio: 'ignore' })
          commandAvailable = true
        } catch {
          installInstructions = 'Install ALSA tools using: sudo apt-get install alsa-utils'
        }
      }
    }
  } catch (error) {
    console.error('Error detecting microphone command:', error)
  }

  return {
    commandName,
    commandAvailable,
    installInstructions,
    defaultDevice,
    deviceListCommand
  }
}

/**
 * A wrapper for microphone functionality using command-line tools
 */
export class MicrophoneWrapper {
  private microphone: any | null = null
  private ps: any | null = null
  private options: MicrophoneOptions
  private commandInfo: MicrophoneCommandInfo
  private platform: string = os.platform()
  private EventEmitter = require('events')

  // Add proper type declarations for previously missing properties
  private commandName: 'rec' | 'sox' | 'arecord' | null = null
  private commandAvailable: boolean = false

  constructor(options: MicrophoneOptions = {}) {
    this.options = options
    this.commandInfo = detectMicrophoneCommand()
    
    // Use the commandInfo instead of re-detecting
    this.commandName = this.commandInfo.commandName
    this.commandAvailable = this.commandInfo.commandAvailable

    // If no device is specified, use the default for this platform
    if (!this.options.device) {
      this.options.device = this.getConfiguredDevice() || this.commandInfo.defaultDevice
      console.log(`MicrophoneWrapper: Using device: ${this.options.device}`)
    }

    if (!this.commandAvailable) {
      console.warn(`Microphone command '${this.commandName}' not found.`)
      console.warn(`Installation instructions: ${this.commandInfo.installInstructions}`)
      
      // On macOS, check if SoX is installed but rec is not in PATH
      if (this.platform === 'darwin') {
        try {
          // Check common Homebrew locations for SoX
          if (fs.existsSync('/usr/local/bin/sox') || fs.existsSync('/opt/homebrew/bin/sox')) {
            console.log('MicrophoneWrapper: Found sox command, but rec command is missing')
            vscode.window.showWarningMessage(
              'SoX is installed but the "rec" command is not available. Try running "brew link --force sox" in Terminal.',
              'Open Terminal'
            ).then(selection => {
              if (selection === 'Open Terminal') {
                cp.exec('open -a Terminal')
              }
            })
            return
          }
        } catch (err) {
          // Ignore errors in this additional check
        }
      }
      
      // Show installation instructions
      this.showInstallationInstructions()
    }
    
    // Create microphone implementation based on command availability
    if (this.commandAvailable) {
      console.log('MicrophoneWrapper: Command available, creating custom microphone implementation')
      this.microphone = this.createMicrophoneImplementation()
    } else {
      console.log('MicrophoneWrapper: Command not available, creating dummy microphone')
      this.microphone = this.createDummyMicrophone()
    }
  }

  /**
   * Get the configured microphone device from VS Code settings
   */
  private getConfiguredDevice(): string | undefined {
    const config = vscode.workspace.getConfiguration('openmetadataExplorer.microphone')
    
    switch (this.platform) {
      case 'darwin':
        return config.get<string>('deviceMacOS')
      case 'win32':
        return config.get<string>('deviceWindows')
      default:
        return config.get<string>('deviceLinux')
    }
  }

  /**
   * List available microphone devices
   */
  public async listAvailableDevices(): Promise<void> {
    if (!this.commandAvailable || !this.commandInfo.deviceListCommand) {
      vscode.window.showErrorMessage(
        `Cannot list devices: ${this.commandName} command not available.`
      )
      return
    }

    try {
      const outputChannel = vscode.window.createOutputChannel('OpenMetadata Microphone Devices')
      outputChannel.show()
      outputChannel.appendLine(`Listing available microphone devices for ${this.platform}...`)
      outputChannel.appendLine('Command: ' + this.commandInfo.deviceListCommand)
      outputChannel.appendLine('-------------------------------------------')
      
      const output = cp.execSync(this.commandInfo.deviceListCommand, { encoding: 'utf-8' })
      outputChannel.appendLine(output)
      
      outputChannel.appendLine('-------------------------------------------')
      outputChannel.appendLine('To use a specific device, configure it in VS Code settings:')
      outputChannel.appendLine(`openmetadataExplorer.microphone.device${this.platform.charAt(0).toUpperCase() + this.platform.slice(1)}`)
      
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to list microphone devices: ${(error as Error).message}`
      )
    }
  }

  private createDummyMicrophone() {
    const EventEmitter = this.EventEmitter
    
    return new class DummyMicrophone extends EventEmitter {
      constructor() {
        super()
      }

      startRecording() {
        console.warn('DummyMicrophone: startRecording called but no microphone command available')
        this.emit('error', new Error(
          `Microphone not available. ${this.commandInfo?.installInstructions || 'Please install required audio tools.'}`
        ))
        return null
      }

      stopRecording() {
        console.warn('DummyMicrophone: stopRecording called but no microphone command available')
      }
    }()
  }

  private createMicrophoneImplementation() {
    const self = this
    const EventEmitter = this.EventEmitter

    return new class MicrophoneImplementation extends EventEmitter {
      private ps: cp.ChildProcess | null = null
      private options: MicrophoneOptions = {}

      constructor(options?: MicrophoneOptions) {
        super()
        this.options = options || self.options
      }
      
      startRecording() {
        if (this.ps === null) {
          if (!self.commandName) {
            throw new Error('No microphone command available')
          }
          
          let audioOptions: string[] = []
          
          switch (self.commandName) {
            case 'rec': {
              // macOS
              audioOptions = [
                '-q',
                '-b', this.options.bitwidth || '16',
                '-c', this.options.channels || '1',
                '-r', this.options.rate || '16000',
                '-e', this.options.encoding || 'signed-integer',
                '-t', 'wav',
                '-',
              ]
              break
            }
            case 'sox': {
              // Windows
              audioOptions = [
                '-b', this.options.bitwidth || '16',
                '--endian', this.options.endian || 'little',
                '-c', this.options.channels || '1',
                '-r', this.options.rate || '16000',
                '-e', this.options.encoding || 'signed-integer',
                '-t', 'waveaudio',
                this.options.device || self.commandInfo.defaultDevice,
                '-p',
              ]
              break
            }
            case 'arecord': {
              // Linux
              const formatEncoding = this.options.encoding === 'unsigned-integer' ? 'U' : 'S'
              const formatEndian = this.options.endian === 'big' ? 'BE' : 'LE'
              const format = `${formatEncoding}${this.options.bitwidth || '16'}_${formatEndian}`
              
              audioOptions = [
                '-c', this.options.channels || '1',
                '-r', this.options.rate || '16000',
                '-f', format,
                '-D', this.options.device || self.commandInfo.defaultDevice,
              ]
              break
            }
            default:
              throw new Error(`Unsupported command: ${self.commandName}`)
          }
          
          if (this.options.additionalParameters) {
            audioOptions = audioOptions.concat(this.options.additionalParameters)
          }
          
          try {
            console.log(`MicrophoneWrapper: Starting ${self.commandName} with device: ${this.options.device || self.commandInfo.defaultDevice}`)
            
            this.ps = cp.spawn(self.commandName, audioOptions)
            
            if (!this.ps) {
              throw new Error(`Failed to start ${self.commandName} process`)
            }
            
            this.ps.on('error', (error) => {
              console.error(`MicrophoneWrapper: Process error: ${error.message}`)
              this.emit('error', error)
            })
            
            if (this.ps.stderr) {
              this.ps.stderr.on('error', (error) => {
                console.error(`MicrophoneWrapper: stderr error: ${error.message}`)
                this.emit('error', error)
              })
              
              this.ps.stderr.on('data', (info) => {
                const infoStr = info.toString().trim()
                if (infoStr) {
                  console.log(`MicrophoneWrapper: Process info: ${infoStr}`)
                  this.emit('info', info)
                }
              })
            }
            
            if (this.ps.stdout) {
              if (this.options.useDataEmitter) {
                this.ps.stdout.on('data', (data) => {
                  this.emit('data', data)
                })
              }
              
              return this.ps.stdout
            }
            
            throw new Error('No stdout available from microphone process')
          } catch (error) {
            console.error(`MicrophoneWrapper: Failed to start recording: ${(error as Error).message}`)
            this.emit('error', error)
            return null
          }
        }
      }

      stopRecording() {
        if (this.ps) {
          this.ps.kill()
          this.ps = null
        }
      }
    }()
  }

  private showInstallationInstructions() {
    const message = `Microphone not available. ${this.commandInfo.installInstructions}`
    
    if (this.platform === 'darwin') {
      vscode.window.showWarningMessage(
        message,
        'Open Terminal', 'More Info'
      ).then(selection => {
        if (selection === 'Open Terminal') {
          cp.exec('open -a Terminal')
        } else if (selection === 'More Info') {
          vscode.env.openExternal(vscode.Uri.parse('https://formulae.brew.sh/formula/sox'))
        }
      })
    } else if (this.platform === 'win32') {
      vscode.window.showWarningMessage(
        message,
        'Download SoX'
      ).then(selection => {
        if (selection === 'Download SoX') {
          vscode.env.openExternal(vscode.Uri.parse('https://sourceforge.net/projects/sox/'))
        }
      })
    } else {
      vscode.window.showWarningMessage(
        message,
        'Open Terminal'
      ).then(selection => {
        if (selection === 'Open Terminal') {
          cp.exec('x-terminal-emulator || gnome-terminal || xterm')
        }
      })
    }
  }

  startRecording() {
    if (!this.microphone) {
      throw new Error('Microphone not initialized')
    }
    
    // Set up data emitter to forward events
    this.microphone.useDataEmitter = true
    const stream = this.microphone.startRecording()
    
    // Forward events from the microphone implementation
    this.microphone.on('error', (error: Error) => {
      console.error('MicrophoneWrapper: Error from microphone implementation:', error)
    })
    
    this.microphone.on('info', (info: Buffer) => {
      console.log('MicrophoneWrapper: Info from microphone implementation:', info.toString())
    })
    
    return stream
  }

  stopRecording() {
    if (this.microphone) {
      this.microphone.stopRecording()
    }
  }

  /**
   * Test microphone functionality
   */
  public async testMicrophone(): Promise<void> {
    if (!this.commandAvailable) {
      throw new Error(`Microphone command '${this.commandName}' not available. ${this.commandInfo.installInstructions}`)
    }

    return new Promise((resolve, reject) => {
      console.log('Testing microphone...')
      
      try {
        const audioStream = this.startRecording()
        
        if (!audioStream) {
          throw new Error('Failed to start microphone')
        }
        
        let dataReceived = false
        
        const timeout = setTimeout(() => {
          this.stopRecording()
          if (!dataReceived) {
            reject(new Error('No audio data received within 3 seconds'))
          }
        }, 3000)
        
        audioStream.on('data', (data: Buffer) => {
          if (!dataReceived) {
            dataReceived = true
            console.log(`Microphone test: Received ${data.length} bytes of audio data`)
            clearTimeout(timeout)
            this.stopRecording()
            resolve()
          }
        })
        
        audioStream.on('error', (error: Error) => {
          clearTimeout(timeout)
          this.stopRecording()
          reject(error)
        })
        
      } catch (error) {
        reject(error)
      }
    })
  }

  public dispose(): void {
    this.stopRecording()
  }
}
