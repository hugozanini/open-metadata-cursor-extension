# Lineage Visualization Feature

## Overview
Interactive data lineage visualization using ReactFlow, showing upstream sources, downstream targets, and the relationships between data entities.

## User Experience

### Access Pattern
1. User searches for tables in main interface
2. Table cards appear with "🔗 Lineage" buttons
3. Clicking button opens full-screen modal with interactive graph
4. User can explore relationships, zoom, pan, and interact with nodes

### Visual Design
- **Full-screen modal**: Overlay covering entire viewport
- **Color-coded nodes**: 
  - 🔴 Red: Current table (center of investigation)
  - 🟢 Green: Upstream sources (data flows FROM these)
  - 🟡 Yellow: Downstream targets (data flows TO these)
- **Interactive controls**: Zoom, pan, fit view, minimap
- **Node details**: Entity icons, names, service info, descriptions

## Technical Implementation

### Architecture Flow
```
TableCard (🔗 button) → 
App.tsx (handleViewLineage) → 
LineageModal (modal wrapper) →
LineageViewer (ReactFlow) →
LineageNode (custom nodes)
```

### Data Flow
```
1. User clicks lineage button
   ↓
2. App.tsx sends message to extension host
   ↓  
3. LineageService fetches from OpenMetadata API
   ↓
4. Data transformed for ReactFlow format
   ↓
5. ELK layout engine positions nodes
   ↓
6. ReactFlow renders interactive graph
```

### Key Components

#### LineageModal.tsx
- **Purpose**: Modal wrapper and data management
- **Responsibilities**: 
  - Message handling with extension host
  - Loading states and error handling
  - Modal lifecycle (open/close/escape key)
- **State Management**: Loading, error, lineage data
- **API Communication**: `vscode.postMessage()` for lineage requests

#### LineageViewer.tsx  
- **Purpose**: ReactFlow graph rendering and interaction
- **Responsibilities**:
  - Transform OpenMetadata data to ReactFlow format
  - Apply ELK automatic layout
  - Handle node interactions and rendering
- **Key Features**: Controls, minimap, background, node clicking

#### LineageNode.tsx
- **Purpose**: Custom node rendering for entities
- **Responsibilities**:
  - Display entity metadata (name, type, description)
  - Apply appropriate styling based on node position
  - Handle missing/incomplete data safely
- **Styling**: VS Code themed with hover effects

#### LineageService.ts
- **Purpose**: OpenMetadata lineage API integration  
- **Responsibilities**:
  - Fetch lineage data from `/api/v1/lineage/getLineage`
  - Transform complex API response to simplified format
  - Handle authentication and error cases
- **Key Methods**: `getSimpleLineage()`, `hasLineage()`

### Data Transformation

#### OpenMetadata Response Format
```typescript
interface LineageData {
  nodes: Record<string, NodeData>;
  downstreamEdges: Record<string, EdgeDetails>;
  upstreamEdges: Record<string, EdgeDetails>;
}
```

#### ReactFlow Format  
```typescript
interface ReactFlowData {
  nodes: Node<LineageNodeData>[];
  edges: Edge[];
}
```

#### Transformation Logic
1. **Extract entities** from `nodes` object
2. **Classify relationships** from upstream/downstream edges
3. **Create ReactFlow nodes** with position data
4. **Create ReactFlow edges** with styling
5. **Apply ELK layout** for automatic positioning

### Layout Engine (ELK)

#### Configuration
```typescript
const ELK_OPTIONS = {
  'elk.algorithm': 'layered',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
  'elk.spacing.nodeNode': '80', 
  'elk.direction': 'RIGHT',
};
```

#### Fallback Strategy
- **Primary**: ELK automatic layout for optimal positioning
- **Fallback**: Simple manual positioning if ELK fails
- **Positioning**: Center node in middle, upstream left, downstream right

## API Integration

### OpenMetadata Lineage Endpoint
```
GET /api/v1/lineage/getLineage
Parameters:
- fqn: Fully qualified name of entity
- type: Entity type (usually 'table')
- upstreamDepth: Number of upstream levels
- downstreamDepth: Number of downstream levels
```

### Request Flow
```typescript
// Extension host
const lineageData = await lineageService.getSimpleLineage(tableFqn, 'table', 2);

// Send to webview
webview.postMessage({
  type: 'lineageData',
  tableFqn: tableFqn,
  lineageData: lineageData
});
```

### Response Handling
```typescript  
// Webview receives response
switch (message.type) {
  case 'lineageData':
    setLineageData(message.lineageData);
    break;
  case 'lineageError':
    setError(message.error);
    break;
}
```

## Error Handling

### Common Error Scenarios
1. **No lineage data**: Clean "No lineage available" message
2. **API failures**: Network errors, authentication issues
3. **Malformed data**: Missing entity properties, null references
4. **Layout failures**: ELK errors, positioning problems

### Error Recovery
- **Graceful degradation**: Show available data even if incomplete
- **Retry mechanisms**: User can manually retry failed requests
- **Fallback layouts**: Manual positioning if automatic layout fails
- **Null safety**: Comprehensive checks for missing data

### User Feedback
- **Loading states**: Spinner and "Loading lineage data..."
- **Error messages**: Clear, actionable error descriptions
- **Empty states**: Helpful messages for missing data
- **Retry options**: Easy way to try again after failures

## Performance Considerations

### Bundle Size Impact
- **ReactFlow**: Large dependency (~1.5MB in bundle)
- **ELK**: Additional layout engine overhead
- **Loading strategy**: Components loaded on-demand when modal opens

### Runtime Performance
- **Lazy loading**: Lineage components only load when needed
- **Layout caching**: ELK results could be cached for repeated views
- **Node optimization**: Custom nodes optimized for rendering performance

### Scalability
- **Large graphs**: May need pagination or level limiting
- **Memory usage**: Proper cleanup when modal closes
- **API limits**: OpenMetadata depth limits prevent infinite recursion

## Styling and Theming

### VS Code Integration
```css
/* Node styling uses VS Code theme variables */
.lineage-node {
  background: var(--vscode-editor-background);
  border: 2px solid var(--vscode-terminal-ansiBlue);
  color: var(--vscode-foreground);
}

/* Color coding for relationships */
.center-node { border-color: var(--vscode-terminal-ansiRed); }
.upstream-node { border-color: var(--vscode-terminal-ansiGreen); }  
.downstream-node { border-color: var(--vscode-terminal-ansiYellow); }
```

### Responsive Design
- **Full viewport**: Modal takes full screen on all sizes
- **Mobile support**: Touch interactions, responsive controls
- **Accessibility**: Keyboard navigation, proper ARIA labels

## Future Enhancements

### Immediate Improvements
1. **Performance**: Code splitting for ReactFlow bundle
2. **Caching**: Cache lineage data for repeated requests
3. **Error recovery**: Better retry mechanisms
4. **Accessibility**: Keyboard navigation improvements

### Advanced Features
1. **Column-level lineage**: Show field mappings between tables
2. **Pipeline details**: Display transformation logic on edges
3. **Search in graph**: Filter visible nodes by name/type
4. **Export functionality**: Save diagrams as images
5. **Expand on demand**: Load deeper levels dynamically

### Integration Opportunities  
1. **Search integration**: Jump to lineage from search results
2. **Code integration**: Link to actual code/SQL transformations
3. **Documentation**: Link to data documentation and schemas
4. **Monitoring**: Show data quality and freshness indicators