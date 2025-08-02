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
            <div className="config-status loading">
                ⏳ Loading configuration...
            </div>
        );
    }

    return (
        <div className="config-status">
            <div className="config-item">
                <span className="config-label">OpenMetadata:</span>
                <span className={`config-value ${config.openmetadataUrl ? 'success' : 'error'}`}>
                    {config.openmetadataUrl || 'Not configured'}
                </span>
            </div>
            <div className="config-item">
                <span className="config-label">AI Analysis:</span>
                <span className={`config-value ${config.hasGeminiKey ? 'success' : 'warning'}`}>
                    {config.hasGeminiKey ? '✅ Enabled' : '⚠️ Configure Gemini API key'}
                </span>
            </div>
        </div>
    );
};