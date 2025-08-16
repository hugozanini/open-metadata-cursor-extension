import React, { useEffect, useState } from 'react';

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
    const [currentMode, setCurrentMode] = useState<'vibe' | 'code'>('code');
    const [transcript, setTranscript] = useState('');
    const [promptOutput, setPromptOutput] = useState('');
    const [status, setStatus] = useState('Ready');
    const [prompts, setPrompts] = useState<any[]>([]);
    const [currentPromptId, setCurrentPromptId] = useState('default');
    const [isRecording, setIsRecording] = useState(false);
    const [hasDeepgramKey, setHasDeepgramKey] = useState(false);
    const [hasOpenAIKey, setHasOpenAIKey] = useState(false);
    const [showApiKeys, setShowApiKeys] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        // Request initial data when modal opens
        vscode.postMessage({ type: 'getApiKeyStatus' });
        vscode.postMessage({ type: 'getPromptsList' });

        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            
            switch (message.type) {
                case 'updateMode':
                    setCurrentMode(message.mode);
                    break;
                case 'updateTranscript':
                    if (message.target === 'transcript') {
                        setTranscript(message.text);
                    } else if (message.target === 'prompt-output') {
                        setPromptOutput(message.text);
                    }
                    break;
                case 'appendTranscript':
                    if (message.target === 'prompt-output') {
                        setPromptOutput(prev => prev + message.text);
                    }
                    break;
                case 'updateStatus':
                    if (message.target === 'code-status') {
                        setStatus(message.text);
                        setIsRecording(message.text === 'Recording...');
                    }
                    break;
                case 'apiKeyStatus':
                    setHasDeepgramKey(message.hasDeepgramKey);
                    setHasOpenAIKey(message.hasOpenAIKey);
                    break;
                case 'promptsList':
                    setPrompts(message.prompts);
                    break;
                case 'showSuccess':
                    setStatus('Copied to clipboard!');
                    setTimeout(() => setStatus('Ready'), 2000);
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [isOpen, vscode]);

    const handleModeSwitch = (mode: 'vibe' | 'code') => {
        setCurrentMode(mode);
        vscode.postMessage({ type: 'switchMode', mode });
    };

    const handleToggleDictation = () => {
        vscode.postMessage({ type: 'toggleDictation' });
    };

    const handlePromptChange = (promptId: string) => {
        setCurrentPromptId(promptId);
        vscode.postMessage({ type: 'setPrompt', id: promptId });
    };

    const handleSaveApiKey = (service: 'deepgram' | 'openai', key: string) => {
        vscode.postMessage({ type: 'saveApiKey', service, key });
        if (service === 'deepgram') setHasDeepgramKey(true);
        if (service === 'openai') setHasOpenAIKey(true);
    };

    const handleTestMicrophone = () => {
        vscode.postMessage({ type: 'testMicrophone' });
    };

    if (!isOpen) return null;

    const needsSetup = !hasDeepgramKey || !hasOpenAIKey;

    return (
        <div className="vibe-coder-modal">
            <div className="vibe-coder-modal-content">
                <div className="vibe-coder-header">
                    <h2>Voice Coding Assistant</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                {needsSetup && (
                    <div className="setup-banner">
                        <h3>Setup Required</h3>
                        <p>Configure API keys to enable voice features:</p>
                        <div className="api-keys-status">
                            <div className={`key-status ${hasDeepgramKey ? 'configured' : 'missing'}`}>
                                Deepgram API: {hasDeepgramKey ? '✓ Configured' : '✗ Missing'}
                            </div>
                            <div className={`key-status ${hasOpenAIKey ? 'configured' : 'missing'}`}>
                                OpenAI API: {hasOpenAIKey ? '✓ Configured' : '✗ Missing'}
                            </div>
                        </div>
                        <button 
                            className="setup-button"
                            onClick={() => setShowApiKeys(!showApiKeys)}
                        >
                            {showApiKeys ? 'Hide' : 'Configure API Keys'}
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
                        <ApiKeyInput
                            label="OpenAI API Key"
                            placeholder="Enter your OpenAI API key (sk-...)..."
                            onSave={(key) => handleSaveApiKey('openai', key)}
                            isConfigured={hasOpenAIKey}
                        />
                        <button 
                            className="test-mic-button"
                            onClick={handleTestMicrophone}
                        >
                            Test Microphone
                        </button>
                    </div>
                )}

                <div className="mode-selector">
                    <button 
                        className={`mode-button ${currentMode === 'vibe' ? 'active' : ''}`}
                        onClick={() => handleModeSwitch('vibe')}
                        disabled={needsSetup}
                    >
                        Vibe Mode
                    </button>
                    <button 
                        className={`mode-button ${currentMode === 'code' ? 'active' : ''}`}
                        onClick={() => handleModeSwitch('code')}
                        disabled={needsSetup}
                    >
                        Code Mode
                    </button>
                </div>

                {currentMode === 'code' && (
                    <div className="code-mode">
                        <div className="prompt-selector">
                            <label htmlFor="prompt-select">Prompt:</label>
                            <select 
                                id="prompt-select"
                                value={currentPromptId}
                                onChange={(e) => handlePromptChange(e.target.value)}
                            >
                                {prompts.map((prompt) => (
                                    <option key={prompt.id} value={prompt.id}>
                                        {prompt.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="recording-section">
                            <button 
                                className={`record-button ${isRecording ? 'recording' : ''}`}
                                onClick={handleToggleDictation}
                                disabled={needsSetup}
                            >
                                {isRecording ? '⏹️ Stop' : '🎤 Start Recording'}
                            </button>
                            <div className="status">{status}</div>
                        </div>

                        <div className="transcript-section">
                            <h4>Your Speech:</h4>
                            <div className="transcript-box">
                                {transcript || 'Your transcribed speech will appear here...'}
                            </div>
                        </div>

                        <div className="output-section">
                            <h4>AI Response:</h4>
                            <div className="output-box">
                                {promptOutput || 'AI-processed response will appear here...'}
                            </div>
                        </div>
                    </div>
                )}

                {currentMode === 'vibe' && (
                    <div className="vibe-mode">
                        <div className="coming-soon">
                            <h3>Vibe Mode</h3>
                            <p>Interactive AI conversation mode coming soon!</p>
                        </div>
                    </div>
                )}
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
