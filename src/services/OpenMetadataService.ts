import * as vscode from 'vscode';

export interface TableResult {
    id: string;
    name: string;
    fullyQualifiedName: string;
    description?: string;
    tableType?: string;
    columns?: any[];
    rowCount?: number;
    database?: string;
    schema?: string;
    updatedAt?: string;
    tags?: string[];
}

export class OpenMetadataService {
    private baseUrl: string;

    constructor() {
        const config = vscode.workspace.getConfiguration('openmetadataExplorer');
        this.baseUrl = config.get<string>('openmetadataUrl') || 'http://localhost:8585';
    }

    async search(query: string): Promise<TableResult[]> {
        try {
            console.log(`Searching OpenMetadata for: ${query}`);
            
            // First, try the search API
            const searchUrl = `${this.baseUrl}/api/v1/search/query?q=${encodeURIComponent(query)}&index=table_search_index&size=20`;
            
            const response = await fetch(searchUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // Note: Add authentication headers here if your OpenMetadata requires auth
                    // 'Authorization': 'Bearer token'
                }
            });

            if (!response.ok) {
                // If search fails, try to get all tables and filter locally
                console.log('Search API failed, trying to get all tables...');
                return await this.getAllTablesFiltered(query);
            }

            const data = await response.json();
            console.log('OpenMetadata search response:', data);

            // Transform the search results
            const results: TableResult[] = [];
            
            if (data.hits?.hits) {
                for (const hit of data.hits.hits) {
                    const source = hit._source;
                    results.push({
                        id: source.id || hit._id,
                        name: source.name || source.displayName || 'Unknown',
                        fullyQualifiedName: source.fullyQualifiedName || source.name,
                        description: source.description,
                        tableType: source.tableType,
                        columns: source.columns,
                        rowCount: source.rowCount,
                        database: source.database?.name,
                        schema: source.databaseSchema?.name,
                        updatedAt: source.updatedAt,
                        tags: source.tags?.map((tag: any) => tag.tagFQN || tag.name) || []
                    });
                }
            }

            console.log(`Found ${results.length} results`);
            return results;

        } catch (error) {
            console.error('Error searching OpenMetadata:', error);
            
            // Fallback: try to get some sample tables
            try {
                return await this.getAllTablesFiltered(query);
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
                throw new Error(`Failed to search OpenMetadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    }

    private async getAllTablesFiltered(query: string): Promise<TableResult[]> {
        try {
            console.log('Fetching all tables as fallback...');
            
            const tablesUrl = `${this.baseUrl}/api/v1/tables?limit=50`;
            const response = await fetch(tablesUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('All tables response:', data);

            let tables = data.data || [];
            
            // Filter tables based on query
            if (query && query.trim()) {
                const queryLower = query.toLowerCase();
                tables = tables.filter((table: any) => 
                    table.name?.toLowerCase().includes(queryLower) ||
                    table.description?.toLowerCase().includes(queryLower) ||
                    table.fullyQualifiedName?.toLowerCase().includes(queryLower)
                );
            }

            // Transform to our format
            const results: TableResult[] = tables.map((table: any) => ({
                id: table.id,
                name: table.name,
                fullyQualifiedName: table.fullyQualifiedName,
                description: table.description,
                tableType: table.tableType,
                columns: table.columns,
                rowCount: table.rowCount,
                database: table.database?.name,
                schema: table.databaseSchema?.name,
                updatedAt: table.updatedAt,
                tags: table.tags?.map((tag: any) => tag.tagFQN || tag.name) || []
            }));

            console.log(`Filtered to ${results.length} tables`);
            return results;

        } catch (error) {
            console.error('Error fetching all tables:', error);
            throw error;
        }
    }

    async getTableDetails(tableId: string): Promise<TableResult | null> {
        try {
            const url = `${this.baseUrl}/api/v1/tables/${tableId}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const table = await response.json();
            
            return {
                id: table.id,
                name: table.name,
                fullyQualifiedName: table.fullyQualifiedName,
                description: table.description,
                tableType: table.tableType,
                columns: table.columns,
                rowCount: table.rowCount,
                database: table.database?.name,
                schema: table.databaseSchema?.name,
                updatedAt: table.updatedAt,
                tags: table.tags?.map((tag: any) => tag.tagFQN || tag.name) || []
            };

        } catch (error) {
            console.error(`Error fetching table ${tableId}:`, error);
            return null;
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/system/version`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            return response.ok;
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }
}