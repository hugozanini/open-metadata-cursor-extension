import React, { useEffect, useState } from 'react';
import { AIInsights } from './components/AIInsights';
import { ConnectionDots } from './components/ConnectionDots';
import { DynamicSuggestions } from './components/DynamicSuggestions';

import LineageModal from './components/Lineage/LineageModal';
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
    hasAuthToken: boolean;
}

// Global VS Code API instance to avoid multiple acquisitions
declare global {
    interface Window {
        vscodeApi?: any;
    }
}

const getVsCodeApi = () => {
    if (!window.vscodeApi) {
        window.vscodeApi = acquireVsCodeApi();
    }
    return window.vscodeApi;
};

export const App: React.FC = () => {
    const [vscode] = useState(() => getVsCodeApi());
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<TableResult[]>([]);
    const [aiInsights, setAiInsights] = useState('');
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState<Config | null>(null);
    const [error, setError] = useState('');
    
    // Lineage modal state
    const [lineageModal, setLineageModal] = useState<{
        isOpen: boolean;
        tableFqn: string;
        tableName: string;
    }>({
        isOpen: false,
        tableFqn: '',
        tableName: '',
    });



    useEffect(() => {
        // Request configuration when component mounts
        vscode.postMessage({ type: 'getConfig' });

        // Handle search suggestion events from ResultsList
        const handleSearchSuggestion = (event: CustomEvent) => {
            const query = event.detail;
            setSearchQuery(query);
            vscode.postMessage({ type: 'search', query });
        };

        window.addEventListener('searchSuggestion', handleSearchSuggestion as EventListener);

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
                    setAiInsights('');
                    break;
                    
                case 'searchResults':
                    setLoading(false);
                    setResults(message.results);
                    if (message.aiInsights) {
                        setAiInsights(message.aiInsights);
                    } else if (message.results.length > 0) {
                        setAiInsights('Analyzing search results...');
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
        return () => {
            window.removeEventListener('message', handleMessage);
            window.removeEventListener('searchSuggestion', handleSearchSuggestion as EventListener);
        };
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

    // Lineage handling functions
    const handleViewLineage = (tableFqn: string, tableName: string) => {
        setLineageModal({
            isOpen: true,
            tableFqn,
            tableName,
        });
    };

    const handleCloseLineage = () => {
        setLineageModal({
            isOpen: false,
            tableFqn: '',
            tableName: '',
        });
    };



    // Hide loading message when React app mounts
    useEffect(() => {
        const loading = document.querySelector('.loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }, []);

    const handleHomeClick = () => {
        // Reset to home state
        setSearchQuery('');
        setResults([]);
        setAiInsights('');
        setError('');
        setLoading(false);
    };

    // Check if dots should be shown (only when there's a problem)
    const shouldShowDots = !config || !config.openmetadataUrl || !config.hasGeminiKey;
    const headerClassName = `app-header-minimal ${shouldShowDots ? '' : 'no-dots'}`;

    return (
        <div className="app">
            <div className={headerClassName}>
                <ConnectionDots config={config} onHomeClick={handleHomeClick} />
                <div className="search-container-top">
                    <SearchInterface
                        searchQuery={searchQuery}
                        onSearchQueryChange={setSearchQuery}
                        onSearch={handleSearch}
                        onKeyPress={handleKeyPress}
                        loading={loading}
                        onExampleSearch={handleExampleSearch}

                        compact={true}
                    />
                    {searchQuery.trim() === '' && (
                        <DynamicSuggestions onSuggestionClick={handleExampleSearch} />
                    )}
                </div>
            </div>

            <main className="app-main">
                {error && (
                    <div className="error-message">
                        ❌ {error}
                    </div>
                )}

                {(aiInsights || (results.length > 0 && !loading)) && (
                    <AIInsights 
                        insights={aiInsights} 
                        isStreaming={aiInsights.includes('Analyzing')}
                    />
                )}

                <ResultsList 
                    results={results} 
                    loading={loading}
                    searchQuery={searchQuery}
                    onViewLineage={handleViewLineage}

                />
            </main>

            {/* Lineage Modal */}
            <LineageModal
                tableFqn={lineageModal.tableFqn}
                tableName={lineageModal.tableName}
                isOpen={lineageModal.isOpen}
                onClose={handleCloseLineage}
            />


        </div>
    );
};