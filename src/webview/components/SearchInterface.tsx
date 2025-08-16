import React from 'react';

interface SearchInterfaceProps {
    searchQuery: string;
    onSearchQueryChange: (query: string) => void;
    onSearch: () => void;
    onKeyPress: (event: React.KeyboardEvent) => void;
    loading: boolean;
    onExampleSearch: (query: string) => void;

    compact?: boolean;
}

export const SearchInterface: React.FC<SearchInterfaceProps> = ({
    searchQuery,
    onSearchQueryChange,
    onSearch,
    onKeyPress,
    loading,
    onExampleSearch,

    compact = false
}) => {
    const exampleQueries = [
        'customer',
        'orders',
        'users',
        'sales',
        'product',
        'payment'
    ];

    const naturalLanguageExamples = [
        'What customer information do I have?',
        'Show me order data',
        'How can I analyze sales?',
        'What user data is available?'
    ];

    if (compact) {
        return (
            <div className="search-input-container-compact">
                <input
                    type="text"
                    className="search-input-compact"
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    onKeyPress={onKeyPress}
                    placeholder="Ask anything about your data"
                    disabled={loading}
                />
                {loading && <div className="search-loading-indicator">🤖</div>}
            </div>
        );
    }

    return (
        <div className="search-section">
            <div className="search-input-container">
                <input
                    type="text"
                    className="search-input"
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    onKeyPress={onKeyPress}
                    placeholder="Ask me anything about your data: 'What customer information do I have?'"
                    disabled={loading}
                />
                <button 
                    className="search-button"
                    onClick={onSearch}
                    disabled={loading || !searchQuery.trim()}
                >
                    {loading ? (
                        <>🤖 Analyzing...</>
                    ) : (
                        <>🔍 Search</>
                    )}
                </button>
            </div>

            <div className="example-queries">
                <span className="example-label">Try asking:</span>
                {naturalLanguageExamples.slice(0, 2).map((query) => (
                    <button
                        key={query}
                        className="example-query-button natural-language"
                        onClick={() => onExampleSearch(query)}
                        disabled={loading}
                    >
                        {query}
                    </button>
                ))}
                {exampleQueries.slice(0, 4).map((query) => (
                    <button
                        key={query}
                        className="example-query-button"
                        onClick={() => onExampleSearch(query)}
                        disabled={loading}
                    >
                        {query}
                    </button>
                ))}

            </div>
        </div>
    );
};