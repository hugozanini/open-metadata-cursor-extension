import React from 'react';

interface Config {
    openmetadataUrl: string;
    hasGeminiKey: boolean;
}

interface ConfigStatusProps {
    config: Config | null;
}

export const ConfigStatus: React.FC<ConfigStatusProps> = ({ config }) => {
    if (!config) {
        return (
            <div className="status-bar">
                <div className="status-indicator loading" title="Loading configuration...">
                    <div className="status-dot pulsing"></div>
                    <span className="status-text">Loading...</span>
                </div>
            </div>
        );
    }

    const connectionStatus = config.openmetadataUrl ? 'connected' : 'disconnected';
    const aiStatus = config.hasGeminiKey ? 'enabled' : 'disabled';

    return (
        <div className="status-bar">
            <div 
                className={`status-indicator ${connectionStatus}`}
                title={config.openmetadataUrl || 'OpenMetadata not configured'}
            >
                <div className={`status-dot ${connectionStatus}`}></div>
                <span className="status-text">
                    {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
                </span>
            </div>
            
            <div className="status-separator"></div>
            
            <div 
                className={`status-indicator ${aiStatus}`}
                title={config.hasGeminiKey ? 'AI Analysis enabled' : 'Configure Gemini API key for AI features'}
            >
                <div className={`status-dot ${aiStatus}`}></div>
                <span className="status-text">
                    AI {aiStatus === 'enabled' ? 'On' : 'Off'}
                </span>
            </div>
        </div>
    );
};