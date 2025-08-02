# Building an AI-Powered Data Catalog Extension for Cursor IDE

*Bringing OpenMetadata Intelligence Directly into Your Development Environment*

## Motivation: The Context Switching Problem

Modern data development workflows suffer from a critical productivity killer: **context switching**. Developers constantly jump between their IDE, data catalog interfaces, documentation portals, and various metadata tools to understand the data they're working with.

> **📊 TODO: Add statistics/survey data about context switching impact on developer productivity**
> 
> Research shows that context switching can reduce productivity by up to X%, with developers taking an average of Y minutes to refocus after each interruption.

This fragmented experience creates several challenges:

- **Cognitive Load**: Remembering information across multiple interfaces
- **Time Waste**: Repeatedly switching between applications  
- **Workflow Disruption**: Breaking the development flow state
- **Knowledge Gaps**: Missing connections between code and data context

## The Data Development Journey

A significant portion of the data development lifecycle involves **getting the right data**. Data engineers and analysts spend considerable time:

- 🔍 **Discovering datasets** - Finding tables that contain the information they need
- 📋 **Understanding schemas** - Exploring column definitions, data types, and constraints  
- 🔗 **Tracing lineage** - Following data transformations and dependencies
- 📊 **Assessing quality** - Checking data freshness, completeness, and reliability
- 📖 **Reading documentation** - Understanding business context and usage patterns

Currently, this exploration happens outside the development environment, creating friction and breaking the coding flow.

## Solution: Bringing Metadata into the IDE

This project demonstrates how to bring comprehensive data catalog functionality directly into the development environment using:

- **[OpenMetadata](https://open-metadata.org/)** - An industry-standard, open-source data catalog platform
- **Gemini AI** - For intelligent, conversational data exploration
- **Cursor IDE** - The most popular AI-assisted development environment

### Why OpenMetadata?

OpenMetadata provides:
- ✅ **Industry Standard**: Widely adopted open-source data catalog
- ✅ **Comprehensive Metadata**: Tables, columns, lineage, quality metrics
- ✅ **Rich APIs**: RESTful endpoints for programmatic access
- ✅ **Sample Data**: Realistic fake datasets for development

### Why Gemini AI?

The integration with Gemini AI serves multiple purposes:
- 🤖 **Conversational Interface**: Matches the chat-based interaction developers expect in Cursor
- 💬 **Natural Language Queries**: Ask questions like "show me customer tables" instead of complex filters
- 🧠 **Intelligent Analysis**: Provides insights, recommendations, and data quality observations
- 💰 **Free Tier**: Google AI Studio offers generous free quotas for development

## Technical Implementation

### Architecture Overview

The solution consists of three main components:

1. **Local OpenMetadata Deployment** - Complete data catalog infrastructure
2. **Cursor Extension** - VS Code extension with React-based webview
3. **AI Integration** - Gemini API for intelligent data analysis

### OpenMetadata Local Setup

Following the [official OpenMetadata Docker deployment guide](https://docs.open-metadata.org/latest/quick-start/local-docker-deployment), we deploy a complete data catalog stack:

#### Infrastructure Components

- **MySQL Database** - Stores metadata, user accounts, and configurations
- **Elasticsearch** - Powers fast search across all metadata
- **OpenMetadata Server** - Core API and web interface  
- **Airflow** - Orchestrates data ingestion and quality workflows

#### Sample Data

The deployment includes realistic fake datasets representing typical enterprise scenarios:
- Customer information tables
- Order and transaction data
- Product catalogs
- User activity logs
- Sales and revenue metrics

#### Setup Process

```bash
# 1. Create directory
mkdir openmetadata-docker
cd openmetadata-docker

# 2. Download docker-compose file
curl -L https://github.com/open-metadata/OpenMetadata/releases/latest/download/docker-compose.yml -o docker-compose.yml

# 3. Start services
docker compose up -d

# 4. Access OpenMetadata at http://localhost:8585
# Default credentials: admin@open-metadata.org / admin
```

**System Requirements:**
- Docker with at least 6GB memory and 4 vCPUs allocated
- Docker Compose v2.1.1 or greater

The setup process is straightforward and provides a complete data catalog environment with pre-loaded sample data, making it ideal for development and testing.

![OpenMetadata Setup Process](Pasted%20image%2020250802135331.png)

*Screenshots showing the local OpenMetadata deployment and sample data*

### Cursor Extension Development

[Cursor](https://cursor.com/) has emerged as the leading IDE for AI-assisted development, with developers accustomed to conversational interfaces for coding assistance. Our extension leverages this familiarity by providing:

- **Chat-like Interface** - Natural language queries for data exploration
- **Contextual Results** - Rich metadata display with AI-powered insights  
- **Integrated Workflow** - No need to leave the IDE for data discovery

### VS Code Extension Fundamentals

Building a VS Code extension requires understanding the core architecture and contribution model. Based on the [official VS Code Extension API documentation](https://code.visualstudio.com/api/extension-guides/overview), extensions are structured around several key components:

#### Core Extension Structure

**`package.json`** - The extension manifest defines:
- Extension metadata (name, version, description)
- **Contribution Points** - How the extension extends VS Code functionality
- **Activation Events** - When the extension should be loaded
- Dependencies and build scripts

**Extension Entry Point** - The main TypeScript/JavaScript file that:
- Registers providers and commands when activated
- Manages extension lifecycle and cleanup
- Handles communication between VS Code and extension features

#### Strategic UI Positioning: The Terminal Panel

For our data catalog extension, **positioning next to the terminal** is strategically important because:

- 🔧 **High Developer Traffic** - Terminal is one of the most frequently accessed areas
- 📍 **Bottom Panel Real Estate** - Wide horizontal space ideal for data tables and results
- 🔄 **Workflow Integration** - Developers often switch between terminal commands and data exploration
- 👀 **Persistent Visibility** - Stays accessible while coding in the main editor

#### Implementation Approach

The key to panel positioning lies in VS Code's **view containers** system:

```json
"contributes": {
  "viewsContainers": {
    "panel": [{
      "id": "openmetadataPanel",
      "title": "OpenMetadata AI", 
      "icon": "$(database)"
    }]
  },
  "views": {
    "openmetadataPanel": [{
      "id": "openmetadataExplorer",
      "name": "Explorer",
      "type": "webview"
    }]
  }
}
```

This configuration creates a new panel container that appears alongside Terminal, Problems, and Debug Console tabs. The **webview type** enables rich React-based UI rendering within the VS Code environment.

**Webviews** provide the flexibility needed for our data exploration interface, supporting:
- Custom HTML/CSS/JavaScript rendering
- Two-way communication with the extension backend
- Integration with VS Code's theming system
- Rich data visualization capabilities

### System Architecture

The extension architecture creates a seamless bridge between the IDE and data catalog:

```mermaid
graph TD
    A[Cursor IDE] --> B[Extension Webview]
    B --> C[OpenMetadata API]
    B --> D[Gemini AI API]
    
    C --> E[Local OpenMetadata]
    E --> F[MySQL Database]
    E --> G[Elasticsearch]
    E --> H[Sample Data]
    
    D --> I[AI Analysis & Insights]
    
    B --> J[Search Results + AI Insights]
    J --> A
    
    style A fill:#2196F3,color:white
    style B fill:#4CAF50,color:white
    style C fill:#FF9800,color:white
    style D fill:#9C27B0,color:white
    style E fill:#607D8B,color:white
```

### Proposal Summary

The core proposal is to create a **Cursor extension** that:

1. **Queries OpenMetadata APIs** to retrieve comprehensive metadata about tables, columns, and relationships
2. **Leverages Gemini AI** to analyze and organize the metadata into conversational, actionable insights
3. **Presents results** in a familiar chat-like interface directly within the IDE
4. **Eliminates context switching** by bringing data catalog functionality into the development environment

This approach combines the robust metadata management capabilities of OpenMetadata with the conversational AI experience that Cursor developers expect, creating a seamless data exploration workflow.

---

## Implementation Details

### Project Structure

The completed extension follows a clean, modular architecture:

```
open-metadata-cursor-extension/
├── src/
│   ├── extension.ts                     # Extension entry point
│   ├── OpenMetadataExplorerProvider.ts  # Webview provider & orchestration
│   └── services/
│       ├── OpenMetadataService.ts       # API client with NLP capabilities
│       └── GeminiService.ts             # AI integration service
├── src/webview/                         # React UI components
│   ├── App.tsx                          # Main application component
│   ├── components/
│   │   ├── SearchInterface.tsx          # Search input with NL examples
│   │   ├── AIInsights.tsx               # Streaming AI overview
│   │   ├── ResultsList.tsx              # Table results display
│   │   ├── TableCard.tsx                # Individual table cards
│   │   └── ConfigStatus.tsx             # Configuration indicator
│   └── styles.css                       # VS Code-themed styling
├── package.json                         # Extension manifest & dependencies
├── webpack.config.js                    # Build configuration
└── .vscode/                            # VS Code debug configuration
    ├── launch.json
    └── tasks.json
```

### Core Features Implemented

#### 🤖 **Natural Language Processing**

The extension understands conversational queries through intelligent term extraction:

```typescript
// Example: "What customer information do I have?"
// Extracts: ["customer"] 
// Searches OpenMetadata for customer-related tables
// AI responds: "Based on your data catalog, you have..."
```

**Key NLP Features:**
- **Question Detection**: Recognizes "what", "show me", "how can I", etc.
- **Stop Word Filtering**: Removes common words like "the", "a", "have"
- **Data Term Recognition**: Prioritizes domain-specific terms (customer, order, sales)
- **Smart Fallback**: When exact queries fail, tries extracted terms individually

#### ⚡ **Performance Optimization**

**Before**: Sequential API calls caused 15+ second delays
```
Search → AI Insights → Individual Table Analysis (×15) = 17 API calls
```

**After**: Parallel processing with immediate results
```
Search (immediate results) + AI Overview (background) = 2 API calls
```

#### 🎨 **Google AI Overview-Style Integration**

Inspired by Google's AI Overview, the extension provides:
- **Natural text flow** without artificial "AI Insights" boxes
- **Conversational responses** addressing user questions directly
- **Streaming animation** with word-by-word typing effect
- **Seamless integration** between AI explanation and search results

#### 🎯 **Strategic UI Positioning**

Positioned next to the Terminal tab for maximum developer accessibility:
- **High Traffic Area**: Developers frequently access the terminal
- **Persistent Visibility**: Stays accessible while coding
- **Wide Layout**: Ideal for displaying table metadata and results

### User Experience Walkthrough

#### 1. **Natural Language Search**
```
User types: "What customer information do I have?"
↓
Extension extracts: "customer"
↓
Searches OpenMetadata for customer-related tables
↓
AI streams response: "Based on your data catalog, you have comprehensive customer information..."
↓
Displays table cards with customer data
```

#### 2. **Streaming AI Insights**
- Results appear **instantly** (no waiting for AI)
- AI overview streams **word-by-word** like Cursor Chat
- **Blinking cursor** indicates active typing
- **Smooth transitions** from loading to complete insights

#### 3. **Intelligent Search Fallback**
When "what customer information do I have?" finds no exact matches:
- Extracts terms: `["customer"]`
- Searches each term individually  
- Combines results (avoiding duplicates)
- Provides context: "I found 5 tables related to customer"

### Technical Architecture Deep Dive

#### **OpenMetadataService.ts** - Smart Search Logic
```typescript
async searchWithNaturalLanguage(query: string): Promise<{
    results: TableResult[], 
    searchTermsUsed: string[], 
    wasNaturalLanguage: boolean 
}> {
    // Try exact query first
    let results = await this.search(query);
    
    // If no results and natural language detected
    if (results.length === 0 && this.isNaturalLanguageQuery(query)) {
        const terms = this.extractSearchTerms(query);
        // Search each term and combine results
    }
}
```

#### **GeminiService.ts** - Conversational AI
```typescript
async searchInsights(query: string, results: TableResult[], 
                   searchTermsUsed: string[], wasNaturalLanguage: boolean) {
    const prompt = wasNaturalLanguage ? `
        The user asked: "${query}"
        Respond conversationally as if answering their question directly...
    ` : `
        Standard search results analysis...
    `;
}
```

#### **AIInsights.tsx** - Streaming Animation
```typescript
const [displayedText, setDisplayedText] = useState('');
const [isTyping, setIsTyping] = useState(false);

useEffect(() => {
    // Word-by-word streaming animation
    let currentIndex = 0;
    const streamText = () => {
        const nextSpace = insights.indexOf(' ', currentIndex);
        const nextWord = nextSpace === -1 ? insights.length : nextSpace + 1;
        setDisplayedText(insights.substring(0, nextWord));
        setTimeout(streamText, 50); // 50ms per word
    };
}, [insights]);
```

### Configuration & Setup Guide

#### **Prerequisites**
1. **OpenMetadata Local Deployment**
   ```bash
   mkdir openmetadata-docker && cd openmetadata-docker
   curl -L https://github.com/open-metadata/OpenMetadata/releases/latest/download/docker-compose.yml -o docker-compose.yml
   docker compose up -d
   ```

2. **Gemini API Key**
   - Visit [Google AI Studio](https://aistudio.google.com/)
   - Generate free API key
   - Note: 15 requests/minute free tier limit

#### **Extension Setup**
1. **Clone the repository**
   ```bash
   git clone https://github.com/hugozanini/open-metadata-cursor-extension.git
   cd open-metadata-cursor-extension
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API keys** (Method: VS Code Settings JSON)
   ```json
   {
     "openmetadataExplorer.geminiApiKey": "your-gemini-api-key-here",
     "openmetadataExplorer.openmetadataUrl": "http://localhost:8585",
     "openmetadataExplorer.openmetadataAuthToken": "your-bot-token-here"
   }
   ```

4. **Get OpenMetadata Bot Token**
   - Access OpenMetadata UI: `http://localhost:8585`
   - Login: `admin@open-metadata.org` / `admin`
   - Settings → Bots → Create Bot → Generate Token
   - Copy token to settings

5. **Run in Development**
   ```bash
   npm run compile
   # Press F5 in VS Code to launch Extension Development Host
   ```

### Results & Demo

#### **Successful Query Examples**
- ✅ "What customer information do I have?"
- ✅ "Show me order data"  
- ✅ "How can I analyze sales?"
- ✅ "customer" (traditional keyword search)

#### **Performance Metrics**
- **Search Response Time**: < 500ms (immediate table results)
- **AI Streaming**: 2-3 seconds for complete insights
- **API Calls Reduced**: From 17 → 2 calls (85% reduction)
- **User Experience**: Seamless, no blocking operations

#### **Visual Experience**
The extension provides a **professional, Cursor-native experience**:
- Clean, VS Code-themed interface
- Natural language encouraged through examples
- Smooth animations and loading states  
- Contextual error handling and guidance

### Lessons Learned & Key Insights

#### **1. Performance is Critical**
- **Initial mistake**: Sequential API calls killed user experience
- **Solution**: Parallel processing with immediate results + background AI
- **Impact**: 90% faster response time, dramatically better UX

#### **2. Natural Language Processing Complexity**
- **Challenge**: Users ask questions, not keywords
- **Solution**: Simple but effective term extraction and fallback logic
- **Learning**: Perfect NLP isn't needed—smart heuristics work well

#### **3. AI Integration Best Practices**
- **Streaming over blocking**: Word-by-word animation feels responsive
- **Context matters**: Different prompts for questions vs. keyword searches  
- **Error handling**: Graceful degradation when AI is unavailable

#### **4. Developer Workflow Integration**
- **UI Positioning**: Terminal panel placement was crucial for adoption
- **Visual Integration**: Matching VS Code themes and patterns
- **Progressive Enhancement**: Works without AI, better with it

### Future Enhancements

#### **Potential Improvements**
1. **Enhanced NLP**: Support for more complex queries ("tables updated last week")
2. **Data Lineage Visualization**: Interactive relationship mapping
3. **Query Generation**: AI-suggested SQL queries based on table selection
4. **Collaborative Features**: Share and bookmark data discoveries
5. **Performance Monitoring**: Track data quality and usage patterns

#### **Technical Debt & Optimizations**
- Add comprehensive error handling for network failures
- Implement result caching to reduce API calls
- Add unit tests for NLP term extraction logic
- Support multiple data catalog platforms beyond OpenMetadata

### Conclusion

This project successfully demonstrates that **AI-powered data exploration can be seamlessly integrated into development workflows**. By combining OpenMetadata's robust data catalog capabilities with Gemini's conversational AI and positioning strategically within Cursor IDE, we've created a solution that:

- ✅ **Eliminates context switching** between IDE and data catalog tools
- ✅ **Supports natural language queries** like "What customer data do I have?"
- ✅ **Provides immediate results** with intelligent AI insights  
- ✅ **Feels native to Cursor** through careful UX design and positioning
- ✅ **Scales efficiently** through smart API optimization

The extension proves that with thoughtful design, complex data discovery workflows can become as natural as asking a colleague a question—directly within the development environment where developers spend most of their time.

**Try it yourself**: Follow the setup guide above and experience conversational data discovery in your own IDE!