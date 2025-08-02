# OpenMetadata AI Explorer

An AI-powered VS Code extension that brings intelligent data discovery to your OpenMetadata catalog. Search for tables, get AI insights, and discover relationships in your data - all without leaving your IDE.

## Features

🔍 **Smart Search** - Natural language search across your OpenMetadata catalog
🤖 **AI Analysis** - Gemini-powered insights about your tables and data quality
📊 **Rich Visualization** - Detailed table information with column details
⚡ **Fast Discovery** - Instantly find related tables and understand relationships
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

#### **Method 1: VS Code Settings UI (Recommended)**

1. **Open VS Code Settings**
   - Press `Ctrl+,` (Windows/Linux) or `Cmd+,` (Mac)
   - Or go to **File > Preferences > Settings**

2. **Find Extension Settings**
   - In the search bar, type: **`OpenMetadata AI Explorer`**
   - The extension settings will appear

3. **Configure Your Settings**
   - **OpenMetadata URL**: Should be `http://localhost:8585` (default)
   - **Gemini API Key**: Paste your API key from Google AI Studio (starts with `AIza...`)

#### **Method 2: Settings JSON (Alternative)**

1. **Open Settings JSON**
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Type: `Preferences: Open User Settings (JSON)`
   - Press Enter

2. **Add Configuration**
   ```json
   {
     "openmetadataExplorer.geminiApiKey": "AIza_YOUR_API_KEY_HERE",
     "openmetadataExplorer.openmetadataUrl": "http://localhost:8585"
   }
   ```

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

## Development

### Project Structure
```
open-metadata-cursor-extension/
├── src/
│   ├── extension.ts                 # Main extension entry point
│   ├── OpenMetadataExplorerProvider.ts  # Webview provider
│   ├── services/
│   │   ├── OpenMetadataService.ts   # OpenMetadata API client
│   │   └── GeminiService.ts         # Gemini AI integration
│   └── webview/
│       ├── App.tsx                  # Main React app
│       ├── components/              # React components
│       └── styles.css               # Styling
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

## Troubleshooting

### **Configuration Issues**

#### ❌ "Configure Gemini API key" warning
**Problem**: AI Analysis shows ⚠️ Configure Gemini API key
**Solution**: 
1. Go to VS Code Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "OpenMetadata AI Explorer"
3. Add your Gemini API key (starts with `AIza...`)
4. Restart the extension (close debug window and press `F5` again)

#### ❌ OpenMetadata connection failed
**Problem**: OpenMetadata shows as not configured or unreachable
**Solution**:
1. Ensure OpenMetadata is running: `docker ps` should show containers
2. Visit http://localhost:8585 in your browser to verify it's accessible
3. Check your OpenMetadata URL setting in VS Code

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
- **Search functionality**: Returns tables with details
- **AI features**: Shows insights and analysis for each table
- **Responsive UI**: Fast search and smooth interactions

## Contributing

This is a university project demonstrating AI integration with data catalogs. The extension showcases:

- VS Code webview development with React
- OpenMetadata API integration  
- Gemini AI for data analysis
- Real-time search and discovery

## License

MIT License - feel free to use and modify for your own projects!