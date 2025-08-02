import React, { useEffect, useState } from 'react';
import { AIInsights } from './components/AIInsights';
import { ConfigStatus } from './components/ConfigStatus';
import { ResultsList } from './components/ResultsList';
import { SearchInterface } from './components/SearchInterface';
import './styles.css';

// VS Code API type
declare const acquireVsCodeApi: () => any;

interface TableResult {
    id: string;
    name: string;
    fullyQualifiedName: string;
    description?: string;
    tableType?: string;
    columns?: any[];
    rowCount?: number;
    database?: string;
    schema?: string;
    updatedAt?: string;
    tags?: string[];
    aiAnalysis?: string;
}

interface Config {
    openmetadataUrl: string;
    hasGeminiKey: boolean;
}

export const App: React.FC = () => {
    const [vscode] = useState(() => acquireVsCodeApi());
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<TableResult[]>([]);
    const [aiInsights, setAiInsights] = useState('');
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState<Config | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        // Request configuration when component mounts
        vscode.postMessage({ type: 'getConfig' });

        // Handle messages from the extension
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            
            switch (message.type) {
                case 'config':
                    setConfig(message.config);
                    break;
                    
                case 'searchStarted':
                    setLoading(true);
                    setError('');
                    setAiInsights('🤖 AI is analyzing your search...');
                    break;
                    
                case 'searchResults':
                    setLoading(false);
                    setResults(message.results);
                    if (message.aiInsights) {
                        setAiInsights(message.aiInsights);
                    } else {
                        setAiInsights('🤖 AI is analyzing your results...');
                    }
                    break;
                    
                case 'aiInsightsUpdate':
                    setAiInsights(message.aiInsights);
                    break;
                    
                case 'searchError':
                    setLoading(false);
                    setError(message.error);
                    setAiInsights('');
                    setResults([]);
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [vscode]);

    const handleSearch = () => {
        if (!searchQuery.trim()) {
            setError('Please enter a search query');
            return;
        }

        setError('');
        vscode.postMessage({ 
            type: 'search', 
            query: searchQuery.trim() 
        });
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    };

    const handleExampleSearch = (query: string) => {
        setSearchQuery(query);
        vscode.postMessage({ type: 'search', query });
    };

    return (
        <div className="app">
            <header className="app-header">
                <h1>🔍 OpenMetadata AI Explorer</h1>
                <ConfigStatus config={config} />
            </header>

            <main className="app-main">
                <SearchInterface
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    onSearch={handleSearch}
                    onKeyPress={handleKeyPress}
                    loading={loading}
                    onExampleSearch={handleExampleSearch}
                />

                {error && (
                    <div className="error-message">
                        ❌ {error}
                    </div>
                )}

                <ResultsList 
                    results={results} 
                    loading={loading}
                    searchQuery={searchQuery}
                />

                {aiInsights && results.length > 0 && (
                    <AIInsights insights={aiInsights} />
                )}
            </main>
        </div>
    );
};