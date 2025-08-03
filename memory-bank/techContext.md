# Technical Context - OpenMetadata AI Explorer

## Technology Stack

### Core Technologies
- **VS Code Extension API**: Host environment and integration
- **TypeScript**: Primary language for type safety
- **React 18**: Webview UI framework with createRoot
- **Webpack 5**: Bundling and build system
- **Node.js**: Extension host runtime

### Key Dependencies

#### UI & Visualization
- **ReactFlow**: Graph visualization for lineage (`reactflow`)
- **ELK Layout**: Automatic graph layout (`elkjs/lib/elk.bundled.js`)  
- **React DOM**: React rendering (`react-dom/client`)

#### Development Tools
- **ts-loader**: TypeScript compilation in Webpack
- **css-loader & style-loader**: CSS processing
- **webpack-cli**: Build tool CLI

### External APIs
- **OpenMetadata REST API**: Data catalog integration
  - Base URL: `http://localhost:8585` (configurable)
  - Authentication: Bearer token (optional)
  - Key endpoints: `/api/v1/search/query`, `/api/v1/lineage/getLineage`

- **Gemini 2.0 API**: AI processing
  - Provider: Google AI Studio  
  - Authentication: API key
  - Model: `gemini-2.0-flash-exp`

## Development Setup

### Prerequisites
- Node.js 16+ 
- VS Code or Cursor IDE
- OpenMetadata local deployment (Docker)

### Local OpenMetadata Setup
```bash
# Using provided docker-compose from tutorial
# https://docs.open-metadata.org/latest/quick-start/local-docker-deployment
docker-compose up -d
```

### Extension Development
```bash
# Install dependencies
npm install

# Development build with watch
npm run watch

# Production build  
npm run compile

# Debug in Extension Development Host
# Press F5 in VS Code
```

### Configuration Files

#### `package.json` - Extension Manifest
```json
{
  "contributes": {
    "viewsContainers": {
      "panel": [
        {
          "id": "openmetadataPanel",
          "title": "OpenMetadata AI",
          "icon": "$(database)"
        }
      ]
    },
    "views": {
      "openmetadataPanel": [
        {
          "id": "openmetadataExplorer",
          "name": "Explorer",
          "type": "webview"
        }
      ]
    },
    "configuration": {
      "properties": {
        "openmetadataExplorer.geminiApiKey": "string",
        "openmetadataExplorer.openmetadataUrl": "string", 
        "openmetadataExplorer.openmetadataAuthToken": "string"
      }
    }
  }
}
```

#### `tsconfig.json` - TypeScript Configuration
- Target: ES2020
- Module: CommonJS  
- JSX: React
- Strict mode enabled
- Skip lib check for external dependencies

#### `webpack.config.js` - Build Configuration
- **Extension bundle**: Node.js target for extension host
- **Webview bundle**: Web target for React app
- **TypeScript loader**: `transpileOnly: true` for faster builds
- **CSS processing**: style-loader + css-loader chain

## Technical Constraints

### VS Code Extension Limitations
- **Single API acquisition**: VS Code API can only be acquired once per webview
- **Sandboxed webview**: Limited access to Node.js APIs from React components
- **Message passing only**: Communication via postMessage protocol
- **CSP restrictions**: Content Security Policy limits resource loading

### Bundle Size Considerations
- **ReactFlow**: Large dependency (~1.73MB total bundle)
- **Performance warnings**: Webpack recommends code splitting
- **Load time**: Acceptable for development, could optimize for production

### API Rate Limits
- **Gemini API**: Free tier quotas from AI Studio
- **OpenMetadata**: Local deployment, no rate limits
- **Error handling**: Graceful degradation when APIs unavailable

## Build System

### Webpack Configuration
```javascript
// Two separate bundles
module.exports = [
  // Extension (Node.js)
  {
    target: 'node',
    entry: './src/extension.ts',
    externals: { vscode: 'commonjs vscode' }
  },
  // Webview (Browser)  
  {
    target: ['web', 'es5'],
    entry: './src/webview/index.tsx'
  }
];
```

### TypeScript Compilation Issues
- **d3-dispatch errors**: Fixed with `transpileOnly: true`
- **Null safety**: Strict null checks enabled
- **Import organization**: ES modules with proper imports

## Performance Optimizations

### Bundle Optimization
- **Production mode**: Webpack minification enabled
- **Source maps**: Generated for debugging
- **Tree shaking**: Unused code elimination

### Runtime Performance  
- **Parallel API calls**: Search and AI insights run concurrently
- **Progressive rendering**: Results shown immediately, insights added later
- **Component lazy loading**: Lineage components loaded on demand

### Memory Management
- **Service singletons**: Reuse service instances
- **Event cleanup**: Proper event listener cleanup in useEffect
- **Component unmounting**: Clean state management

## Development Workflow

### Git Structure
- **Main branch**: `main` - stable releases
- **Feature branch**: `feature/lineage-visualization` - active development
- **Commit style**: Conventional commits with clear descriptions

### Testing Strategy
- **Manual testing**: Extension Development Host
- **Browser DevTools**: Console debugging in webview
- **API testing**: Direct OpenMetadata/Gemini API calls

### Debugging Setup
- **VS Code debugger**: F5 launch configuration
- **Source maps**: Available for both extension and webview
- **Console logging**: Comprehensive error tracking
- **React DevTools**: Available in Extension Development Host

## Deployment Considerations

### Extension Packaging
- **VSIX format**: Standard VS Code extension package  
- **Dependencies**: All bundled in webpack output
- **Configuration**: User settings for API keys and URLs

### Distribution Options
- **VS Code Marketplace**: Public distribution (future)
- **Enterprise**: Private marketplace or direct install
- **Development**: Local .vsix installation