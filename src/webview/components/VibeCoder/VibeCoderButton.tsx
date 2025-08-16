import React from 'react';

interface VibeCoderButtonProps {
    onActivate: () => void;
}

const VibeCoderButton: React.FC<VibeCoderButtonProps> = ({ onActivate }) => {
    return (
        <button 
            className="vibe-coder-button"
            onClick={onActivate}
            title="Open Voice Coding Assistant"
        >
            🎤 Voice Coding
        </button>
    );
};

export default VibeCoderButton;
