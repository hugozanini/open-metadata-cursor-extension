import React, { useEffect, useRef, useState } from 'react';

interface VibeCoderModalProps {
    isOpen: boolean;
    onClose: () => void;
    vscode: {
        postMessage: (message: any) => void;
        getState?: () => any;
        setState?: (state: any) => void;
    };
}

const VibeCoderModal: React.FC<VibeCoderModalProps> = ({ isOpen, onClose, vscode }) => {
    console.log('VibeCoderModal component rendered, isOpen:', isOpen);
    const [transcript, setTranscript] = useState('');
    const [status, setStatus] = useState('Ready');
    const [isRecording, setIsRecording] = useState(false);
    const [hasDeepgramKey, setHasDeepgramKey] = useState(false);
    const [showApiKeys, setShowApiKeys] = useState(false);
    const [micTestResult, setMicTestResult] = useState<{success: boolean, message: string} | null>(null);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [progressItems, setProgressItems] = useState<any[]>([]);
    const [whisperWorker, setWhisperWorker] = useState<Worker | null>(null);
    const [workerBlobUrl, setWorkerBlobUrl] = useState<string | null>(null);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [sessionStartPosition, setSessionStartPosition] = useState(0); // Where current session started
    const [currentSessionText, setCurrentSessionText] = useState(''); // Track current recording session
    const [textBeforeSession, setTextBeforeSession] = useState(''); // Text before current session
    const [textAfterSession, setTextAfterSession] = useState(''); // Text after current session
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Separate effect for initial setup when modal opens
    useEffect(() => {
        if (!isOpen) return;

        // Request initial data when modal opens
        vscode.postMessage({ type: 'getApiKeyStatus' });
        vscode.postMessage({ type: 'getModelStatus' });
    }, [isOpen, vscode]);

    // Separate effect for worker recreation logic
    useEffect(() => {
        if (!isOpen) return;
        
        console.log('Checking worker state on modal open:', {
            isModelLoaded,
            hasWorker: !!whisperWorker,
            isModelLoading
        });
        
        if (isModelLoaded && !whisperWorker && !isModelLoading) {
            console.log('Model is loaded but worker is missing, recreating worker...');
            handleCreateWorkerAndLoadModel();
        }
    }, [isOpen, isModelLoaded, whisperWorker, isModelLoading]);

    // Message handler effect (stable, no dependencies on changing state)
    useEffect(() => {
        if (!isOpen) return;

        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            
            switch (message.type) {
                case 'updateTranscript':
                    // Insert new text using pre-captured before/after session text
                    if (message.text) {
                        setCurrentSessionText(message.text);
                        
                        // Use functional updates to safely access current state
                        setTextBeforeSession(prevBefore => {
                            setTextAfterSession(prevAfter => {
                                const newText = prevBefore + message.text + prevAfter;
                                setTranscript(newText);
                                
                                // Update cursor position to end of current session text
                                const newCursorPos = prevBefore.length + message.text.length;
                                setCursorPosition(newCursorPos);
                                
                                // Focus and set cursor position in textarea
                                setTimeout(() => {
                                    if (textareaRef.current) {
                                        textareaRef.current.focus();
                                        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
                                    }
                                }, 0);
                                
                                return prevAfter; // Don't change textAfterSession
                            });
                            return prevBefore; // Don't change textBeforeSession
                        });
                    }
                    break;
                case 'updateStatus':
                    setStatus(message.text);
                    const nowRecording = message.text === 'Recording...';
                    
                    setIsRecording(prevIsRecording => {
                        const wasRecording = prevIsRecording;
                        
                        // When starting recording, capture the text before/after cursor position
                        if (!wasRecording && nowRecording) {
                            setTranscript(currentTranscript => {
                                // Get current cursor position from textarea
                                const currentPos = textareaRef.current ? textareaRef.current.selectionStart : 0;
                                
                                // Capture text before and after the cursor position
                                const beforeText = currentTranscript.slice(0, currentPos);
                                const afterText = currentTranscript.slice(currentPos);
                                
                                // Set the session boundaries
                                setSessionStartPosition(currentPos);
                                setCursorPosition(currentPos);
                                setTextBeforeSession(beforeText);
                                setTextAfterSession(afterText);
                                setCurrentSessionText(''); // Clear session text for new recording
                                
                                return currentTranscript; // Don't change transcript
                            });
                        }
                        // When stopping recording, commit the session (currentSessionText is already in transcript)
                        if (wasRecording && !nowRecording) {
                            // Session is committed, clear session tracking
                            setCurrentSessionText('');
                            // Update cursor position to end of the inserted text for potential next recording
                            if (textareaRef.current) {
                                setCursorPosition(textareaRef.current.selectionStart);
                            }
                        }
                        
                        return nowRecording;
                    });
                    break;
                case 'apiKeyStatus':
                    // For Whisper, hasDeepgramKey actually means "model is ready"
                    console.log('Received apiKeyStatus:', message);
                    setHasDeepgramKey(message.hasDeepgramKey);
                    setIsModelLoaded(message.hasDeepgramKey);
                    break;
                case 'modelLoadProgress':
                    setProgressItems(message.progress || []);
                    setIsModelLoading(true);
                    break;
                case 'modelReady':
                    setIsModelLoaded(true);
                    setIsModelLoading(false);
                    setProgressItems([]);
                    setHasDeepgramKey(true); // For compatibility with existing UI logic
                    break;
                case 'loadModelInWebview':
                    // Create worker and start loading model
                    console.log('loadModelInWebview message received');
                    handleCreateWorkerAndLoadModel();
                    break;
                case 'generateAudio':
                    // Forward audio to worker for transcription
                    console.log('generateAudio message received. Worker state:', {
                        hasWorker: !!whisperWorker,
                        hasData: !!message.data,
                        dataType: typeof message.data,
                        audioLength: message.data?.audio?.length
                    });
                    
                    // Use current whisperWorker from closure
                    setWhisperWorker(currentWorker => {
                        if (currentWorker && message.data) {
                            console.log('Forwarding audio to worker for transcription, audio length:', message.data.audio?.length);
                            currentWorker.postMessage({
                                type: 'generate',
                                data: message.data
                            });
                        } else {
                            console.warn('Cannot process audio: worker not available or no data', {
                                hasWorker: !!currentWorker,
                                hasData: !!message.data
                            });
                        }
                        return currentWorker; // Don't change the worker
                    });
                    break;
                case 'microphoneTestResult':
                    setMicTestResult({
                        success: message.success,
                        message: message.message
                    });
                    // Clear the result after 5 seconds
                    setTimeout(() => setMicTestResult(null), 5000);
                    break;
                case 'showSuccess':
                    setStatus('Text copied to clipboard!');
                    setTimeout(() => setStatus('Ready'), 2000);
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [isOpen]);

    // Cleanup worker on unmount
    // Monitor whisperWorker state changes
    useEffect(() => {
        console.log('whisperWorker state changed:', !!whisperWorker);
    }, [whisperWorker]);

    useEffect(() => {
        return () => {
            if (whisperWorker) {
                whisperWorker.terminate();
            }
            if (workerBlobUrl) {
                URL.revokeObjectURL(workerBlobUrl);
            }
        };
    }, [whisperWorker, workerBlobUrl]);

    const handleToggleDictation = () => {
        vscode.postMessage({ type: 'toggleDictation' });
    };

    const handleSaveApiKey = (service: 'deepgram', key: string) => {
        vscode.postMessage({ type: 'saveApiKey', service, key });
        setHasDeepgramKey(true);
    };

    const handleTestMicrophone = () => {
        setMicTestResult(null); // Clear previous results
        vscode.postMessage({ type: 'testMicrophone' });
    };

    const handleCopyText = () => {
        if (transcript.trim()) {
            navigator.clipboard.writeText(transcript).then(() => {
                setStatus('Text copied to clipboard!');
                setTimeout(() => setStatus('Ready'), 2000);
            }).catch(() => {
                // Fallback: use VS Code API
                vscode.postMessage({ type: 'copyToClipboard', text: transcript });
            });
        }
    };

    const handleClearText = () => {
        setTranscript('');
        setCurrentSessionText('');
        setCursorPosition(0);
        setSessionStartPosition(0);
        setTextBeforeSession('');
        setTextAfterSession('');
        setStatus('Text cleared');
        setTimeout(() => setStatus('Ready'), 1000);
        // Focus the textarea after clearing
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(0, 0);
            }
        }, 0);
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const newCursorPos = e.target.selectionStart;
        

        
        setTranscript(newValue);
        setCursorPosition(newCursorPos);
        
        // If we're not currently recording, clear session tracking since user manually edited
        if (!isRecording) {
            setCurrentSessionText('');
            setTextBeforeSession('');
            setTextAfterSession('');
        }
    };

    const handleCursorPositionChange = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
        const target = e.target as HTMLTextAreaElement;
        setCursorPosition(target.selectionStart);
    };

    const handleLoadModel = () => {
        setIsModelLoading(true);
        vscode.postMessage({ type: 'loadWhisperModel' });
    };

    const handleCreateWorkerAndLoadModel = async () => {
        try {
            console.log('handleCreateWorkerAndLoadModel called. Current worker state:', !!whisperWorker);
            setIsModelLoading(true);
            
            // Create worker using blob URL to bypass cross-origin restrictions
            const workerUri = (window as any).whisperWorkerUri;
            if (!workerUri) {
                throw new Error('Worker URI not available');
            }
            
            console.log('Worker URI available:', workerUri);
            
            // Fetch the worker script and create a blob URL
            const response = await fetch(workerUri);
            const workerScript = await response.text();
            const blob = new Blob([workerScript], { type: 'application/javascript' });
            const blobUrl = URL.createObjectURL(blob);
            
            const worker = new Worker(blobUrl);
            console.log('Worker created successfully:', worker);
            setWhisperWorker(worker);
            setWorkerBlobUrl(blobUrl);
            console.log('Worker state set, whisperWorker should now be available');
            
            // Verify the state was set
            setTimeout(() => {
                console.log('Checking worker state after setState:', {
                    workerExists: !!worker,
                    stateUpdated: 'will check in next render'
                });
            }, 100);
            
            // Set up worker message handling
            worker.onmessage = (e) => {
                const data = e.data;
                console.log('Worker message:', data);
                
                // Forward worker messages to extension
                vscode.postMessage({
                    type: 'workerMessage',
                    data: data
                });
                
                // Handle local state updates
                switch (data.status) {
                    case 'loading':
                        console.log('Model loading:', data.data);
                        break;
                    case 'initiate':
                        setProgressItems(prev => [...prev, data]);
                        break;
                    case 'progress':
                        setProgressItems(prev => 
                            prev.map(item => 
                                item.file === data.file ? { ...item, ...data } : item
                            )
                        );
                        break;
                    case 'done':
                        setProgressItems(prev => 
                            prev.filter(item => item.file !== data.file)
                        );
                        break;
                    case 'ready':
                        setIsModelLoaded(true);
                        setIsModelLoading(false);
                        setProgressItems([]);
                        setHasDeepgramKey(true);
                        break;
                    case 'error':
                        setIsModelLoading(false);
                        console.error('Worker error:', data.error);
                        break;
                }
            };
            
            worker.onerror = (error) => {
                console.error('Worker error:', error);
                setIsModelLoading(false);
            };
            
            // Start loading model with optional VAD URL
            worker.postMessage({ type: 'load', data: { vadModelUrl: (window as any).vadModelUri, vadThreshold: 0.5 } });
            
        } catch (error) {
            console.error('Failed to create worker:', error);
            setIsModelLoading(false);
        }
    };

    if (!isOpen) return null;

    const needsSetup = !hasDeepgramKey;

    return (
        <div className="vibe-coder-modal">
            <div className="vibe-coder-modal-content">
                <div className="vibe-coder-header">
                    <h2>Voice to Text</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                {needsSetup && (
                    <div className="setup-banner">
                        <h3>Model Setup Required</h3>
                        <p>Load the Whisper model for local speech recognition:</p>
                        <div className="model-status">
                            <div className={`key-status ${isModelLoaded ? 'configured' : 'missing'}`}>
                                Whisper Model: {isModelLoaded ? '✓ Loaded' : '✗ Not Loaded'}
                            </div>
                        </div>
                        <button 
                            className="setup-button"
                            onClick={handleLoadModel}
                            disabled={isModelLoading}
                        >
                            {isModelLoading ? 'Loading Model...' : 'Load Model'}
                        </button>
                        
                        {isModelLoading && (
                            <div className="model-progress">
                                <p>Loading Whisper model (~200MB)...</p>
                                {progressItems.map((item, index) => (
                                    <div key={item.file || index} className="progress-item">
                                        <div className="progress-bar">
                                            <div 
                                                className="progress-fill" 
                                                style={{ width: `${item.progress || 0}%` }}
                                            />
                                        </div>
                                        <span className="progress-text">
                                            {item.file} ({(item.progress || 0).toFixed(1)}%)
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="voice-to-text-section">
                    <div className="prompt-info">
                        <h4>Instructions:</h4>
                        <p>Load the Whisper model, test your microphone, then start recording. Click in the text area to position your cursor where you want new transcriptions to be inserted. Text is never replaced - recordings always insert at cursor position, preserving existing text.</p>
                    </div>

                    {/* Microphone test section */}
                    <div className="microphone-test-section">
                        <button 
                            className="test-mic-button"
                            onClick={handleTestMicrophone}
                        >
                            🎤 Test Microphone
                        </button>
                        
                        {micTestResult && (
                            <div className={`mic-test-result ${micTestResult.success ? 'success' : 'error'}`}>
                                <span className="result-icon">
                                    {micTestResult.success ? '✅' : '❌'}
                                </span>
                                <span className="result-message">{micTestResult.message}</span>
                            </div>
                        )}
                    </div>

                    <div className="recording-section">
                        <button 
                            className={`record-button ${isRecording ? 'recording' : ''}`}
                            onClick={handleToggleDictation}
                            disabled={needsSetup}
                        >
                            {isRecording ? '⏹️ Stop Recording' : '🎤 Start Recording'}
                        </button>
                        <div className="status">{status}</div>
                    </div>

                    <div className="transcript-section">
                        <div className="transcript-header">
                            <h4>Your Speech:</h4>
                            <div className="transcript-actions">
                                <button 
                                    className="copy-button"
                                    onClick={handleCopyText}
                                    disabled={!transcript.trim()}
                                    title="Copy text to clipboard"
                                >
                                    📋 Copy
                                </button>
                                <button 
                                    className="clear-button"
                                    onClick={handleClearText}
                                    disabled={!transcript.trim()}
                                    title="Clear all text"
                                >
                                    🗑️ Clear
                                </button>
                            </div>
                        </div>
                        <textarea
                            ref={textareaRef}
                            className="transcript-box editable"
                            value={transcript}
                            onChange={handleTextChange}
                            onSelect={handleCursorPositionChange}
                            onKeyUp={handleCursorPositionChange}
                            onClick={handleCursorPositionChange}
                            placeholder="Your transcribed speech will appear here. Click to position your cursor where you want new recordings to be inserted. Text is never replaced - only inserted at cursor position."
                            rows={8}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

interface ApiKeyInputProps {
    label: string;
    placeholder: string;
    onSave: (key: string) => void;
    isConfigured: boolean;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ label, placeholder, onSave, isConfigured }) => {
    const [key, setKey] = useState('');

    const handleSave = () => {
        if (key.trim()) {
            onSave(key.trim());
            setKey('');
        }
    };

    return (
        <div className="api-key-input">
            <label>{label}</label>
            <div className="input-group">
                <input
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder={isConfigured ? 'API key configured' : placeholder}
                    disabled={isConfigured}
                />
                <button 
                    onClick={handleSave}
                    disabled={!key.trim() || isConfigured}
                >
                    Save
                </button>
            </div>
        </div>
    );
};

export default VibeCoderModal;
