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
    isCenter?: boolean;
    isUpstream?: boolean;
    isDownstream?: boolean;
    onExpand?: (direction: LineageDirection) => void;
    onCollapse?: (direction: LineageDirection) => void;
}

// Plus icon for expand (Bold and visible)
const PlusIcon: React.FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6v-2z" stroke="currentColor" strokeWidth="0.5"/>
    </svg>
);

// Minus icon for collapse (Bold and visible)  
const MinusIcon: React.FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 11H5v2h14v-2z" stroke="currentColor" strokeWidth="0.5"/>
    </svg>
);

const ExpandCollapseButtons: React.FC<ExpandCollapseButtonsProps> = ({
    hasUpstreamConnections = false,
    hasDownstreamConnections = false,
    upstreamHidden = false,
    downstreamHidden = false,
    canExpandUpstream = false,
    canExpandDownstream = false,
    isCenter = false,
    isUpstream = false,
    isDownstream = false,
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
                        // Only center nodes can collapse upstream connections
                        // Downstream nodes should not disconnect from their parents
                        isCenter ? (
                            <button
                                className="lineage-collapse-button upstream"
                                onClick={handleCollapseUpstream}
                                title="Hide upstream datasets"
                            >
                                <MinusIcon />
                            </button>
                        ) : (
                            // Empty circle for downstream nodes - they can't collapse upstream
                            <div className="lineage-button-placeholder upstream" />
                        )
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