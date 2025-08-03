# System Patterns - OpenMetadata AI Explorer

## Architecture Overview

### Two-Tier Architecture
```
┌─────────────────────────────────────────────────────┐
│                VS Code Extension Host               │
│                    (Node.js)                        │
├─────────────────────────────────────────────────────┤
│  extension.ts                                       │
│  ├─ OpenMetadataExplorerProvider                    │
│  ├─ Services Layer                                  │
│  │  ├─ OpenMetadataService (API integration)        │
│  │  ├─ GeminiService (AI processing)                │
│  │  └─ LineageService (Graph data)                  │
│  └─ Configuration Management                        │
└─────────────────────────────────────────────────────┘
                            │
                    Message Passing
                            │
┌─────────────────────────────────────────────────────┐
│                   Webview (React)                   │
│                  (Browser Context)                  │
├─────────────────────────────────────────────────────┤
│  App.tsx (Main coordinator)                        │
│  ├─ SearchInterface (Input handling)                │
│  ├─ ResultsList (Data display)                      │
│  ├─ AIInsights (Streaming responses)                │
│  ├─ ConfigStatus (Setup guidance)                   │
│  └─ Lineage/ (Graph visualization)                  │
│     ├─ LineageModal                                 │
│     ├─ LineageViewer (ReactFlow)                    │
│     └─ LineageNode (Custom nodes)                   │
└─────────────────────────────────────────────────────┘
```

## Key Design Patterns

### 1. Service Layer Pattern
**Purpose**: Separate API concerns from UI logic

**Implementation**:
- `OpenMetadataService`: Handles REST API calls, authentication, natural language processing
- `GeminiService`: Manages AI requests, prompt engineering, response formatting
- `LineageService`: Specialized for lineage data fetching and transformation

**Benefits**:
- Clear separation of concerns
- Testable business logic
- Reusable across components

### 2. Message Passing Pattern
**Purpose**: Communication between Extension Host and Webview

**Flow**:
```
Webview → postMessage() → Extension Host
Extension Host → postMessage() → Webview
```

**Message Types**:
- `search`: Trigger data search
- `getConfig`: Request configuration
- `getLineage`: Request lineage data
- `searchResults`: Return search data
- `aiInsightsUpdate`: Stream AI responses
- `lineageData`: Return graph data

**Benefits**:
- Type-safe communication
- Async operation support
- Error handling isolation

### 3. Progressive Enhancement Pattern
**Purpose**: Fast initial response with enhanced AI insights

**Flow**:
1. User searches → Immediate loading state
2. OpenMetadata results → Quick table display  
3. AI analysis → Enhanced insights (async)

**Implementation**:
```typescript
// Fast path
const results = await openMetadataService.search(query);
webview.postMessage({ type: 'searchResults', results });

// Enhancement path (async)
const insights = await geminiService.analyzeResults(results);
webview.postMessage({ type: 'aiInsightsUpdate', insights });
```

### 4. Singleton Pattern for VS Code API
**Purpose**: Prevent multiple API acquisitions

**Problem**: VS Code API can only be acquired once per webview
**Solution**: Global singleton with lazy initialization

```typescript
const getVsCodeApi = () => {
    if (!window.vscodeApi) {
        window.vscodeApi = acquireVsCodeApi();
    }
    return window.vscodeApi;
};
```

### 5. Component Composition Pattern
**Purpose**: Modular, reusable UI components

**Structure**:
- **Container Components**: `App`, `LineageModal` (manage state)
- **Presentation Components**: `SearchInterface`, `TableCard` (pure render)
- **Specialized Components**: `AIInsights`, `LineageViewer` (domain-specific)

### 6. Error Boundary Pattern
**Purpose**: Graceful error handling and user feedback

**Implementation**:
- Try-catch blocks in service calls
- Fallback UI states for errors
- User-friendly error messages
- Console logging for debugging

### 7. Theme Integration Pattern
**Purpose**: Seamless VS Code visual integration

**Implementation**:
- CSS variables: `var(--vscode-foreground)`
- Dynamic theming support
- Consistent spacing and typography
- Accessibility compliance

## Data Flow Patterns

### Search Flow
```
User Input → Natural Language Processing → OpenMetadata API → 
Results Display → AI Analysis → Enhanced Insights
```

### Lineage Flow
```
Table Selection → Modal Opening → API Request → 
Graph Layout (ELK) → ReactFlow Rendering → User Interaction
```

### Configuration Flow
```
VS Code Settings → Extension Activation → Service Initialization → 
Webview Configuration → User Feedback
```

## Performance Patterns

### 1. Parallel Processing
- Search results and AI insights processed simultaneously
- Multiple lineage API calls when needed
- Webpack bundle splitting for faster loads

### 2. Lazy Loading
- Lineage components loaded on demand  
- Large dependencies (ReactFlow) only when needed
- Progressive enhancement of features

### 3. Caching Strategy
- VS Code API singleton caching
- Service instance reuse
- Component state preservation

## Security Patterns

### 1. Content Security Policy
- Strict CSP headers in webview
- Nonce-based script execution
- Controlled resource loading

### 2. API Key Management
- Secure storage in VS Code settings
- No hardcoded credentials
- User-controlled authentication

### 3. Input Validation
- Query sanitization
- API response validation
- Error message sanitization