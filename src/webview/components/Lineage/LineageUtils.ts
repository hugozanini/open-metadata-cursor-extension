/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import ELK, { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk.bundled.js';
import { Edge, Node } from 'reactflow';
import { LineageNodeData } from './LineageViewer';

// Initialize ELK layout engine
const elk = new ELK();

// Layout configuration - matching OpenMetadata's exact ELK settings
// Reference: https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-mrtree.html
const ELK_OPTIONS = {
    'elk.algorithm': 'mrtree', // Multi-Root Tree algorithm like OpenMetadata
    'elk.direction': 'RIGHT',
    'elk.layered.spacing.edgeNodeBetweenLayers': '50',
    'elk.spacing.nodeNode': '100',
    'elk.layered.nodePlacement.strategy': 'SIMPLE',
};

// Node dimensions - matching our slimmer design
export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 60; // Updated to match CSS

/**
 * Apply automatic layout to nodes and edges using ELK
 */
export async function layoutNodes(
    nodes: Node<LineageNodeData>[],
    edges: Edge[]
): Promise<Node<LineageNodeData>[]> {
    if (!nodes.length) return nodes;

    try {
        // Build ELK graph structure
        const elkGraph: ElkNode = {
            id: 'root',
            layoutOptions: ELK_OPTIONS,
            children: nodes.map(node => ({
                id: node.id,
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
                // Add minimal extra height for center nodes to maintain slim design
                ...(node.data?.isCenter && { height: NODE_HEIGHT + 10 }),
            })),
            edges: edges.map(edge => ({
                id: edge.id,
                sources: [edge.source],
                targets: [edge.target],
            })) as ElkExtendedEdge[],
        };

        // Apply layout
        const layoutedGraph = await elk.layout(elkGraph);
        
        // Transform back to ReactFlow nodes with positions
        const layoutedNodes = nodes.map(node => {
            const elkNode = layoutedGraph.children?.find(n => n.id === node.id);
            
            if (elkNode) {
                return {
                    ...node,
                    position: {
                        x: elkNode.x || 0,
                        y: elkNode.y || 0,
                    },
                };
            }
            
            return node;
        });

        return layoutedNodes;
    } catch (error) {
        console.error('Error during ELK layout:', error);
        // Fallback to simple positioning if ELK fails
        return layoutNodesFallback(nodes);
    }
}

/**
 * Fallback layout when ELK fails - simple hierarchical positioning
 */
function layoutNodesFallback(nodes: Node<LineageNodeData>[]): Node<LineageNodeData>[] {
    const centerNode = nodes.find(node => node.data?.isCenter);
    const upstreamNodes = nodes.filter(node => node.data?.isUpstream);
    const downstreamNodes = nodes.filter(node => node.data?.isDownstream);
    
    const layoutedNodes = [...nodes];
    
    // Simplified fallback positioning - let mrtree algorithm handle most of the work
    const allNodes = nodes.length;
    const spacing = NODE_HEIGHT + 100;
    
    // Position center node
    if (centerNode) {
        const centerIndex = layoutedNodes.findIndex(n => n.id === centerNode.id);
        if (centerIndex !== -1) {
            layoutedNodes[centerIndex] = {
                ...centerNode,
                position: { x: 400, y: 200 },
            };
        }
    }
    
    // Position upstream nodes (left side)
    upstreamNodes.forEach((node, index) => {
        const nodeIndex = layoutedNodes.findIndex(n => n.id === node.id);
        if (nodeIndex !== -1) {
            layoutedNodes[nodeIndex] = {
                ...node,
                position: {
                    x: 50,
                    y: 50 + index * spacing,
                },
            };
        }
    });
    
    // Position downstream nodes (right side)
    downstreamNodes.forEach((node, index) => {
        const nodeIndex = layoutedNodes.findIndex(n => n.id === node.id);
        if (nodeIndex !== -1) {
            layoutedNodes[nodeIndex] = {
                ...node,
                position: {
                    x: 750,
                    y: 50 + index * spacing,
                },
            };
        }
    });
    
    return layoutedNodes;
}

/**
 * Get the bounding box of all nodes for fitting view
 */
export function getNodesBounds(nodes: Node[]): { x: number; y: number; width: number; height: number } {
    if (!nodes.length) {
        return { x: 0, y: 0, width: 0, height: 0 };
    }
    
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    nodes.forEach(node => {
        const x = node.position.x;
        const y = node.position.y;
        const width = NODE_WIDTH;
        const height = NODE_HEIGHT;
        
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
    });
    
    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
    };
}

/**
 * Calculate optimal zoom level for fitting all nodes
 */
export function calculateFitViewZoom(
    bounds: { width: number; height: number },
    containerSize: { width: number; height: number },
    padding: number = 50
): number {
    const availableWidth = containerSize.width - padding * 2;
    const availableHeight = containerSize.height - padding * 2;
    
    const scaleX = availableWidth / bounds.width;
    const scaleY = availableHeight / bounds.height;
    
    return Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%
}