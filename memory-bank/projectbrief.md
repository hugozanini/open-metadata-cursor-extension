# OpenMetadata AI Explorer - Project Brief

## Project Overview
A VS Code extension that integrates OpenMetadata data catalog with AI-powered search and visualization directly within the IDE, eliminating context switching for data engineers.

## Core Requirements

### Primary Goal
**Reduce context switching** for developers when needing to consult metadata by bringing OpenMetadata functionality inside the IDE with AI assistance.

### Key Features Required
1. **AI-Powered Search**: Natural language search on top of OpenMetadata tables using Gemini 2.0
2. **Lineage Visualization**: Interactive data lineage graphs using ReactFlow
3. **IDE Integration**: Extension positioned next to terminal tab in bottom panel
4. **Conversational Interface**: Chat-like experience similar to Cursor's interface

### Technical Requirements
- **Target IDE**: VS Code/Cursor (developed as VS Code extension)
- **AI Integration**: Gemini 2.0 API with free quotas from AI Studio
- **Data Source**: Local OpenMetadata deployment with fake realistic data
- **Authentication**: OpenMetadata bot token support
- **UI Position**: Bottom panel next to terminal (not left sidebar)

### University Project Context
- **Timeline**: One weekend implementation
- **Deliverable**: Working extension + blog post explaining value and AI integration
- **Documentation**: Comprehensive article covering motivation, implementation, and results

## Project Structure
```
open-metadata-cursor-extension/
├── src/
│   ├── extension.ts                 # Main extension entry
│   ├── OpenMetadataExplorerProvider.ts  # Webview provider
│   ├── services/                    # Service layer
│   │   ├── OpenMetadataService.ts   # API integration
│   │   ├── GeminiService.ts         # AI integration  
│   │   └── LineageService.ts        # Lineage data
│   └── webview/                     # React UI
│       ├── App.tsx                  # Main React app
│       ├── components/              # UI components
│       └── styles.css              # VS Code theming
├── package.json                     # Extension manifest
├── webpack.config.js               # Build configuration
└── article/                        # University documentation
```

## Success Criteria
1. ✅ Extension loads in bottom panel next to terminal
2. ✅ Search works with natural language processing
3. ✅ AI insights provide conversational responses
4. ✅ Lineage visualization shows interactive graphs
5. ✅ Authentication with OpenMetadata works
6. ✅ Comprehensive article documentation

## Repository
- **GitHub**: https://github.com/hugozanini/open-metadata-cursor-extension.git
- **Main Branch**: `main` 
- **Feature Branch**: `feature/lineage-visualization` (active development)

## Current Phase
**Status**: Core features implemented and working
**Next**: Testing, refinement, and article completion