import React, { useEffect, useState } from 'react';

interface DynamicSuggestionsProps {
    onSuggestionClick?: (suggestion: string) => void;
}

export const DynamicSuggestions: React.FC<DynamicSuggestionsProps> = ({ onSuggestionClick }) => {
    const suggestions = [
        "What customer information do I have?",
        "Show me all sales related tables",
        "Find tables containing user data",
        "What payment methods are stored?",
        "Show me order tracking tables",
        "Find customer behavior analytics",
        "What product information is available?",
        "Show me inventory management data",
        "Find marketing campaign tables",
        "What financial reporting data exists?",
        "Show me user activity logs",
        "Find data quality issues in my tables"
    ];

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        let timeout: NodeJS.Timeout;

        const startRotation = () => {
            interval = setInterval(() => {
                // Start fade out
                setIsVisible(false);
                
                // After fade out completes, change text and fade in
                timeout = setTimeout(() => {
                    setCurrentIndex((prevIndex) => (prevIndex + 1) % suggestions.length);
                    setIsVisible(true);
                }, 300); // 300ms for fade out duration
            }, 5000); // 5 seconds
        };

        startRotation();

        return () => {
            if (interval) clearInterval(interval);
            if (timeout) clearTimeout(timeout);
        };
    }, [suggestions.length]);

    const handleSuggestionClick = () => {
        if (onSuggestionClick) {
            onSuggestionClick(suggestions[currentIndex]);
        }
    };

    return (
        <div className="dynamic-suggestions-header">
            <div 
                className={`suggestion-text ${isVisible ? 'visible' : 'hidden'}`}
                onClick={handleSuggestionClick}
            >
                {suggestions[currentIndex]}
            </div>
        </div>
    );
};