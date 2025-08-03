/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 */

export interface EntityReference {
    id: string;
    type: string;
    name: string;
    fullyQualifiedName: string;
    description?: string;
    displayName?: string;
    deleted?: boolean;
}

export interface EdgeDetails {
    fromEntity: {
        id: string;
        type: string;
        fullyQualifiedName?: string;
    };
    toEntity: {
        id: string;
        type: string;
        fullyQualifiedName?: string;
    };
    pipeline?: EntityReference;
    source?: string;
    sqlQuery?: string;
    description?: string;
}

export interface NodeData {
    entity: EntityReference;
    paging?: {
        entityDownstreamCount?: number;
        entityUpstreamCount?: number;
    };
}

export interface LineageData {
    nodes: Record<string, NodeData>;
    downstreamEdges: Record<string, EdgeDetails>;
    upstreamEdges: Record<string, EdgeDetails>;
}

export interface LineageConfig {
    upstreamDepth?: number;
    downstreamDepth?: number;
    nodesPerLayer?: number;
}

export class LineageService {
    private baseURL: string;
    private authToken: string;

    constructor(baseURL: string, authToken: string) {
        this.baseURL = baseURL.replace(/\/$/, ''); // Remove trailing slash
        this.authToken = authToken;
    }

    private getAuthHeaders(): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        return headers;
    }

    /**
     * Fetch lineage data for a specific entity
     */
    async getLineageData(
        fqn: string,
        entityType: string,
        config?: LineageConfig
    ): Promise<LineageData> {
        const { upstreamDepth = 1, downstreamDepth = 1, nodesPerLayer = 50 } = config || {};

        try {
            const params = new URLSearchParams({
                fqn: fqn,
                type: entityType,
                // OpenMetadata API expects upstreamDepth to be n-1 for n levels
                upstreamDepth: upstreamDepth === 0 ? '0' : (upstreamDepth - 1).toString(),
                downstreamDepth: downstreamDepth.toString(),
                includeDeleted: 'false',
                size: nodesPerLayer.toString(),
            });

            const response = await fetch(
                `${this.baseURL}/api/v1/lineage/getLineage?${params}`,
                {
                    method: 'GET',
                    headers: this.getAuthHeaders(),
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch lineage data: HTTP ${response.status}: ${response.statusText}`);
            }

            const data: LineageData = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching lineage data:', error);
            throw error;
        }
    }

    /**
     * Get lineage data in a specific direction only
     */
    async getDirectionalLineage(
        fqn: string,
        entityType: string = 'table',
        upstreamDepth: number = 0,
        downstreamDepth: number = 0
    ): Promise<{
        nodes: EntityReference[];
        edges: EdgeDetails[];
        centerNode: EntityReference;
    }> {
        try {
            const lineageData = await this.getLineageData(fqn, entityType, {
                upstreamDepth,
                downstreamDepth,
            });

            // Extract nodes from the lineage data
            const nodes: EntityReference[] = Object.values(lineageData.nodes).map(nodeData => nodeData.entity);
            
            // Find the center node (the one we requested lineage for)
            const centerNode = nodes.find(node => node.fullyQualifiedName === fqn);
            
            if (!centerNode) {
                throw new Error(`Center node not found for FQN: ${fqn}`);
            }

            // Combine upstream and downstream edges
            const allEdges: EdgeDetails[] = [];
            
            // Add upstream edges if requested
            if (upstreamDepth > 0 && lineageData.upstreamEdges) {
                allEdges.push(...lineageData.upstreamEdges);
            }
            
            // Add downstream edges if requested
            if (downstreamDepth > 0 && lineageData.downstreamEdges) {
                allEdges.push(...lineageData.downstreamEdges);
            }

            return {
                nodes,
                edges: allEdges,
                centerNode
            };

        } catch (error) {
            console.error('Error getting directional lineage:', error);
            throw error;
        }
    }

    /**
     * Get simplified lineage data with just the essential information
     */
    async getSimpleLineage(
        fqn: string,
        entityType: string = 'table',
        depth: number = 2
    ): Promise<{
        nodes: EntityReference[];
        edges: EdgeDetails[];
        centerNode: EntityReference;
    }> {
        try {
            const lineageData = await this.getLineageData(fqn, entityType, {
                upstreamDepth: depth,
                downstreamDepth: depth,
            });

            // Extract nodes from the lineage data
            const nodes: EntityReference[] = Object.values(lineageData.nodes).map(nodeData => nodeData.entity);
            
            // Find the center node (the one we requested lineage for)
            const centerNode = nodes.find(node => node.fullyQualifiedName === fqn);
            
            if (!centerNode) {
                throw new Error(`Center node not found for FQN: ${fqn}`);
            }

            // Combine upstream and downstream edges
            const edges: EdgeDetails[] = [
                ...Object.values(lineageData.upstreamEdges),
                ...Object.values(lineageData.downstreamEdges),
            ];

            return {
                nodes,
                edges,
                centerNode,
            };
        } catch (error) {
            console.error('Error getting simple lineage:', error);
            throw error;
        }
    }

    /**
     * Check if lineage data is available for an entity
     */
    async hasLineage(fqn: string, entityType: string = 'table'): Promise<boolean> {
        try {
            const lineageData = await this.getLineageData(fqn, entityType, {
                upstreamDepth: 1,
                downstreamDepth: 1,
            });

            const hasUpstream = Object.keys(lineageData.upstreamEdges).length > 0;
            const hasDownstream = Object.keys(lineageData.downstreamEdges).length > 0;
            
            return hasUpstream || hasDownstream;
        } catch (error) {
            console.error('Error checking lineage availability:', error);
            return false;
        }
    }
}