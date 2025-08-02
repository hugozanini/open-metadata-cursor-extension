import React from 'react';

interface AIInsightsProps {
    insights: string;
}

export const AIInsights: React.FC<AIInsightsProps> = ({ insights }) => {
    if (!insights) return null;

    // Format the insights text for better display
    const formatInsights = (text: string) => {
        return text.split('\n').map((line, index) => {
            // Check if line starts with emoji indicators
            if (line.match(/^[🎯📊🔍💡⚠️]/)) {
                return (
                    <div key={index} className="insight-line highlighted">
                        {line}
                    </div>
                );
            }
            
            // Regular line
            if (line.trim()) {
                return (
                    <div key={index} className="insight-line">
                        {line}
                    </div>
                );
            }
            
            return <br key={index} />;
        });
    };

    return (
        <div className="ai-insights">
            <div className="ai-insights-header">
                <h3>🤖 AI Insights</h3>
            </div>
            <div className="ai-insights-content">
                {formatInsights(insights)}
            </div>
        </div>
    );
};