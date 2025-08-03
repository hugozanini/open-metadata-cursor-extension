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
import LayersPanel from './LayersPanel';
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
    onExpandNode?: (nodeId: string, direction: string) => void;
    onCollapseNode?: (nodeId: string, direction: string) => void;
}

export interface LineageNodeData {
    entity: EntityReference;
    isCenter: boolean;
    isUpstream: boolean;
    isDownstream: boolean;
    hasUpstreamConnections?: boolean;
    hasDownstreamConnections?: boolean;
    upstreamHidden?: boolean;
    downstreamHidden?: boolean;
    canExpandUpstream?: boolean;
    canExpandDownstream?: boolean;
    onExpand?: (entity: EntityReference, direction: string) => void;
    onCollapse?: (entity: EntityReference, direction: string) => void;
}

const LineageViewer: React.FC<LineageViewerProps> = ({
    nodes,
    edges,
    centerNodeFqn,
    loading = false,
    onNodeClick,
    onClose,
    onExpandNode,
    onCollapseNode,
}) => {
    const [reactFlowNodes, setReactFlowNodes, onNodesChange] = useNodesState<LineageNodeData>([]);
    const [reactFlowEdges, setReactFlowEdges, onEdgesChange] = useEdgesState([]);
    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
    
    // Track which connections are hidden for each direction per node
    // By default, all connections are visible (not in the hidden set)
    const [upstreamHidden, setUpstreamHidden] = useState<Set<string>>(new Set());
    const [downstreamHidden, setDownstreamHidden] = useState<Set<string>>(new Set());

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

        // Determine which nodes should be completely hidden (removed from canvas)
        const getHiddenNodes = () => {
            const hiddenNodeIds = new Set<string>();
            
            // For each node that has collapsed connections, hide all connected nodes in that direction
            upstreamHidden.forEach(nodeId => {
                // Find all upstream nodes connected to this node and hide them
                edges.forEach(edge => {
                    const targetId = edge.toEntity.fullyQualifiedName || edge.toEntity.id;
                    if (targetId === nodeId) {
                        const sourceId = edge.fromEntity.fullyQualifiedName || edge.fromEntity.id;
                        hiddenNodeIds.add(sourceId);
                        
                        // Recursively hide upstream nodes of hidden nodes
                        const addUpstreamRecursively = (currentId: string) => {
                            edges.forEach(e => {
                                const tId = e.toEntity.fullyQualifiedName || e.toEntity.id;
                                if (tId === currentId) {
                                    const sId = e.fromEntity.fullyQualifiedName || e.fromEntity.id;
                                    if (!hiddenNodeIds.has(sId)) {
                                        hiddenNodeIds.add(sId);
                                        addUpstreamRecursively(sId);
                                    }
                                }
                            });
                        };
                        addUpstreamRecursively(sourceId);
                    }
                });
            });
            
            downstreamHidden.forEach(nodeId => {
                // Find all downstream nodes connected to this node and hide them
                edges.forEach(edge => {
                    const sourceId = edge.fromEntity.fullyQualifiedName || edge.fromEntity.id;
                    if (sourceId === nodeId) {
                        const targetId = edge.toEntity.fullyQualifiedName || edge.toEntity.id;
                        hiddenNodeIds.add(targetId);
                        
                        // Recursively hide downstream nodes of hidden nodes
                        const addDownstreamRecursively = (currentId: string) => {
                            edges.forEach(e => {
                                const sId = e.fromEntity.fullyQualifiedName || e.fromEntity.id;
                                if (sId === currentId) {
                                    const tId = e.toEntity.fullyQualifiedName || e.toEntity.id;
                                    if (!hiddenNodeIds.has(tId)) {
                                        hiddenNodeIds.add(tId);
                                        addDownstreamRecursively(tId);
                                    }
                                }
                            });
                        };
                        addDownstreamRecursively(targetId);
                    }
                });
            });
            
            return hiddenNodeIds;
        };

        const hiddenNodeIds = getHiddenNodes();

        // Transform nodes - filter out hidden nodes
        const flowNodes: Node<LineageNodeData>[] = nodes
            .filter(node => {
                const nodeId = node.fullyQualifiedName || node.id;
                return !hiddenNodeIds.has(nodeId);
            })
            .map((node, index) => {
            const isCenter = node.fullyQualifiedName === centerNodeFqn;
            const isDownstream = downstreamMap.has(node.fullyQualifiedName);
            const isUpstream = upstreamMap.has(node.fullyQualifiedName);
            
            // Determine actual connections for this node
            const nodeId = node.fullyQualifiedName || node.id;
            const hasUpstreamConnections = edges.some(edge => 
                (edge.toEntity.fullyQualifiedName || edge.toEntity.id) === nodeId
            );
            const hasDownstreamConnections = edges.some(edge => 
                (edge.fromEntity.fullyQualifiedName || edge.fromEntity.id) === nodeId
            );
            
            // Check if connections are hidden
            const isUpstreamHidden = upstreamHidden.has(nodeId);
            const isDownstreamHidden = downstreamHidden.has(nodeId);
            
            // Determine if this node can show expand/collapse buttons in each direction
            // Show buttons if:
            // 1. Has connections in that direction (show - to collapse)
            // 2. Center node (can always try to expand in both directions)
            // 3. Non-center leaf nodes (can try to expand in their direction)
            const canExpandUpstream = isCenter || hasUpstreamConnections || (!hasUpstreamConnections && isUpstream);
            const canExpandDownstream = isCenter || hasDownstreamConnections || (!hasDownstreamConnections && isDownstream);

            return {
                id: node.id,
                type: 'lineageNode',
                position: { x: index * 250, y: index * 150 }, // Temporary positioning
                data: {
                    entity: node,
                    isCenter,
                    isUpstream: !isCenter && isUpstream,
                    isDownstream: !isCenter && isDownstream,
                    hasUpstreamConnections,
                    hasDownstreamConnections,
                    upstreamHidden: isUpstreamHidden,
                    downstreamHidden: isDownstreamHidden,
                    canExpandUpstream,
                    canExpandDownstream,
                    onExpand: handleExpand,
                    onCollapse: handleCollapse,
                },
                sourcePosition: Position.Right,
                targetPosition: Position.Left,
            };
        });

        // Transform edges - only show edges between visible nodes
        const flowEdges: Edge[] = edges.map((edge, index) => {
            const sourceNode = nodes.find(n => 
                n.fullyQualifiedName === edge.fromEntity.fullyQualifiedName || 
                n.id === edge.fromEntity.id
            );
            const targetNode = nodes.find(n => 
                n.fullyQualifiedName === edge.toEntity.fullyQualifiedName || 
                n.id === edge.toEntity.id
            );

            if (!sourceNode || !targetNode) return null;

            const sourceNodeId = sourceNode.fullyQualifiedName || sourceNode.id;
            const targetNodeId = targetNode.fullyQualifiedName || targetNode.id;

            // Hide edge if either source or target node is hidden (removed from canvas)
            if (hiddenNodeIds.has(sourceNodeId) || hiddenNodeIds.has(targetNodeId)) {
                return null;
            }

            return {
                id: `edge-${index}`,
                source: sourceNode.id,
                target: targetNode.id,
                type: 'customEdge', // Use our custom curved edge
                animated: false,
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    width: 20,
                    height: 20,
                    color: 'var(--vscode-foreground)',
                },
                style: {
                    stroke: 'var(--vscode-foreground)',
                    strokeWidth: 2,
                    opacity: 0.8,
                },
                // No label - clean edges like OpenMetadata
            };
        }).filter(Boolean) as Edge[];

        // Apply automatic layout
        layoutNodes(flowNodes, flowEdges).then(layoutedNodes => {
            setReactFlowNodes(layoutedNodes);
            setReactFlowEdges(flowEdges);
        });

    }, [nodes, edges, centerNodeFqn, upstreamHidden, downstreamHidden, setReactFlowNodes, setReactFlowEdges]);

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

    // Handle expand/collapse actions
    const handleExpand = useCallback((entity: EntityReference, direction: string) => {
        const nodeId = entity.fullyQualifiedName || entity.id;
        console.log('Expanding', direction, 'for entity:', entity.name);
        
        // Expand means show hidden connections (remove from hidden set)
        if (direction === 'upstream') {
            setUpstreamHidden(prev => {
                const newSet = new Set(prev);
                newSet.delete(nodeId);
                return newSet;
            });
        } else if (direction === 'downstream') {
            setDownstreamHidden(prev => {
                const newSet = new Set(prev);
                newSet.delete(nodeId);
                return newSet;
            });
        }
        
        // Request additional data from parent component (for potential new connections)
        onExpandNode?.(nodeId, direction);
    }, [onExpandNode]);

    const handleCollapse = useCallback((entity: EntityReference, direction: string) => {
        const nodeId = entity.fullyQualifiedName || entity.id;
        console.log('Collapsing', direction, 'for entity:', entity.name);
        
        // Collapse means hide visible connections (add to hidden set)
        if (direction === 'upstream') {
            setUpstreamHidden(prev => new Set(prev).add(nodeId));
        } else if (direction === 'downstream') {
            setDownstreamHidden(prev => new Set(prev).add(nodeId));
        }
        
        // Notify parent component
        onCollapseNode?.(nodeId, direction);
    }, [onCollapseNode]);

    // Handle layer toggle
    const handleLayerToggle = useCallback((layerType: string, enabled: boolean) => {
        console.log('Layer toggle:', layerType, enabled ? 'enabled' : 'disabled');
        // TODO: Implement actual layer filtering logic
    }, []);

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
                    <MiniMap 
                        nodeStrokeColor="var(--vscode-panel-border)"
                        nodeColor="var(--vscode-editor-background)"
                        maskColor="rgba(0, 0, 0, 0.1)"
                    />
                    <Background gap={12} size={1} />
                </ReactFlow>
                
                {/* Layers Panel */}
                <LayersPanel onLayerToggle={handleLayerToggle} />
            </div>
        </div>
    );
};

export default LineageViewer;