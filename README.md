# OpenMetadata AI Explorer

An AI-powered VS Code extension that brings intelligent data discovery to your OpenMetadata catalog. Search for tables, get AI insights, and discover relationships in your data - all without leaving your IDE.

## Features

🔍 **Smart Search** - Natural language search across your OpenMetadata catalog
🤖 **AI Analysis** - Gemini-powered insights about your tables and data quality
📊 **Rich Visualization** - Detailed table information with column details
⚡ **Fast Discovery** - Instantly find related tables and understand relationships
🔗 **Data Lineage** - Interactive lineage visualization with expand/collapse functionality
🎯 **Panel Integration** - Sits right next to your terminal for easy access

## Prerequisites

1. **OpenMetadata running locally** (http://localhost:8585)
   - Follow the [OpenMetadata Docker deployment guide](https://docs.open-metadata.org/latest/quick-start/local-docker-deployment)
   - Make sure you have sample data loaded

2. **Gemini API Key** (optional but recommended for AI features)
   - Get a free API key from [Google AI Studio](https://aistudio.google.com/)
   - Look for keys starting with `AIza...`

## Quick Start

### 1. Install Dependencies
```bash
cd open-metadata-cursor-extension
npm install
```

### 2. Configure the Extension

#### **Method 1: Settings JSON (Recommended)**

1. **Open Settings JSON**
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Type: `Preferences: Open User Settings (JSON)`
   - Press Enter

2. **Add Configuration**
   ```json
   {
     "openmetadataExplorer.openmetadataUrl": "http://localhost:8585",
     "openmetadataExplorer.geminiApiKey": "AIza_YOUR_API_KEY_HERE",
     "openmetadataExplorer.openmetadataAuthToken": "YOUR_OPENMETADATA_BOT_TOKEN_HERE"
   }
   ```

3. **Get Your OpenMetadata Bot Token** (Required for API access)

   **Step 1: Access OpenMetadata Web UI**
   - Open http://localhost:8585 in your browser
   - Login with default credentials (usually `admin` / `admin`)

   **Step 2: Create a Bot Account**
   - Go to **Settings** → **Bots** (in the left sidebar)
   - Click **"Add Bot"**
   - Fill in the bot details:
     - **Name**: `vscode-extension-bot`
     - **Display Name**: `VS Code Extension Bot`
     - **Description**: `Bot for VS Code extension API access`
   - Click **"Create"**

   **Step 3: Generate Bot Token**
   - After creating the bot, click on it to open details
   - Go to the **"Security"** tab
   - Click **"Generate Token"**
   - **Copy the JWT token** (starts with `eyJ`)
   - **Paste it** as the `openmetadataAuthToken` value in your settings.json

   **Step 4: Assign Bot Permissions**
   - Go to **Settings** → **Roles** 
   - Find the **"Data Consumer"** role (or create a custom role)
   - **Assign the role** to your bot
   - This gives the bot permission to read metadata

#### **Method 2: VS Code Settings UI (Alternative)**

1. **Open VS Code Settings**
   - Press `Ctrl+,` (Windows/Linux) or `Cmd+,` (Mac)
   - Or go to **File > Preferences > Settings**

2. **Find Extension Settings**
   - In the search bar, type: **`OpenMetadata AI Explorer`**
   - The extension settings will appear

3. **Configure Your Settings**
   - **OpenMetadata URL**: Should be `http://localhost:8585` (default)
   - **Gemini API Key**: Paste your API key from Google AI Studio (starts with `AIza...`)
   - **OpenMetadata Auth Token**: Paste your bot token from Step 3 above (starts with `eyJ`)

### 3. Run the Extension
1. **Launch Extension**: Press `F5` to launch the extension in a new VS Code window
2. **Find the Panel**: Look for the **"OpenMetadata AI"** panel at the bottom (next to Terminal)
3. **Verify Configuration**: You should see:
   - **OpenMetadata**: ✅ http://localhost:8585
   - **AI Analysis**: ✅ Enabled (if API key is configured)
4. **Start Searching**: Try searching for "customer" or "orders"!

## Usage

### Basic Search
- Type table names, column names, or descriptions
- Click search or press Enter
- Browse results with detailed information

### AI-Powered Search
- Ask questions like "customer data" or "sales tables"
- Get AI insights about data quality and relationships
- Discover patterns and recommendations

### Example Searches
- `customer` - Find all customer-related tables
- `orders` - Discover order and transaction tables  
- `sales` - Locate sales and revenue data
- `product` - Find product catalog tables

### Data Lineage Visualization

The extension now includes interactive data lineage visualization capabilities:

#### **✅ Currently Implemented**
- **Interactive Lineage Graph** - Visual representation of data relationships
- **Expand/Collapse Functionality** - Click (+) buttons to explore deeper lineage levels
- **Directional Expansion** - Left buttons expand upstream, right buttons expand downstream  
- **Smart Collapse Behavior** - Collapsed connections completely remove related nodes from canvas
- **Proper Direction Enforcement** - Right buttons only expand downstream, left buttons only expand upstream
- **Logical Connection Rules** - Downstream nodes cannot disconnect from their upstream parents
- **ReactFlow Integration** - Professional graph visualization with smooth interactions
- **Automatic Layout** - Nodes are automatically positioned for optimal viewing
- **Clean UI** - Minimalist design matching OpenMetadata's visual style

#### **📋 Planned Features (TODO)**
- **Column-Level Lineage** - Show relationships between specific columns
- **Observability Layer** - Display data quality metrics, pipeline runs, and monitoring information
- **Lineage Search** - Search for specific entities within the lineage graph
- **Custom Filters** - Filter lineage by entity type, data source, or other criteria
- **Export Functionality** - Export lineage diagrams as images or documents
- **Performance Optimization** - Code splitting and caching for large lineage graphs

#### **How to Use Lineage**
1. Search for any table using the main search
2. Click the **"View Lineage"** button on any table card
3. Explore the interactive graph:
   - **Click (+) on the left** to expand upstream dependencies
   - **Click (+) on the right** to expand downstream dependencies
   - **Click (-) buttons** to collapse and hide connected nodes
   - **Use mouse wheel** to zoom in/out
   - **Drag nodes** to reposition them

> **Note**: Column and Observability layers are **not yet implemented**. This represents the current phase of development focusing on core table-level lineage functionality. Future iterations will add these advanced features.

## Development

### Project Structure
```
open-metadata-cursor-extension/
├── src/
│   ├── extension.ts                 # Main extension entry point
│   ├── OpenMetadataExplorerProvider.ts  # Webview provider
│   ├── services/
│   │   ├── OpenMetadataService.ts   # OpenMetadata API client
│   │   ├── GeminiService.ts         # Gemini AI integration
│   │   └── LineageService.ts        # Lineage data fetching and processing
│   └── webview/
│       ├── App.tsx                  # Main React app
│       ├── components/
│       │   ├── Lineage/             # Lineage visualization components
│       │   │   ├── LineageViewer.tsx    # Main lineage graph component
│       │   │   ├── LineageModal.tsx     # Lineage modal wrapper
│       │   │   ├── LineageNode.tsx      # Individual node component
│       │   │   ├── ExpandCollapseButtons.tsx  # Node interaction buttons
│       │   │   ├── CustomEdge.tsx       # Custom edge styling
│       │   │   ├── LayersPanel.tsx      # Future: layers control panel
│       │   │   └── LineageUtils.ts      # Lineage utility functions
│       │   ├── SearchInterface.tsx  # Search input and controls
│       │   ├── ResultsList.tsx      # Search results display
│       │   ├── TableCard.tsx        # Individual table card
│       │   └── ...                  # Other components
│       └── styles.css               # Styling
├── memory-bank/                     # Development documentation
├── package.json
└── webpack.config.js
```

### Building
```bash
# Development build with watch
npm run watch

# Production build
npm run compile
```

### Testing
1. Make sure OpenMetadata is running at http://localhost:8585
2. Press F5 to launch the extension
3. Try searching for tables in your OpenMetadata instance

## Configuration

The extension can be configured through VS Code settings:

| Setting | Description | Default |
|---------|-------------|---------|
| `openmetadataExplorer.openmetadataUrl` | OpenMetadata server URL | `http://localhost:8585` |
| `openmetadataExplorer.geminiApiKey` | Your Gemini API key for AI features | (empty) |
| `openmetadataExplorer.openmetadataAuthToken` | OpenMetadata bot authentication token (JWT) | (empty) |

## Troubleshooting

### **Configuration Issues**

#### ❌ "Configure Gemini API key" warning
**Problem**: AI Analysis shows ⚠️ Configure Gemini API key
**Solution**: 
1. Go to VS Code Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "OpenMetadata AI Explorer"
3. Add your Gemini API key (starts with `AIza...`)
4. Restart the extension (close debug window and press `F5` again)

#### ❌ HTTP 401: Unauthorized / Authentication Failed
**Problem**: "Failed to search OpenMetadata: HTTP 401: Unauthorized"
**Solution**:
1. **Get an OpenMetadata bot token** (see configuration instructions above)
2. **Add the token** to your VS Code settings.json:
   ```json
   {
     "openmetadataExplorer.openmetadataAuthToken": "eyJ_YOUR_BOT_TOKEN_HERE"
   }
   ```
3. **Restart the extension** (close debug window and press `F5` again)
4. **Verify the token** by checking if search works

#### ❌ OpenMetadata connection failed
**Problem**: OpenMetadata shows as not configured or unreachable
**Solution**:
1. Ensure OpenMetadata is running: `docker ps` should show containers
2. Visit http://localhost:8585 in your browser to verify it's accessible
3. Check your OpenMetadata URL setting in VS Code
4. **If you get 401 errors**, make sure you have an authentication token configured (see above)

### **Search Issues**

#### ❌ "No results found"
**Problem**: Search returns no tables even though OpenMetadata has data
**Solutions**:
- Verify you have tables/data loaded in OpenMetadata (visit the web UI)
- Try broader search terms like "user", "customer", or "order"
- Check OpenMetadata logs for API errors: `docker logs <openmetadata-container>`

#### ❌ Search takes too long or times out
**Solutions**:
- Check your internet connection (needed for AI analysis)
- Try searching without AI by configuring no Gemini API key temporarily
- Restart OpenMetadata containers if they're unresponsive

### **Extension Issues**

#### ❌ Extension won't load or debug fails
**Solutions**:
1. **Install dependencies**: `npm install`
2. **Rebuild**: `npm run compile`
3. **Check for errors**: Open VS Code Developer Console (`Help > Toggle Developer Tools`)
4. **Restart VS Code** completely

#### ❌ Panel doesn't appear at bottom
**Solutions**:
1. Press `F5` to launch the extension
2. Look for "OpenMetadata AI" tab at the bottom panel (next to Terminal, Output, etc.)
3. If not visible, try `View > Panel` to show the bottom panel

### **What Success Looks Like**

✅ **Properly configured extension shows**:
- **Configuration Status**: 
  - OpenMetadata: ✅ http://localhost:8585
  - AI Analysis: ✅ Enabled
- **Authentication**: No more "HTTP 401: Unauthorized" errors
- **Search functionality**: Returns tables with details and metadata
- **AI features**: Shows insights and analysis for each table
- **Responsive UI**: Fast search and smooth interactions

## Development Status & Roadmap

### ✅ **Completed Features (v1.0)**
- **Core Search & Discovery** - Full-text search across OpenMetadata catalog
- **AI Integration** - Gemini-powered insights and natural language search
- **Authentication System** - JWT bot token authentication with OpenMetadata
- **Rich UI Components** - Professional React-based interface
- **Data Lineage Foundation** - Complete table-level lineage visualization with:
  - Interactive expand/collapse functionality
  - Directional expansion controls (upstream/downstream)
  - Smart node management and layout
  - ReactFlow integration with custom styling

### 🚧 **Next Phase Development (v2.0)**
- **Column-Level Lineage** - Detailed column-to-column relationships
- **Observability Integration** - Data quality metrics, pipeline monitoring
- **Performance Optimization** - Code splitting, caching, large graph handling
- **Advanced Lineage Features** - Search, filters, export capabilities

### 📚 **Documentation**
The `memory-bank/` folder contains comprehensive development documentation including:
- API integration patterns and examples
- Feature implementation details and architecture decisions  
- Troubleshooting guides and common issues
- Technical context and system patterns
- Progress tracking and development history

This documentation serves as a knowledge base for future development and maintenance.

## Contributing

This is a university project demonstrating AI integration with data catalogs. The extension showcases:

- VS Code webview development with React
- OpenMetadata API integration  
- Gemini AI for data analysis
- Real-time search and discovery

## License

MIT License - feel free to use and modify for your own projects!