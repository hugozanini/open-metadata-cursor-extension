/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Expand/Collapse buttons inspired by OpenMetadata's CustomNode.utils.tsx
 * https://github.com/open-metadata/OpenMetadata/blob/main/openmetadata-ui/src/main/resources/ui/src/components/Entity/EntityLineage/CustomNode.utils.tsx
 */

import React from 'react';

export enum LineageDirection {
    Upstream = 'upstream',
    Downstream = 'downstream'
}

interface ExpandCollapseButtonsProps {
    hasUpstreamConnections?: boolean;
    hasDownstreamConnections?: boolean;
    upstreamHidden?: boolean;
    downstreamHidden?: boolean;
    canExpandUpstream?: boolean;
    canExpandDownstream?: boolean;
    onExpand?: (direction: LineageDirection) => void;
    onCollapse?: (direction: LineageDirection) => void;
}

// Plus icon for expand (SVG matching OpenMetadata style)
const PlusIcon: React.FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
    </svg>
);

// Minus icon for collapse (SVG matching OpenMetadata style)  
const MinusIcon: React.FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 13H5v-2h14v2z"/>
    </svg>
);

const ExpandCollapseButtons: React.FC<ExpandCollapseButtonsProps> = ({
    hasUpstreamConnections = false,
    hasDownstreamConnections = false,
    upstreamHidden = false,
    downstreamHidden = false,
    canExpandUpstream = false,
    canExpandDownstream = false,
    onExpand,
    onCollapse,
}) => {
    const handleExpandUpstream = (e: React.MouseEvent) => {
        e.stopPropagation();
        onExpand?.(LineageDirection.Upstream);
    };

    const handleCollapseUpstream = (e: React.MouseEvent) => {
        e.stopPropagation();
        onCollapse?.(LineageDirection.Upstream);
    };

    const handleExpandDownstream = (e: React.MouseEvent) => {
        e.stopPropagation();
        onExpand?.(LineageDirection.Downstream);
    };

    const handleCollapseDownstream = (e: React.MouseEvent) => {
        e.stopPropagation();
        onCollapse?.(LineageDirection.Downstream);
    };

    return (
        <>
            {/* Upstream buttons (left side) */}
            {canExpandUpstream && (
                hasUpstreamConnections ? (
                    upstreamHidden ? (
                        <button
                            className="lineage-expand-button upstream"
                            onClick={handleExpandUpstream}
                            title="Show upstream datasets"
                        >
                            <PlusIcon />
                        </button>
                    ) : (
                        <button
                            className="lineage-collapse-button upstream"
                            onClick={handleCollapseUpstream}
                            title="Hide upstream datasets"
                        >
                            <MinusIcon />
                        </button>
                    )
                ) : (
                    <button
                        className="lineage-expand-button upstream"
                        onClick={handleExpandUpstream}
                        title="Expand upstream datasets"
                    >
                        <PlusIcon />
                    </button>
                )
            )}

            {/* Downstream buttons (right side) */}
            {canExpandDownstream && (
                hasDownstreamConnections ? (
                    downstreamHidden ? (
                        <button
                            className="lineage-expand-button downstream"
                            onClick={handleExpandDownstream}
                            title="Show downstream datasets"
                        >
                            <PlusIcon />
                        </button>
                    ) : (
                        <button
                            className="lineage-collapse-button downstream"
                            onClick={handleCollapseDownstream}
                            title="Hide downstream datasets"
                        >
                            <MinusIcon />
                        </button>
                    )
                ) : (
                    <button
                        className="lineage-expand-button downstream"
                        onClick={handleExpandDownstream}
                        title="Expand downstream datasets"
                    >
                        <PlusIcon />
                    </button>
                )
            )}
        </>
    );
};

export default ExpandCollapseButtons;