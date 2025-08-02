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
cd openmetadata-ai-explorer
npm install
```

### 2. Configure the Extension
1. Open VS Code settings (Ctrl/Cmd + ,)
2. Search for "OpenMetadata AI Explorer"
3. Set your configuration:
   - **OpenMetadata URL**: `http://localhost:8585` (default)
   - **Gemini API Key**: Your API key from Google AI Studio

### 3. Run the Extension
1. Press `F5` to launch the extension in a new VS Code window
2. Look for the "OpenMetadata AI Explorer" panel at the bottom
3. Start searching your data!

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
openmetadata-ai-explorer/
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

### "No results found"
- Check that OpenMetadata is running at http://localhost:8585
- Verify you have tables/data loaded in OpenMetadata
- Try broader search terms like "user" or "order"

### "AI analysis failed"
- Ensure you have a valid Gemini API key configured
- Check your internet connection
- Verify the API key in VS Code settings

### Extension won't load
- Make sure you ran `npm install`
- Try rebuilding with `npm run compile`
- Check the VS Code Developer Console for errors

## Contributing

This is a university project demonstrating AI integration with data catalogs. The extension showcases:

- VS Code webview development with React
- OpenMetadata API integration  
- Gemini AI for data analysis
- Real-time search and discovery

## License

MIT License - feel free to use and modify for your own projects!