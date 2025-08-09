/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EntityReference } from '../../../services/LineageService';
import LineageViewer from './LineageViewer';

// Use the global VS Code API instance from App.tsx
declare global {
    interface Window {
        vscodeApi?: any;
    }
}

export interface LineageModalProps {
    tableFqn: string;
    tableName: string;
    isOpen: boolean;
    onClose: () => void;
}

const LineageModal: React.FC<LineageModalProps> = ({
    tableFqn,
    tableName,
    isOpen,
    onClose,
}) => {
    // Use the global VS Code API instance
    const vscode = window.vscodeApi;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lineageData, setLineageData] = useState<{
        nodes: EntityReference[];
        edges: any[];
        centerNode: EntityReference;
    } | null>(null);

    // Handle merging expanded lineage data with existing data
    const handleExpandedLineageData = useCallback((expandedData: any, nodeId: string, direction: string) => {
        if (!lineageData || !expandedData.nodes.length) {
            console.log('No additional lineage data found for node:', nodeId);
            return;
        }

        // Merge nodes (avoid duplicates)
        const existingNodeIds = new Set(lineageData.nodes.map(n => n.id));
        const newNodes = expandedData.nodes.filter((node: any) => !existingNodeIds.has(node.id));
        
        // Merge edges (avoid duplicates)
        const existingEdgeKeys = new Set(lineageData.edges.map((e: any) => 
            `${e.fromEntity.id}-${e.toEntity.id}`
        ));
        const newEdges = expandedData.edges.filter((edge: any) => 
            !existingEdgeKeys.has(`${edge.fromEntity.id}-${edge.toEntity.id}`)
        );

        // Update lineage data with merged data
        setLineageData({
            ...lineageData,
            nodes: [...lineageData.nodes, ...newNodes],
            edges: [...lineageData.edges, ...newEdges]
        });

        console.log(`Merged ${newNodes.length} new nodes and ${newEdges.length} new edges`);
    }, [lineageData]);

    // Fetch lineage data when modal opens
    const fetchLineageData = useCallback(() => {
        if (!tableFqn || !isOpen || !vscode) return;

        console.log('Fetching lineage data for:', tableFqn);
        setLoading(true);
        setError(null);

        // Request lineage data from the extension backend  
        vscode.postMessage({
            type: 'getLineage',
            tableFqn: tableFqn,
            entityType: 'table'
        });
    }, [tableFqn, isOpen, vscode]);

    // Handle messages from the extension
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            
            // Only handle messages for this specific table
            if (message.tableFqn !== tableFqn) return;
            
            switch (message.type) {
                case 'lineageData':
                    console.log('Received lineage data:', message.lineageData);
                    setLoading(false);
                    setLineageData(message.lineageData);
                    setError(null);
                    break;
                    
                case 'lineageError':
                    console.log('Lineage error:', message.error);
                    setLoading(false);
                    setError(message.error);
                    setLineageData(null);
                    break;
                    
                case 'expandedLineageData':
                    console.log('Received expanded lineage data:', message.expandedData);
                    handleExpandedLineageData(message.expandedData, message.nodeId, message.direction);
                    break;
                    
                case 'collapsedLineage':
                    console.log('Lineage collapsed for node:', message.nodeId);
                    // The LineageViewer handles collapse state internally
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [tableFqn, handleExpandedLineageData]);

    // Load data when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchLineageData();
        } else {
            // Reset state when modal closes
            setLineageData(null);
            setError(null);
        }
    }, [isOpen, fetchLineageData]);

    // Handle escape key
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        } else {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, handleKeyDown]);

    // Handle backdrop click
    const handleBackdropClick = useCallback((event: React.MouseEvent) => {
        if (event.target === event.currentTarget) {
            onClose();
        }
    }, [onClose]);

    // Handle node click - could navigate to that table's details or lineage
    const handleNodeClick = useCallback((node: EntityReference) => {
        console.log('Clicked on node:', node);
        // Future: Could open that node's lineage or navigate to its details
        // For now, just log it
    }, []);

    // Handle expanding a node to get more lineage data
    const handleExpandNode = useCallback((nodeId: string, direction: string) => {
        if (!vscode) return;
        
        console.log('Expanding node:', nodeId, 'in direction:', direction);
        
        // Request additional lineage data from the extension backend
        vscode.postMessage({
            type: 'expandLineage',
            tableFqn: tableFqn,
            nodeId: nodeId,
            direction: direction,
            entityType: 'table'
        });
    }, [tableFqn, vscode]);

    // Handle collapsing a node
    const handleCollapseNode = useCallback((nodeId: string, direction: string) => {
        if (!vscode) return;
        
        console.log('Collapsing node:', nodeId, 'in direction:', direction);
        
        // For now, we'll handle collapse locally in the viewer
        // In the future, we might want to update the backend state too
        vscode.postMessage({
            type: 'collapseLineage',
            tableFqn: tableFqn,
            nodeId: nodeId,
            direction: direction
        });
    }, [tableFqn, vscode]);

    if (!isOpen) return null;

    return (
        <div className="lineage-modal-backdrop-compact" onClick={handleBackdropClick}>
            <div className="lineage-modal-content-compact" onClick={(e) => e.stopPropagation()}>
                <div className="lineage-modal-header-minimal">
                    <span className="lineage-title-minimal">{tableName}</span>
                    <button 
                        className="lineage-modal-close-minimal" 
                        onClick={onClose}
                        aria-label="Close lineage modal"
                    >
                        ×
                    </button>
                </div>

                <div className="lineage-modal-body-compact">
                    {loading && (
                        <div className="lineage-loading-compact">
                            <div className="loading-spinner-compact"></div>
                            <span>Loading lineage data...</span>
                        </div>
                    )}

                    {error && (
                        <div className="lineage-error-compact">
                            <span className="error-icon-compact">⚠️</span>
                            <div className="error-content-compact">
                                <div className="error-title">Failed to Load Lineage</div>
                                <div className="error-message">{error}</div>
                                <button 
                                    className="retry-button-compact" 
                                    onClick={fetchLineageData}
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    )}

                    {!loading && !error && lineageData && (
                        <LineageViewer
                            nodes={lineageData.nodes}
                            edges={lineageData.edges}
                            centerNodeFqn={tableFqn}
                            onNodeClick={handleNodeClick}
                            onExpandNode={handleExpandNode}
                            onCollapseNode={handleCollapseNode}
                        />
                    )}

                    {!loading && !error && !lineageData && (
                        <div className="lineage-empty-compact">
                            <span className="empty-icon-compact">📄</span>
                            <div className="empty-content-compact">
                                <div className="empty-title">No Lineage Data</div>
                                <div className="empty-message">This table doesn't have any upstream or downstream connections.</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LineageModal;