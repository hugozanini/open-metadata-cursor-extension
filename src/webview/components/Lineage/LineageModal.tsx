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
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [tableFqn]);

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

    if (!isOpen) return null;

    return (
        <div className="lineage-modal-backdrop" onClick={handleBackdropClick}>
            <div className="lineage-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="lineage-modal-header">
                    <div className="lineage-modal-title">
                        <span className="lineage-icon">🔗</span>
                        <h2>Data Lineage: {tableName}</h2>
                    </div>
                    <button 
                        className="lineage-modal-close" 
                        onClick={onClose}
                        aria-label="Close lineage modal"
                    >
                        ×
                    </button>
                </div>

                <div className="lineage-modal-body">
                    {loading && (
                        <div className="lineage-loading">
                            <div className="loading-spinner"></div>
                            <p>Loading lineage data...</p>
                        </div>
                    )}

                    {error && (
                        <div className="lineage-error">
                            <div className="error-icon">⚠️</div>
                            <div className="error-content">
                                <h3>Failed to Load Lineage</h3>
                                <p>{error}</p>
                                <button 
                                    className="retry-button" 
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
                        />
                    )}

                    {!loading && !error && !lineageData && (
                        <div className="lineage-empty">
                            <div className="empty-icon">📄</div>
                            <h3>No Lineage Data</h3>
                            <p>This table doesn't have any upstream or downstream connections.</p>
                        </div>
                    )}
                </div>

                <div className="lineage-modal-footer">
                    <div className="lineage-legend">
                        <div className="legend-item">
                            <span className="legend-color center"></span>
                            <span>Current Table</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-color upstream"></span>
                            <span>Upstream Sources</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-color downstream"></span>
                            <span>Downstream Targets</span>
                        </div>
                    </div>
                    <div className="lineage-actions">
                        <button className="secondary-button" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LineageModal;