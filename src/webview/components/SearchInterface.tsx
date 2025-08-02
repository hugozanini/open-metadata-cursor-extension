import React from 'react';

interface SearchInterfaceProps {
    searchQuery: string;
    onSearchQueryChange: (query: string) => void;
    onSearch: () => void;
    onKeyPress: (event: React.KeyboardEvent) => void;
    loading: boolean;
    onExampleSearch: (query: string) => void;
}

export const SearchInterface: React.FC<SearchInterfaceProps> = ({
    searchQuery,
    onSearchQueryChange,
    onSearch,
    onKeyPress,
    loading,
    onExampleSearch
}) => {
    const exampleQueries = [
        'customer',
        'orders',
        'users',
        'sales',
        'product',
        'payment'
    ];

    return (
        <div className="search-section">
            <div className="search-input-container">
                <input
                    type="text"
                    className="search-input"
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    onKeyPress={onKeyPress}
                    placeholder="Search tables, columns, or ask questions about your data..."
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
                <span className="example-label">Try searching for:</span>
                {exampleQueries.map((query) => (
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