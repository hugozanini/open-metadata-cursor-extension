/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
    Background,
    ConnectionMode,
    Controls,
    Edge,
    MarkerType,
    MiniMap,
    Node,
    Position,
    ReactFlowInstance,
    useEdgesState,
    useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { EdgeDetails, EntityReference } from '../../../services/LineageService';
import CustomEdge from './CustomEdge';
import LineageNode from './LineageNode';
import { layoutNodes } from './LineageUtils';

// Custom node and edge types for ReactFlow
const nodeTypes = {
    lineageNode: LineageNode,
};

const edgeTypes = {
    customEdge: CustomEdge,
};

export interface LineageViewerProps {
    nodes: EntityReference[];
    edges: EdgeDetails[];
    centerNodeFqn: string;
    loading?: boolean;
    onNodeClick?: (node: EntityReference) => void;
    onClose?: () => void;
}

export interface LineageNodeData {
    entity: EntityReference;
    isCenter: boolean;
    isUpstream: boolean;
    isDownstream: boolean;
}

const LineageViewer: React.FC<LineageViewerProps> = ({
    nodes,
    edges,
    centerNodeFqn,
    loading = false,
    onNodeClick,
    onClose,
}) => {
    const [reactFlowNodes, setReactFlowNodes, onNodesChange] = useNodesState<LineageNodeData>([]);
    const [reactFlowEdges, setReactFlowEdges, onEdgesChange] = useEdgesState([]);
    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

    // Transform OpenMetadata lineage data to ReactFlow format
    const transformToReactFlowData = useCallback(() => {
        if (!nodes.length) return;

        // Find center node and classify others as upstream/downstream
        const centerNode = nodes.find(node => node.fullyQualifiedName === centerNodeFqn);
        if (!centerNode) return;

        // Create a map of downstream connections (what this node feeds into)
        const downstreamMap = new Set<string>();
        const upstreamMap = new Set<string>();

        edges.forEach(edge => {
            downstreamMap.add(edge.toEntity.fullyQualifiedName || edge.toEntity.id);
            upstreamMap.add(edge.fromEntity.fullyQualifiedName || edge.fromEntity.id);
        });

        // Transform nodes
        const flowNodes: Node<LineageNodeData>[] = nodes.map((node, index) => {
            const isCenter = node.fullyQualifiedName === centerNodeFqn;
            const isDownstream = downstreamMap.has(node.fullyQualifiedName);
            const isUpstream = upstreamMap.has(node.fullyQualifiedName);

            return {
                id: node.id,
                type: 'lineageNode',
                position: { x: index * 250, y: index * 150 }, // Temporary positioning
                data: {
                    entity: node,
                    isCenter,
                    isUpstream: !isCenter && isUpstream,
                    isDownstream: !isCenter && isDownstream,
                },
                sourcePosition: Position.Right,
                targetPosition: Position.Left,
            };
        });

        // Transform edges
        const flowEdges: Edge[] = edges.map((edge, index) => {
            const sourceNodeId = nodes.find(n => 
                n.fullyQualifiedName === edge.fromEntity.fullyQualifiedName || 
                n.id === edge.fromEntity.id
            )?.id;

            const targetNodeId = nodes.find(n => 
                n.fullyQualifiedName === edge.toEntity.fullyQualifiedName || 
                n.id === edge.toEntity.id
            )?.id;

            if (!sourceNodeId || !targetNodeId) return null;

            return {
                id: `edge-${index}`,
                source: sourceNodeId,
                target: targetNodeId,
                type: 'customEdge', // Use our custom curved edge
                animated: false,
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    width: 15,
                    height: 15,
                    color: 'var(--vscode-panel-border)',
                },
                style: {
                    stroke: 'var(--vscode-panel-border)',
                    strokeWidth: 1.5,
                },
                // No label - clean edges like OpenMetadata
            };
        }).filter(Boolean) as Edge[];

        // Apply automatic layout
        layoutNodes(flowNodes, flowEdges).then(layoutedNodes => {
            setReactFlowNodes(layoutedNodes);
            setReactFlowEdges(flowEdges);
        });

    }, [nodes, edges, centerNodeFqn, setReactFlowNodes, setReactFlowEdges]);

    // Transform data when props change
    useEffect(() => {
        transformToReactFlowData();
    }, [transformToReactFlowData]);

    // Handle ReactFlow initialization
    const onInit = useCallback(
        (instance: ReactFlowInstance) => {
            setReactFlowInstance(instance);
            // OpenMetadata-style fitView - simple and effective
            setTimeout(() => {
                instance.fitView({ 
                    padding: 50, // Smaller padding like OpenMetadata
                    minZoom: 0.1, // OpenMetadata's MIN_ZOOM_VALUE
                    maxZoom: 2.5, // OpenMetadata's MAX_ZOOM_VALUE
                });
                // Then zoom to a comfortable viewing level
                setTimeout(() => {
                    instance.zoomTo(0.65); // OpenMetadata's ZOOM_VALUE
                }, 100);
            }, 200);
        },
        []
    );

    // Handle node clicks
    const handleNodeClick = useCallback(
        (event: React.MouseEvent, node: Node<LineageNodeData>) => {
            event.stopPropagation();
            if (onNodeClick && node.data) {
                onNodeClick(node.data.entity);
            }
        },
        [onNodeClick]
    );

    if (loading) {
        return (
            <div className="lineage-viewer loading">
                <div className="loading-content">
                    <div className="loading-spinner"></div>
                    <p>Loading lineage data...</p>
                </div>
            </div>
        );
    }

    if (!nodes.length) {
        return (
            <div className="lineage-viewer empty">
                <div className="empty-content">
                    <p>No lineage data available for this table.</p>
                    {onClose && (
                        <button className="close-button" onClick={onClose}>
                            Close
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="lineage-viewer">
            {onClose && (
                <div className="lineage-header">
                    <h3>🔗 Data Lineage</h3>
                    <button className="close-button" onClick={onClose}>
                        ×
                    </button>
                </div>
            )}
            <div className="reactflow-wrapper">
                <ReactFlow
                    nodes={reactFlowNodes}
                    edges={reactFlowEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onInit={onInit}
                    onNodeClick={handleNodeClick}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    connectionMode={ConnectionMode.Strict}
                    fitView
                    fitViewOptions={{ 
                        padding: 50, 
                        minZoom: 0.1,
                        maxZoom: 2.5,
                    }}
                    attributionPosition="top-right"
                >
                    <Controls />
                    <MiniMap 
                        nodeStrokeColor="var(--vscode-panel-border)"
                        nodeColor="var(--vscode-editor-background)"
                        maskColor="rgba(0, 0, 0, 0.1)"
                    />
                    <Background gap={12} size={1} />
                </ReactFlow>
            </div>
        </div>
    );
};

export default LineageViewer;