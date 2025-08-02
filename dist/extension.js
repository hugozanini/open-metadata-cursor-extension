/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/OpenMetadataExplorerProvider.ts":
/*!*********************************************!*\
  !*** ./src/OpenMetadataExplorerProvider.ts ***!
  \*********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OpenMetadataExplorerProvider = void 0;
const vscode = __importStar(__webpack_require__(/*! vscode */ "vscode"));
const GeminiService_1 = __webpack_require__(/*! ./services/GeminiService */ "./src/services/GeminiService.ts");
const OpenMetadataService_1 = __webpack_require__(/*! ./services/OpenMetadataService */ "./src/services/OpenMetadataService.ts");
class OpenMetadataExplorerProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
        this.openMetadataService = new OpenMetadataService_1.OpenMetadataService();
        this.initializeGeminiService();
    }
    initializeGeminiService() {
        const config = vscode.workspace.getConfiguration('openmetadataExplorer');
        const apiKey = config.get('geminiApiKey');
        if (apiKey) {
            this.geminiService = new GeminiService_1.GeminiService(apiKey);
        }
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'search':
                    await this.handleSearch(data.query);
                    break;
                case 'getConfig':
                    await this.sendConfig();
                    break;
                case 'error':
                    vscode.window.showErrorMessage(data.message);
                    break;
                case 'info':
                    vscode.window.showInformationMessage(data.message);
                    break;
            }
        });
    }
    async handleSearch(query) {
        if (!this._view)
            return;
        try {
            // Show loading state
            this._view.webview.postMessage({
                type: 'searchStarted',
                query: query
            });
            // Search OpenMetadata
            const searchResults = await this.openMetadataService.search(query);
            // Get AI insights if Gemini is available
            let aiInsights = '';
            const enhancedResults = [];
            if (this.geminiService) {
                aiInsights = await this.geminiService.searchInsights(query, searchResults);
                // Enhance each result with AI analysis
                for (const result of searchResults) {
                    const aiAnalysis = await this.geminiService.analyzeTable(result);
                    enhancedResults.push({ ...result, aiAnalysis });
                }
            }
            else {
                enhancedResults.push(...searchResults);
                aiInsights = `Found ${searchResults.length} results. Configure Gemini API key for AI insights.`;
            }
            // Send results back to webview
            this._view.webview.postMessage({
                type: 'searchResults',
                query: query,
                results: enhancedResults,
                aiInsights: aiInsights
            });
        }
        catch (error) {
            console.error('Search error:', error);
            this._view.webview.postMessage({
                type: 'searchError',
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            });
        }
    }
    async sendConfig() {
        if (!this._view)
            return;
        const config = vscode.workspace.getConfiguration('openmetadataExplorer');
        this._view.webview.postMessage({
            type: 'config',
            config: {
                openmetadataUrl: config.get('openmetadataUrl'),
                hasGeminiKey: !!config.get('geminiApiKey')
            }
        });
    }
    refresh() {
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
        }
    }
    _getHtmlForWebview(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.js'));
        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>OpenMetadata AI Explorer</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    font-weight: var(--vscode-font-weight);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    margin: 0;
                    padding: 0;
                }
            </style>
        </head>
        <body>
            <div id="root"></div>
            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
    }
}
exports.OpenMetadataExplorerProvider = OpenMetadataExplorerProvider;
OpenMetadataExplorerProvider.viewType = 'openmetadataExplorer';
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}


/***/ }),

/***/ "./src/extension.ts":
/*!**************************!*\
  !*** ./src/extension.ts ***!
  \**************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(__webpack_require__(/*! vscode */ "vscode"));
const OpenMetadataExplorerProvider_1 = __webpack_require__(/*! ./OpenMetadataExplorerProvider */ "./src/OpenMetadataExplorerProvider.ts");
function activate(context) {
    console.log('OpenMetadata AI Explorer is now active!');
    // Create the webview provider
    const provider = new OpenMetadataExplorerProvider_1.OpenMetadataExplorerProvider(context.extensionUri);
    // Register the webview provider
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('openmetadataExplorer', provider));
    // Register refresh command
    context.subscriptions.push(vscode.commands.registerCommand('openmetadataExplorer.refresh', () => {
        provider.refresh();
    }));
    // Show welcome message
    vscode.window.showInformationMessage('OpenMetadata AI Explorer is ready! 🚀');
}
exports.activate = activate;
function deactivate() {
    console.log('OpenMetadata AI Explorer deactivated');
}
exports.deactivate = deactivate;


/***/ }),

/***/ "./src/services/GeminiService.ts":
/*!***************************************!*\
  !*** ./src/services/GeminiService.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GeminiService = void 0;
class GeminiService {
    constructor(apiKey) {
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
        this.apiKey = apiKey;
    }
    async analyzeTable(tableMetadata) {
        const prompt = `
You are a data engineering expert analyzing database tables. Provide a concise analysis of this table:

TABLE INFORMATION:
- Name: ${tableMetadata.name}
- Full Name: ${tableMetadata.fullyQualifiedName}
- Type: ${tableMetadata.tableType || 'Unknown'}
- Database: ${tableMetadata.database || 'Unknown'}
- Schema: ${tableMetadata.schema || 'Unknown'}
- Description: ${tableMetadata.description || 'No description provided'}
- Row Count: ${tableMetadata.rowCount || 'Unknown'}
- Last Updated: ${tableMetadata.updatedAt || 'Unknown'}
- Tags: ${tableMetadata.tags?.join(', ') || 'None'}

COLUMNS:
${tableMetadata.columns ?
            tableMetadata.columns.slice(0, 10).map((col) => `- ${col.name} (${col.dataType || 'unknown type'}): ${col.description || 'no description'}`).join('\n') : 'Column information not available'}

Please provide:
📊 **Data Summary**: Brief overview (1-2 sentences)
⚠️  **Potential Issues**: Any concerns about data quality, naming, or structure
💡 **Recommendations**: Suggestions for improvement
🔗 **Relationships**: Likely connections to other tables based on column names

Keep your response concise and practical for data engineers.
        `;
        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': this.apiKey
                },
                body: JSON.stringify({
                    contents: [{
                            parts: [{ text: prompt }]
                        }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024
                    }
                })
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Gemini API error:', response.status, errorText);
                return `❌ AI analysis failed (${response.status}). Check your API key in settings.`;
            }
            const data = await response.json();
            if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                return data.candidates[0].content.parts[0].text;
            }
            else {
                console.error('Unexpected Gemini response format:', data);
                return '❌ AI analysis returned unexpected format';
            }
        }
        catch (error) {
            console.error('Error calling Gemini API:', error);
            return `❌ AI analysis failed: ${error instanceof Error ? error.message : 'Network error'}`;
        }
    }
    async searchInsights(query, searchResults) {
        const prompt = `
You are a data discovery assistant helping a user explore their data catalog. 

USER SEARCH: "${query}"

SEARCH RESULTS (${searchResults.length} tables found):
${searchResults.slice(0, 10).map((result, index) => `${index + 1}. ${result.name} (${result.database || 'unknown DB'}.${result.schema || 'unknown schema'})
   - Description: ${result.description || 'No description'}
   - Type: ${result.tableType || 'Unknown'}
   - Rows: ${result.rowCount || 'Unknown'}
   - Tags: ${result.tags?.join(', ') || 'None'}`).join('\n\n')}

Provide helpful insights:
🎯 **What you found**: Summarize the search results relevance to the user's query
📊 **Best matches**: Highlight the most relevant tables
🔍 **Related searches**: Suggest 2-3 related search terms that might be useful
💡 **Data insights**: Any interesting patterns or observations

Keep it concise and actionable for a data engineer.
        `;
        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': this.apiKey
                },
                body: JSON.stringify({
                    contents: [{
                            parts: [{ text: prompt }]
                        }],
                    generationConfig: {
                        temperature: 0.8,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 512
                    }
                })
            });
            if (!response.ok) {
                console.error('Gemini API error for insights:', response.status);
                return `Found ${searchResults.length} tables matching "${query}". Configure Gemini API key for AI insights.`;
            }
            const data = await response.json();
            if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                return data.candidates[0].content.parts[0].text;
            }
            else {
                return `Found ${searchResults.length} tables matching "${query}". AI insights unavailable.`;
            }
        }
        catch (error) {
            console.error('Error getting search insights:', error);
            return `Found ${searchResults.length} tables matching "${query}". Check your internet connection for AI insights.`;
        }
    }
    async validateApiKey() {
        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': this.apiKey
                },
                body: JSON.stringify({
                    contents: [{
                            parts: [{ text: 'Hello' }]
                        }]
                })
            });
            return response.ok;
        }
        catch (error) {
            console.error('Error validating Gemini API key:', error);
            return false;
        }
    }
}
exports.GeminiService = GeminiService;


/***/ }),

/***/ "./src/services/OpenMetadataService.ts":
/*!*********************************************!*\
  !*** ./src/services/OpenMetadataService.ts ***!
  \*********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OpenMetadataService = void 0;
const vscode = __importStar(__webpack_require__(/*! vscode */ "vscode"));
class OpenMetadataService {
    constructor() {
        const config = vscode.workspace.getConfiguration('openmetadataExplorer');
        this.baseUrl = config.get('openmetadataUrl') || 'http://localhost:8585';
    }
    async search(query) {
        try {
            console.log(`Searching OpenMetadata for: ${query}`);
            // First, try the search API
            const searchUrl = `${this.baseUrl}/api/v1/search/query?q=${encodeURIComponent(query)}&index=table_search_index&size=20`;
            const response = await fetch(searchUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // Note: Add authentication headers here if your OpenMetadata requires auth
                    // 'Authorization': 'Bearer token'
                }
            });
            if (!response.ok) {
                // If search fails, try to get all tables and filter locally
                console.log('Search API failed, trying to get all tables...');
                return await this.getAllTablesFiltered(query);
            }
            const data = await response.json();
            console.log('OpenMetadata search response:', data);
            // Transform the search results
            const results = [];
            if (data.hits?.hits) {
                for (const hit of data.hits.hits) {
                    const source = hit._source;
                    results.push({
                        id: source.id || hit._id,
                        name: source.name || source.displayName || 'Unknown',
                        fullyQualifiedName: source.fullyQualifiedName || source.name,
                        description: source.description,
                        tableType: source.tableType,
                        columns: source.columns,
                        rowCount: source.rowCount,
                        database: source.database?.name,
                        schema: source.databaseSchema?.name,
                        updatedAt: source.updatedAt,
                        tags: source.tags?.map((tag) => tag.tagFQN || tag.name) || []
                    });
                }
            }
            console.log(`Found ${results.length} results`);
            return results;
        }
        catch (error) {
            console.error('Error searching OpenMetadata:', error);
            // Fallback: try to get some sample tables
            try {
                return await this.getAllTablesFiltered(query);
            }
            catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
                throw new Error(`Failed to search OpenMetadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    }
    async getAllTablesFiltered(query) {
        try {
            console.log('Fetching all tables as fallback...');
            const tablesUrl = `${this.baseUrl}/api/v1/tables?limit=50`;
            const response = await fetch(tablesUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            console.log('All tables response:', data);
            let tables = data.data || [];
            // Filter tables based on query
            if (query && query.trim()) {
                const queryLower = query.toLowerCase();
                tables = tables.filter((table) => table.name?.toLowerCase().includes(queryLower) ||
                    table.description?.toLowerCase().includes(queryLower) ||
                    table.fullyQualifiedName?.toLowerCase().includes(queryLower));
            }
            // Transform to our format
            const results = tables.map((table) => ({
                id: table.id,
                name: table.name,
                fullyQualifiedName: table.fullyQualifiedName,
                description: table.description,
                tableType: table.tableType,
                columns: table.columns,
                rowCount: table.rowCount,
                database: table.database?.name,
                schema: table.databaseSchema?.name,
                updatedAt: table.updatedAt,
                tags: table.tags?.map((tag) => tag.tagFQN || tag.name) || []
            }));
            console.log(`Filtered to ${results.length} tables`);
            return results;
        }
        catch (error) {
            console.error('Error fetching all tables:', error);
            throw error;
        }
    }
    async getTableDetails(tableId) {
        try {
            const url = `${this.baseUrl}/api/v1/tables/${tableId}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const table = await response.json();
            return {
                id: table.id,
                name: table.name,
                fullyQualifiedName: table.fullyQualifiedName,
                description: table.description,
                tableType: table.tableType,
                columns: table.columns,
                rowCount: table.rowCount,
                database: table.database?.name,
                schema: table.databaseSchema?.name,
                updatedAt: table.updatedAt,
                tags: table.tags?.map((tag) => tag.tagFQN || tag.name) || []
            };
        }
        catch (error) {
            console.error(`Error fetching table ${tableId}:`, error);
            return null;
        }
    }
    async testConnection() {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/system/version`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return response.ok;
        }
        catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }
}
exports.OpenMetadataService = OpenMetadataService;


/***/ }),

/***/ "vscode":
/*!*************************!*\
  !*** external "vscode" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("vscode");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/extension.ts");
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=extension.js.map