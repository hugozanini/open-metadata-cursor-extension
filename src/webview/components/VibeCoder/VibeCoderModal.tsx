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
    const [transcript, setTranscript] = useState('');
    const [status, setStatus] = useState('Ready');
    const [isRecording, setIsRecording] = useState(false);
    const [hasDeepgramKey, setHasDeepgramKey] = useState(false);
    const [showApiKeys, setShowApiKeys] = useState(false);
    const [micTestResult, setMicTestResult] = useState<{success: boolean, message: string} | null>(null);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [sessionStartPosition, setSessionStartPosition] = useState(0); // Where current session started
    const [currentSessionText, setCurrentSessionText] = useState(''); // Track current recording session
    const [textBeforeSession, setTextBeforeSession] = useState(''); // Text before current session
    const [textAfterSession, setTextAfterSession] = useState(''); // Text after current session
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        // Request initial data when modal opens
        vscode.postMessage({ type: 'getApiKeyStatus' });

        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            
            switch (message.type) {
                case 'updateTranscript':
                    // Insert new text using pre-captured before/after session text
                    if (message.text) {
                        const newSessionText = message.text;
                        
                        // Build new text using the captured before/after session text
                        const newText = textBeforeSession + newSessionText + textAfterSession;
                        
                        // Update states
                        setCurrentSessionText(newSessionText);
                        setTranscript(newText);
                        
                        // Update cursor position to end of current session text
                        const newCursorPos = textBeforeSession.length + newSessionText.length;
                        setCursorPosition(newCursorPos);
                        
                        // Focus and set cursor position in textarea
                        setTimeout(() => {
                            if (textareaRef.current) {
                                textareaRef.current.focus();
                                textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
                            }
                        }, 0);
                    }
                    break;
                case 'updateStatus':
                    setStatus(message.text);
                    const wasRecording = isRecording;
                    const nowRecording = message.text === 'Recording...';
                    setIsRecording(nowRecording);
                    
                    // When starting recording, capture the text before/after cursor position
                    if (!wasRecording && nowRecording) {
                        // Get current cursor position from textarea
                        const currentPos = textareaRef.current ? textareaRef.current.selectionStart : cursorPosition;
                        const currentTranscript = transcript;
                        
                        // Capture text before and after the cursor position
                        const beforeText = currentTranscript.slice(0, currentPos);
                        const afterText = currentTranscript.slice(currentPos);
                        

                        
                        // Set the session boundaries
                        setSessionStartPosition(currentPos);
                        setCursorPosition(currentPos);
                        setTextBeforeSession(beforeText);
                        setTextAfterSession(afterText);
                        setCurrentSessionText(''); // Clear session text for new recording
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
                    break;
                case 'apiKeyStatus':
                    setHasDeepgramKey(message.hasDeepgramKey);
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
    }, [isOpen, vscode]);

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
                        <h3>Setup Required</h3>
                        <p>Configure your Deepgram API key to enable voice features:</p>
                        <div className="api-keys-status">
                            <div className={`key-status ${hasDeepgramKey ? 'configured' : 'missing'}`}>
                                Deepgram API: {hasDeepgramKey ? '✓ Configured' : '✗ Missing'}
                            </div>
                        </div>
                        <button 
                            className="setup-button"
                            onClick={() => setShowApiKeys(!showApiKeys)}
                        >
                            {showApiKeys ? 'Hide' : 'Configure API Key'}
                        </button>
                    </div>
                )}

                {showApiKeys && (
                    <div className="api-keys-config">
                        <ApiKeyInput
                            label="Deepgram API Key"
                            placeholder="Enter your Deepgram API key..."
                            onSave={(key) => handleSaveApiKey('deepgram', key)}
                            isConfigured={hasDeepgramKey}
                        />
                        <button 
                            className="test-mic-button"
                            onClick={handleTestMicrophone}
                        >
                            Test Microphone
                        </button>
                    </div>
                )}

                <div className="voice-to-text-section">
                    <div className="prompt-info">
                        <h4>Instructions:</h4>
                        <p>Configure your Deepgram API key, test your microphone, then start recording. Click in the text area to position your cursor where you want new transcriptions to be inserted. Text is never replaced - recordings always insert at cursor position, preserving existing text.</p>
                    </div>

                    {/* Always show API key configuration */}
                    <div className="api-keys-config">
                        <ApiKeyInput
                            label="Deepgram API Key"
                            placeholder="Enter your Deepgram API key..."
                            onSave={(key) => handleSaveApiKey('deepgram', key)}
                            isConfigured={hasDeepgramKey}
                        />
                        
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
