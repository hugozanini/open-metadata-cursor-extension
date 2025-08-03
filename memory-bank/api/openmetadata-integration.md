# OpenMetadata API Integration

## Overview
Integration with OpenMetadata REST API for data catalog functionality, including search, metadata retrieval, and lineage data.

## Base Configuration
- **Default URL**: `http://localhost:8585`
- **API Base Path**: `/api/v1`
- **Authentication**: Bearer token (optional for local development)
- **Setting Key**: `openmetadataExplorer.openmetadataUrl`

## Authentication

### Bot Token Setup
1. **Access OpenMetadata UI**: Navigate to Settings → Bots
2. **Create Bot**: Create new bot or use existing one
3. **Generate Token**: Copy the JWT token
4. **Configure Extension**: Add to `openmetadataExplorer.openmetadataAuthToken`

### Header Format
```typescript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${authToken}` // If token provided
};
```

## Search API

### Endpoint: `/api/v1/search/query`

#### Request Format
```typescript
const searchParams = {
  q: searchQuery,           // Search query string
  index: 'table_search_index', // Search index
  size: 50,                 // Results limit  
  from: 0,                  // Pagination offset
  includeDeleted: false     // Exclude deleted entities
};
```

#### Response Format
```typescript
interface SearchResponse {
  data: {
    hits: {
      _source: {
        id: string;
        name: string;
        fullyQualifiedName: string;
        description?: string;
        tableType?: string;
        columns?: Column[];
        rowCount?: number;
        database?: string;
        schema?: string;
        updatedAt?: string;
        tags?: string[];
      };
    }[];
  };
}
```

#### Implementation
```typescript
async search(query: string): Promise<SearchResult> {
  const params = new URLSearchParams({
    q: query,
    index: 'table_search_index',
    size: '50'
  });
  
  const response = await fetch(
    `${this.baseURL}/api/v1/search/query?${params}`,
    { headers: this.getAuthHeaders() }
  );
  
  return response.json();
}
```

### Natural Language Processing

#### Query Analysis
```typescript
private extractSearchTerms(query: string): string[] {
  const stopWords = ['what', 'where', 'how', 'do', 'i', 'have', 'get', 'find'];
  const dataWords = ['customer', 'user', 'order', 'product', 'sale', 'transaction'];
  
  // Filter and prioritize data-related terms
  return query.toLowerCase()
    .split(/\s+/)
    .filter(word => !stopWords.includes(word))
    .sort(word => dataWords.includes(word) ? -1 : 1);
}
```

#### Search Strategy
1. **Direct search**: Try original query first
2. **Natural language detection**: Check for question patterns
3. **Term extraction**: Extract meaningful search terms
4. **Multi-term search**: Search each term individually
5. **Result aggregation**: Combine and deduplicate results

## Lineage API

### Endpoint: `/api/v1/lineage/getLineage`

#### Request Parameters
```typescript
const params = {
  fqn: entityFQN,          // Fully qualified name
  type: 'table',           // Entity type
  upstreamDepth: 1,        // Upstream levels (n-1)
  downstreamDepth: 1,      // Downstream levels
  includeDeleted: false,   // Include deleted entities
  size: 50                 // Max nodes per request
};
```

#### Response Format
```typescript
interface LineageResponse {
  nodes: Record<string, {
    entity: {
      id: string;
      type: string;
      name: string;
      fullyQualifiedName: string;
      description?: string;
      displayName?: string;
      deleted?: boolean;
    };
    paging?: {
      entityDownstreamCount?: number;
      entityUpstreamCount?: number;
    };
  }>;
  downstreamEdges: Record<string, EdgeDetails>;
  upstreamEdges: Record<string, EdgeDetails>;
}
```

#### Edge Details Format
```typescript
interface EdgeDetails {
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
  pipeline?: {
    id: string;
    name: string;
    fullyQualifiedName: string;
  };
  source?: string;
  sqlQuery?: string;
  description?: string;
}
```

#### Implementation
```typescript
async getLineageData(fqn: string, entityType: string, config?: LineageConfig) {
  const params = new URLSearchParams({
    fqn: fqn,
    type: entityType,
    upstreamDepth: (config.upstreamDepth - 1).toString(),
    downstreamDepth: config.downstreamDepth.toString(),
    includeDeleted: 'false'
  });
  
  const response = await fetch(
    `${this.baseURL}/api/v1/lineage/getLineage?${params}`,
    { headers: this.getAuthHeaders() }
  );
  
  return response.json();
}
```

## Error Handling

### Common HTTP Status Codes
- **200**: Success
- **401**: Unauthorized (missing/invalid token)
- **404**: Entity not found
- **500**: Server error

### Error Response Format
```typescript
interface ErrorResponse {
  code: number;
  message: string;
  timestamp: string;
}
```

### Implementation
```typescript
private async handleResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`HTTP ${response.status}: ${error.message || response.statusText}`);
  }
  return response.json();
}
```

## Service Implementation

### OpenMetadataService Class
```typescript
export class OpenMetadataService {
  private baseURL: string;
  private authToken: string;
  
  constructor() {
    const config = vscode.workspace.getConfiguration('openmetadataExplorer');
    this.baseURL = config.get<string>('openmetadataUrl') || 'http://localhost:8585';
    this.authToken = config.get<string>('openmetadataAuthToken') || '';
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
  
  // Search and lineage methods...
}
```

### Configuration Integration
```typescript
// Settings in package.json
"configuration": {
  "properties": {
    "openmetadataExplorer.openmetadataUrl": {
      "type": "string",
      "default": "http://localhost:8585",
      "description": "OpenMetadata server URL"
    },
    "openmetadataExplorer.openmetadataAuthToken": {
      "type": "string", 
      "description": "OpenMetadata bot token for authentication"
    }
  }
}
```

## Testing and Debugging

### Connection Testing
```typescript
async testConnection(): Promise<boolean> {
  try {
    const response = await fetch(
      `${this.baseURL}/api/v1/version`,
      { headers: this.getAuthHeaders() }
    );
    return response.ok;
  } catch (error) {
    return false;
  }
}
```

### Debug Logging
```typescript
console.log('OpenMetadata request:', {
  url: `${this.baseURL}/api/v1/search/query`,
  query: searchQuery,
  hasAuth: !!this.authToken
});
```

### Common Issues
1. **CORS Errors**: Usually not an issue with local deployment
2. **Authentication**: 401 errors indicate missing/invalid token
3. **Network**: Connection refused indicates server not running
4. **Data Format**: Missing fields in response indicate API version mismatch

## Local Development Setup

### Docker Deployment
```bash
# From OpenMetadata tutorial
# https://docs.open-metadata.org/latest/quick-start/local-docker-deployment
docker-compose up -d
```

### Verification Steps
1. **Access UI**: http://localhost:8585
2. **Check API**: http://localhost:8585/api/v1/version
3. **Test Search**: http://localhost:8585/api/v1/search/query?q=*
4. **Create Bot**: Settings → Bots → Create Bot → Generate Token

### Sample Data
- **Fake Data**: Comes pre-loaded with realistic dataset
- **Table Examples**: customers, orders, products, etc.
- **Lineage Examples**: ETL pipelines connecting tables
- **Metadata**: Descriptions, tags, column details