# Product Context - OpenMetadata AI Explorer

## Problem Statement

### Context Switching Pain
Data engineers frequently need to:
- Understand table schemas and relationships
- Find the right data sources for their work
- Explore data lineage and dependencies
- Check data quality and metadata

**Current Reality**: This requires switching between IDE and OpenMetadata web interface, breaking development flow.

### The Development Journey Challenge
A big part of the data development journey is to:
1. **Get the right data** - finding relevant tables and columns
2. **Explore lineages** - understanding data dependencies
3. **Validate quality** - checking metadata and descriptions
4. **Understand relationships** - seeing how data flows between systems

## Solution Vision

### Bring OpenMetadata Inside the IDE
- **Seamless Integration**: Access data catalog without leaving the coding environment
- **AI-Enhanced Search**: Natural language queries like "what customer information do I have?"
- **Visual Lineage**: Interactive graphs showing data relationships
- **Conversational Interface**: Chat-like experience familiar to Cursor users

### Why This Matters
- **Productivity**: Eliminate context switching during development
- **Discovery**: Find relevant data faster with AI assistance  
- **Understanding**: Visual lineage helps grasp complex data flows
- **Accessibility**: Data catalog available where developers work

## User Experience Goals

### Primary User Journey
1. **Developer has a data question** (e.g., "I need customer order data")
2. **Search naturally** in the extension panel: "what customer information do I have?"
3. **Get AI insights** about relevant tables and their contents
4. **Explore lineage** by clicking lineage buttons on interesting tables
5. **Understand data flow** through interactive visualization
6. **Continue coding** with the right data understanding

### Key UX Principles (Enhanced v1.0)
- **Minimal friction**: Quick access in bottom panel next to terminal
- **Ultra-compact design**: Maximized screen real estate with minimal spacing
- **Smart status indication**: Logo when connected, warning dots when issues
- **Conversational**: Natural language interaction like Cursor chat with dynamic suggestions
- **Progressive disclosure**: Start with overview, drill down as needed
- **Professional aesthetics**: Clean, VS Code-native interface with minimalist design language
- **Home button functionality**: Logo click provides quick reset to clean state

## Target Audience

### Primary Users
- **Data Engineers** working on data pipelines and transformations
- **Analytics Engineers** building dbt models and data products
- **Data Scientists** exploring datasets for analysis
- **Backend Developers** working with database schemas

### Use Cases
1. **Schema Discovery**: "What columns are in the users table?"
2. **Data Exploration**: "What customer data do we have?"
3. **Lineage Investigation**: "Where does this data come from?"
4. **Impact Analysis**: "What will break if I change this table?"
5. **Data Quality Checks**: "Is this table up to date?"

## Technology Choice Rationale

### Why OpenMetadata
- **Industry Standard**: Widely adopted data catalog solution
- **Rich API**: Comprehensive REST API for metadata access
- **Lineage Support**: Built-in data lineage tracking
- **Local Development**: Can run locally with realistic fake data

### Why Gemini 2.0
- **Free Quotas**: AI Studio provides generous free tier
- **Conversational AI**: Excellent for natural language processing
- **Fast Response**: Quick enough for IDE integration
- **Easy Integration**: Simple REST API

### Why VS Code Extension
- **Developer Environment**: Where the target users already work
- **Rich API**: Comprehensive extension capabilities
- **Webview Support**: Can embed React applications
- **Theme Integration**: Seamless visual integration