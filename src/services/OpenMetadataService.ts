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
    private authToken?: string;

    constructor() {
        const config = vscode.workspace.getConfiguration('openmetadataExplorer');
        this.baseUrl = config.get<string>('openmetadataUrl') || 'http://localhost:8585';
        this.authToken = config.get<string>('openmetadataAuthToken');
    }

    // Extract meaningful search terms from natural language queries
    private extractSearchTerms(query: string): string[] {
        // Remove common question words and phrases
        const stopWords = [
            'what', 'where', 'when', 'how', 'why', 'which', 'who',
            'do', 'does', 'did', 'can', 'could', 'would', 'should',
            'i', 'have', 'get', 'find', 'show', 'me', 'my', 'the', 'a', 'an',
            'is', 'are', 'was', 'were', 'about', 'for', 'with', 'in', 'on',
            'information', 'data', 'table', 'tables'
        ];

        // Extract potential data-related terms
        const dataTerms = [
            'customer', 'customers', 'user', 'users', 'client', 'clients',
            'order', 'orders', 'purchase', 'purchases', 'transaction', 'transactions',
            'product', 'products', 'item', 'items', 'inventory',
            'sale', 'sales', 'revenue', 'payment', 'payments',
            'address', 'addresses', 'location', 'locations',
            'profile', 'profiles', 'account', 'accounts',
            'metric', 'metrics', 'analytics', 'report', 'reports'
        ];

        const words = query.toLowerCase()
            .replace(/[^\w\s]/g, ' ') // Remove punctuation
            .split(/\s+/)
            .filter(word => word.length > 2);

        // Find data-related terms or use non-stop words
        const searchTerms = words.filter(word => 
            dataTerms.includes(word) || !stopWords.includes(word)
        );

        return searchTerms.length > 0 ? searchTerms : words.filter(word => !stopWords.includes(word));
    }

    private isNaturalLanguageQuery(query: string): boolean {
        const questionWords = ['what', 'where', 'when', 'how', 'why', 'which', 'who'];
        const questionMarkers = ['?', 'do i have', 'can i find', 'show me', 'tell me'];
        
        const lowerQuery = query.toLowerCase();
        return questionWords.some(word => lowerQuery.startsWith(word)) ||
               questionMarkers.some(marker => lowerQuery.includes(marker)) ||
               query.includes('?');
    }

    // Enhanced search that handles natural language
    async searchWithNaturalLanguage(query: string): Promise<{ results: TableResult[], searchTermsUsed: string[], wasNaturalLanguage: boolean }> {
        try {
            console.log(`Searching OpenMetadata for: ${query}`);
            
            // Try original query first
            let results = await this.search(query);

            // If no results and query looks like natural language, try extracted terms
            if (results.length === 0 && this.isNaturalLanguageQuery(query)) {
                const searchTerms = this.extractSearchTerms(query);
                console.log(`No results for original query. Trying extracted terms: ${searchTerms.join(', ')}`);
                
                if (searchTerms.length > 0) {
                    const allResults: TableResult[] = [];
                    const foundTerms: string[] = [];

                    for (const term of searchTerms) {
                        try {
                            const termResults = await this.search(term);
                            if (termResults.length > 0) {
                                foundTerms.push(term);
                                // Add results, avoiding duplicates
                                termResults.forEach(result => {
                                    if (!allResults.find(r => r.id === result.id)) {
                                        allResults.push(result);
                                    }
                                });
                            }
                        } catch (error) {
                            console.warn(`Failed to search for term: ${term}`, error);
                        }
                    }

                    console.log(`Found ${allResults.length} results using extracted terms: ${foundTerms.join(', ')}`);
                    return {
                        results: allResults.slice(0, 20), // Limit to 20 results
                        searchTermsUsed: foundTerms,
                        wasNaturalLanguage: true
                    };
                }
            }

            return {
                results,
                searchTermsUsed: [query],
                wasNaturalLanguage: false
            };
        } catch (error) {
            console.error('Error searching OpenMetadata:', error);
            throw error;
        }
    }

    private getAuthHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        return headers;
    }

    async search(query: string): Promise<TableResult[]> {
        try {
            console.log(`Searching OpenMetadata for: ${query}`);
            
            // First, try the search API
            const searchUrl = `${this.baseUrl}/api/v1/search/query?q=${encodeURIComponent(query)}&index=table_search_index&size=20`;
            
            const response = await fetch(searchUrl, {
                method: 'GET',
                headers: this.getAuthHeaders()
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
                headers: this.getAuthHeaders()
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
                headers: this.getAuthHeaders()
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
                headers: this.getAuthHeaders()
            });
            
            return response.ok;
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }
}