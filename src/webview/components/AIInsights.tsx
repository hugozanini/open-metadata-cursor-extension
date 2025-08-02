import React, { useEffect, useState } from 'react';

interface AIInsightsProps {
    insights: string;
    isStreaming?: boolean;
}

export const AIInsights: React.FC<AIInsightsProps> = ({ insights, isStreaming = false }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        if (!insights) {
            setDisplayedText('');
            return;
        }

        // If it's a loading message or very short, show immediately
        if (isStreaming || insights.length < 50) {
            setDisplayedText(insights);
            setIsTyping(false);
            return;
        }

        // Streaming effect for longer responses
        setIsTyping(true);
        setDisplayedText('');
        
        let currentIndex = 0;
        const streamText = () => {
            if (currentIndex < insights.length) {
                // Add characters word by word for smoother effect
                const nextSpace = insights.indexOf(' ', currentIndex);
                const nextWord = nextSpace === -1 ? insights.length : nextSpace + 1;
                
                setDisplayedText(insights.substring(0, nextWord));
                currentIndex = nextWord;
                
                // Faster typing speed for better UX
                setTimeout(streamText, 50);
            } else {
                setIsTyping(false);
            }
        };

        // Small delay before starting to stream
        setTimeout(streamText, 200);
    }, [insights, isStreaming]);

    if (!insights) return null;

    // Format the insights text for better display
    const formatInsights = (text: string) => {
        return text.split('\n').map((line, index) => {
            // Skip empty lines
            if (!line.trim()) return null;
            
            // Format bold text (**text**)
            const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            
            return (
                <div 
                    key={index} 
                    className="insight-line"
                    dangerouslySetInnerHTML={{ __html: formattedLine }}
                />
            );
        }).filter(Boolean);
    };

    return (
        <div className="ai-overview">
            <div className="ai-overview-content">
                {formatInsights(displayedText)}
                {isTyping && <span className="cursor-blink">|</span>}
            </div>
            {isTyping && (
                <div className="typing-status">
                    <span className="typing-indicator">●</span>
                    <span className="typing-text">AI is analyzing...</span>
                </div>
            )}
        </div>
    );
};