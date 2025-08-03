/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import React from 'react';
import { Handle, NodeProps, Position } from 'reactflow';
import { LineageNodeData } from './LineageViewer';

const LineageNode: React.FC<NodeProps<LineageNodeData>> = ({ data }) => {
    if (!data) return null;

    const { entity, isCenter, isUpstream, isDownstream } = data;

    // Determine node styling based on type and position
    const getNodeClass = () => {
        let baseClass = 'lineage-node';
        
        if (isCenter) {
            baseClass += ' center-node';
        } else if (isUpstream) {
            baseClass += ' upstream-node';
        } else if (isDownstream) {
            baseClass += ' downstream-node';
        }

        if (entity.deleted) {
            baseClass += ' deleted-node';
        }

        return baseClass;
    };

    // Get entity type icon
    const getEntityIcon = (entityType: string) => {
        switch (entityType.toLowerCase()) {
            case 'table':
                return '🗂️';
            case 'pipeline':
                return '⚙️';
            case 'dashboard':
                return '📊';
            case 'topic':
                return '📨';
            case 'mlmodel':
                return '🤖';
            case 'container':
                return '📦';
            case 'searchindex':
                return '🔍';
            default:
                return '📄';
        }
    };

    // Format entity name for display
    const getDisplayName = () => {
        return entity.displayName || entity.name || entity.fullyQualifiedName.split('.').pop() || 'Unknown';
    };

    // Get service name from FQN
    const getServiceName = () => {
        const parts = entity.fullyQualifiedName.split('.');
        return parts.length > 1 ? parts[0] : '';
    };

    return (
        <div className={getNodeClass()}>
            {/* Input handle for upstream connections */}
            <Handle
                type="target"
                position={Position.Left}
                style={{
                    background: 'var(--vscode-terminal-ansiBlue)',
                    width: 10,
                    height: 10,
                }}
            />

            {/* Node content */}
            <div className="node-header">
                <span className="entity-icon">
                    {getEntityIcon(entity.type)}
                </span>
                <span className="entity-type">
                    {entity.type.toUpperCase()}
                </span>
            </div>

            <div className="node-body">
                <div className="entity-name" title={entity.fullyQualifiedName}>
                    {getDisplayName()}
                </div>
                
                {getServiceName() && (
                    <div className="service-name">
                        {getServiceName()}
                    </div>
                )}

                {entity.description && (
                    <div className="entity-description" title={entity.description}>
                        {entity.description.length > 60 
                            ? `${entity.description.substring(0, 60)}...` 
                            : entity.description
                        }
                    </div>
                )}
            </div>

            {isCenter && (
                <div className="center-indicator">
                    <span>📍</span>
                </div>
            )}

            {/* Output handle for downstream connections */}
            <Handle
                type="source"
                position={Position.Right}
                style={{
                    background: 'var(--vscode-terminal-ansiBlue)',
                    width: 10,
                    height: 10,
                }}
            />
        </div>
    );
};

export default LineageNode;