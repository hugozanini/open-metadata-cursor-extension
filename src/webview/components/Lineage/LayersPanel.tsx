/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Collapsible Layers Panel inspired by OpenMetadata's LineageLayers component with Popover
 * https://github.com/open-metadata/OpenMetadata/blob/main/openmetadata-ui/src/main/resources/ui/src/components/Entity/EntityLineage/LineageLayers/LineageLayers.tsx
 */

import React, { useState, useRef, useEffect } from 'react';

interface LayerButtonProps {
    isActive: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    disabled?: boolean;
}

interface LayersPanelProps {
    onLayerToggle?: (layerType: string, enabled: boolean) => void;
}

const LayerButton: React.FC<LayerButtonProps> = ({ 
    isActive, 
    onClick, 
    icon, 
    label, 
    disabled = false 
}) => (
    <button
        className={`layer-button ${isActive ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={onClick}
        disabled={disabled}
        title={label}
    >
        <div className="layer-button-content">
            <div className="layer-icon">{icon}</div>
            <span className="layer-label">{label}</span>
        </div>
    </button>
);

// Layer icons inspired by OpenMetadata's design
const LayersIcon: React.FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l10 4.5v3L12 5 2 9.5v-3L12 2zm0 4.84L18.16 9.5 12 11.66 5.84 9.5 12 6.84zM2 12.5l10 4.5 10-4.5v3L12 20 2 15.5v-3zm0 4l10 4.5 10-4.5v3L12 24 2 19.5v-3z"/>
    </svg>
);

const DataQualityIcon: React.FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
);

const ServiceIcon: React.FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
);

const DomainIcon: React.FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
);

const LayersPanel: React.FC<LayersPanelProps> = ({ onLayerToggle }) => {
    const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set(['basic']));
    const [isExpanded, setIsExpanded] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const handleLayerToggle = (layerType: string) => {
        const newActiveLayers = new Set(activeLayers);
        const isCurrentlyActive = activeLayers.has(layerType);
        
        if (isCurrentlyActive) {
            newActiveLayers.delete(layerType);
        } else {
            newActiveLayers.add(layerType);
        }
        
        setActiveLayers(newActiveLayers);
        onLayerToggle?.(layerType, !isCurrentlyActive);
    };

    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsExpanded(false);
            }
        };

        if (isExpanded) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isExpanded]);

    return (
        <div className="layers-panel" ref={panelRef}>
            {/* Main Layers Button - OpenMetadata style */}
            <button 
                className="layers-trigger-button"
                onClick={() => setIsExpanded(!isExpanded)}
                title="Toggle layers"
            >
                <div className="layers-trigger-content">
                    <LayersIcon />
                    <span className="layers-trigger-label">Layers</span>
                </div>
            </button>
            
            {/* Expanded Layer Options - Popover style */}
            {isExpanded && (
                <div className="layers-popover">
                    <LayerButton
                        isActive={activeLayers.has('basic')}
                        onClick={() => handleLayerToggle('basic')}
                        icon={<LayersIcon />}
                        label="Basic"
                    />
                    
                    <LayerButton
                        isActive={activeLayers.has('dataQuality')}
                        onClick={() => handleLayerToggle('dataQuality')}
                        icon={<DataQualityIcon />}
                        label="Observability"
                    />
                    
                    <LayerButton
                        isActive={activeLayers.has('services')}
                        onClick={() => handleLayerToggle('services')}
                        icon={<ServiceIcon />}
                        label="Service"
                    />
                    
                    <LayerButton
                        isActive={activeLayers.has('domains')}
                        onClick={() => handleLayerToggle('domains')}
                        icon={<DomainIcon />}
                        label="Domain"
                        disabled={true}
                    />
                </div>
            )}
        </div>
    );
};

export default LayersPanel;