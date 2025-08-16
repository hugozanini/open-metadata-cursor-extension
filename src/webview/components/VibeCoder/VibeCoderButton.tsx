import React from 'react';

interface VibeCoderButtonProps {
    onActivate: () => void;
}

const VibeCoderButton: React.FC<VibeCoderButtonProps> = ({ onActivate }) => {
    return (
        <button 
            className="vibe-coder-button"
            onClick={onActivate}
            title="Open Voice to Text"
        >
            🎤 Voice to Text
        </button>
    );
};

export default VibeCoderButton;
