/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Minimalist design inspired by OpenMetadata's clean lineage nodes
 * https://github.com/open-metadata/OpenMetadata/blob/main/openmetadata-ui/src/main/resources/ui/src/components/Entity/EntityLineage/
 */

import React, { useMemo } from 'react';
import { Handle, NodeProps, Position } from 'reactflow';
import ExpandCollapseButtons from './ExpandCollapseButtons';
import { LineageNodeData } from './LineageViewer';

const LineageNode: React.FC<NodeProps<LineageNodeData>> = ({ data }) => {
    if (!data || !data.entity) return null;

    const { entity, isCenter, onExpand, onCollapse } = data;

    // Get breadcrumb path - simplified version
    const getBreadcrumbPath = useMemo(() => {
        if (!entity.fullyQualifiedName) return '';
        
        const parts = entity.fullyQualifiedName.split('.');
        if (parts.length <= 1) return '';
        
        // Show service.database.schema format
        return parts.slice(0, -1).join(' / ');
    }, [entity.fullyQualifiedName]);

    // Get display name (table name)
    const getDisplayName = () => {
        if (entity.displayName) return entity.displayName;
        if (entity.name) return entity.name;
        if (entity.fullyQualifiedName) {
            const parts = entity.fullyQualifiedName.split('.');
            return parts.pop() || 'Unknown';
        }
        return 'Unknown';
    };

    // OpenMetadata-style entity icon - sized to match their design
    const getEntityIcon = () => {
        return (
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3h18a1 1 0 011 1v16a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1zm1 2v2h16V5H4zm0 4v2h16V9H4zm0 4v2h16v-2H4zm0 4v2h16v-2H4z"/>
            </svg>
        );
    };

    return (
        <div className={`lineage-node-minimal ${isCenter ? 'center-node' : ''}`}>
            {/* Connection Handles - styled as visible connection dots */}
            <Handle
                type="target"
                position={Position.Left}
                className="connection-handle connection-handle-left"
                isConnectable={true}
            />
            <Handle
                type="source"
                position={Position.Right}
                className="connection-handle connection-handle-right"
                isConnectable={true}
            />

            {/* Minimalist node content */}
            <div className="node-content">
                {/* Breadcrumb path */}
                {getBreadcrumbPath && (
                    <div className="node-breadcrumb" title={entity.fullyQualifiedName}>
                        {getBreadcrumbPath}
                    </div>
                )}
                
                {/* Table info */}
                <div className="node-main">
                    <div className="node-icon">
                        {getEntityIcon()}
                    </div>
                    <div className="node-name" title={entity.fullyQualifiedName}>
                        {getDisplayName()}
                    </div>
                </div>
            </div>

            {/* Expand/Collapse Buttons */}
            <ExpandCollapseButtons
                hasUpstreamConnections={data.hasUpstreamConnections || false}
                hasDownstreamConnections={data.hasDownstreamConnections || false}
                upstreamHidden={data.upstreamHidden || false}
                downstreamHidden={data.downstreamHidden || false}
                canExpandUpstream={data.canExpandUpstream || false}
                canExpandDownstream={data.canExpandDownstream || false}
                isCenter={data.isCenter || false}
                isUpstream={data.isUpstream || false}
                isDownstream={data.isDownstream || false}
                onExpand={(direction) => onExpand?.(entity, direction)}
                onCollapse={(direction) => onCollapse?.(entity, direction)}
            />
        </div>
    );
};

export default LineageNode;