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
const LineageService_1 = __webpack_require__(/*! ./services/LineageService */ "./src/services/LineageService.ts");
const OpenMetadataService_1 = __webpack_require__(/*! ./services/OpenMetadataService */ "./src/services/OpenMetadataService.ts");
class OpenMetadataExplorerProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
        this.openMetadataService = new OpenMetadataService_1.OpenMetadataService();
        this.initializeGeminiService();
        this.initializeLineageService();
    }
    initializeGeminiService() {
        const config = vscode.workspace.getConfiguration('openmetadataExplorer');
        const apiKey = config.get('geminiApiKey');
        if (apiKey) {
            this.geminiService = new GeminiService_1.GeminiService(apiKey);
        }
    }
    initializeLineageService() {
        const config = vscode.workspace.getConfiguration('openmetadataExplorer');
        const openmetadataUrl = config.get('openmetadataUrl') || 'http://localhost:8585';
        const authToken = config.get('openmetadataAuthToken') || '';
        this.lineageService = new LineageService_1.LineageService(openmetadataUrl, authToken);
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
                case 'getLineage':
                    await this.handleGetLineage(data.tableFqn, data.entityType);
                    break;
                case 'expandLineage':
                    await this.handleExpandLineage(data.tableFqn, data.nodeId, data.direction, data.entityType);
                    break;
                case 'collapseLineage':
                    await this.handleCollapseLineage(data.tableFqn, data.nodeId, data.direction);
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
            // Search OpenMetadata with natural language processing
            const searchResult = await this.openMetadataService.searchWithNaturalLanguage(query);
            // Send results immediately for fast display
            this._view.webview.postMessage({
                type: 'searchResults',
                query: query,
                results: searchResult.results,
                aiInsights: '',
                searchContext: {
                    originalQuery: query,
                    searchTermsUsed: searchResult.searchTermsUsed,
                    wasNaturalLanguage: searchResult.wasNaturalLanguage
                }
            });
            // Get AI insights asynchronously if Gemini is available
            if (this.geminiService && searchResult.results.length > 0) {
                try {
                    const aiInsights = await this.geminiService.searchInsights(query, searchResult.results, searchResult.searchTermsUsed, searchResult.wasNaturalLanguage);
                    // Send AI insights as a separate update
                    this._view.webview.postMessage({
                        type: 'aiInsightsUpdate',
                        aiInsights: aiInsights
                    });
                }
                catch (error) {
                    console.error('AI insights error:', error);
                    this._view.webview.postMessage({
                        type: 'aiInsightsUpdate',
                        aiInsights: searchResult.wasNaturalLanguage
                            ? `I found ${searchResult.results.length} tables related to ${searchResult.searchTermsUsed.join(' and ')}. AI analysis is currently unavailable.`
                            : `Found ${searchResult.results.length} tables. AI analysis is currently unavailable.`
                    });
                }
            }
            else if (!this.geminiService) {
                this._view.webview.postMessage({
                    type: 'aiInsightsUpdate',
                    aiInsights: searchResult.wasNaturalLanguage
                        ? `I found ${searchResult.results.length} tables related to ${searchResult.searchTermsUsed.join(' and ')}. Configure Gemini API key in settings for AI analysis.`
                        : `Found ${searchResult.results.length} tables. Configure Gemini API key in settings for AI analysis.`
                });
            }
        }
        catch (error) {
            console.error('Search error:', error);
            this._view.webview.postMessage({
                type: 'searchError',
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            });
        }
    }
    async handleGetLineage(tableFqn, entityType = 'table') {
        if (!this._view)
            return;
        try {
            // Get simple lineage data
            const lineageData = await this.lineageService.getSimpleLineage(tableFqn, entityType, 2);
            // Send lineage data to webview
            this._view.webview.postMessage({
                type: 'lineageData',
                tableFqn: tableFqn,
                lineageData: lineageData
            });
        }
        catch (error) {
            console.error('Lineage error:', error);
            this._view.webview.postMessage({
                type: 'lineageError',
                tableFqn: tableFqn,
                error: error instanceof Error ? error.message : 'Failed to load lineage data'
            });
        }
    }
    async handleExpandLineage(tableFqn, nodeId, direction, entityType = 'table') {
        if (!this._view)
            return;
        try {
            console.log(`Expanding lineage for node ${nodeId} in direction ${direction}`);
            // Get lineage data in the specified direction only
            let expandedData;
            if (direction === 'upstream') {
                // Only get upstream data
                expandedData = await this.lineageService.getDirectionalLineage(nodeId, entityType, 2, 0);
            }
            else if (direction === 'downstream') {
                // Only get downstream data  
                expandedData = await this.lineageService.getDirectionalLineage(nodeId, entityType, 0, 2);
            }
            else {
                // Fallback - get both directions (shouldn't happen)
                expandedData = await this.lineageService.getSimpleLineage(nodeId, entityType, 2);
            }
            // Send expanded data to webview to be merged
            this._view.webview.postMessage({
                type: 'expandedLineageData',
                tableFqn: tableFqn,
                nodeId: nodeId,
                direction: direction,
                expandedData: expandedData
            });
        }
        catch (error) {
            console.error('Expand lineage error:', error);
            // If there's no additional data, send an empty response
            this._view.webview.postMessage({
                type: 'expandedLineageData',
                tableFqn: tableFqn,
                nodeId: nodeId,
                direction: direction,
                expandedData: { nodes: [], edges: [], centerNode: null }
            });
        }
    }
    async handleCollapseLineage(tableFqn, nodeId, direction) {
        if (!this._view)
            return;
        console.log(`Collapsing lineage for node ${nodeId} in direction ${direction}`);
        // Send collapse confirmation to webview
        this._view.webview.postMessage({
            type: 'collapsedLineage',
            tableFqn: tableFqn,
            nodeId: nodeId,
            direction: direction
        });
    }
    async sendConfig() {
        if (!this._view)
            return;
        const config = vscode.workspace.getConfiguration('openmetadataExplorer');
        this._view.webview.postMessage({
            type: 'config',
            config: {
                openmetadataUrl: config.get('openmetadataUrl'),
                hasGeminiKey: !!config.get('geminiApiKey'),
                hasAuthToken: !!config.get('openmetadataAuthToken')
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
        const logoUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'assets', 'extension-logo.svg'));
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
                    padding: 10px;
                }
                .loading {
                    text-align: center;
                    padding: 20px;
                }
            </style>
        </head>
        <body>
            <div class="loading">
                <h2>🔍 OpenMetadata AI Explorer</h2>
                <p>Loading...</p>
            </div>
            <div id="root"></div>
            <script nonce="${nonce}">
                console.log('Webview script starting...');
                console.log('Script URI: ${scriptUri}');
                
                // Make logo URI available globally
                window.extensionLogoUri = '${logoUri}';
                
                // Show loading message
                setTimeout(() => {
                    const loading = document.querySelector('.loading');
                    if (loading && !document.querySelector('.app')) {
                        loading.innerHTML = '<h2>⚠️ Loading Failed</h2><p>Check the developer console for errors.</p>';
                    }
                }, 5000);
            </script>
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
    async searchInsights(query, searchResults, searchTermsUsed, wasNaturalLanguage) {
        const prompt = wasNaturalLanguage ? `
The user asked: "${query}"

I found ${searchResults.length} tables by searching for: ${searchTermsUsed.join(', ')}

Tables found: ${searchResults.slice(0, 5).map(r => `${r.name} - ${r.description || 'stores data'}`).join('; ')}

Respond conversationally as if answering the user's question directly. Explain what customer information they have based on these tables.

Format:
Based on your data catalog, you have [describe the types of customer information available]. The main tables are [explain key tables and what customer data they contain]. 

You might also want to explore: [2 related searches]

Be helpful and conversational - like a data assistant.
        ` : `
You're analyzing ${searchResults.length} tables found for "${query}".

Tables: ${searchResults.slice(0, 5).map(r => `${r.name} (${r.description || 'no description'})`).join('; ')}

Write a natural explanation about what these tables contain and why they're relevant. Then suggest 2 related searches.

Format:
The key tables for ${query} include [explain what each does and why it's relevant]. These tables help with [business context]. 

You might also want to explore: [related term 1], [related term 2]

Be informative but concise - like Google's AI overview.
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
                        topK: 30,
                        topP: 0.95,
                        maxOutputTokens: 150
                    }
                })
            });
            if (!response.ok) {
                console.error('Gemini API error for insights:', response.status);
                return wasNaturalLanguage
                    ? `I found ${searchResults.length} tables related to ${searchTermsUsed.join(' and ')}. Configure Gemini API key for AI insights.`
                    : `Found ${searchResults.length} tables matching "${query}". Configure Gemini API key for AI insights.`;
            }
            const data = await response.json();
            if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                return data.candidates[0].content.parts[0].text;
            }
            else {
                return wasNaturalLanguage
                    ? `I found ${searchResults.length} tables related to ${searchTermsUsed.join(' and ')}. AI insights unavailable.`
                    : `Found ${searchResults.length} tables matching "${query}". AI insights unavailable.`;
            }
        }
        catch (error) {
            console.error('Error getting search insights:', error);
            return wasNaturalLanguage
                ? `I found ${searchResults.length} tables related to ${searchTermsUsed.join(' and ')}. Check your internet connection for AI insights.`
                : `Found ${searchResults.length} tables matching "${query}". Check your internet connection for AI insights.`;
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

/***/ "./src/services/LineageService.ts":
/*!****************************************!*\
  !*** ./src/services/LineageService.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, exports) => {


/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LineageService = void 0;
class LineageService {
    constructor(baseURL, authToken) {
        this.baseURL = baseURL.replace(/\/$/, ''); // Remove trailing slash
        this.authToken = authToken;
    }
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        return headers;
    }
    /**
     * Fetch lineage data for a specific entity
     */
    async getLineageData(fqn, entityType, config) {
        const { upstreamDepth = 1, downstreamDepth = 1, nodesPerLayer = 50 } = config || {};
        try {
            const params = new URLSearchParams({
                fqn: fqn,
                type: entityType,
                // OpenMetadata API expects upstreamDepth to be n-1 for n levels
                upstreamDepth: upstreamDepth === 0 ? '0' : (upstreamDepth - 1).toString(),
                downstreamDepth: downstreamDepth.toString(),
                includeDeleted: 'false',
                size: nodesPerLayer.toString(),
            });
            const response = await fetch(`${this.baseURL}/api/v1/lineage/getLineage?${params}`, {
                method: 'GET',
                headers: this.getAuthHeaders(),
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch lineage data: HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            return data;
        }
        catch (error) {
            console.error('Error fetching lineage data:', error);
            throw error;
        }
    }
    /**
     * Get lineage data in a specific direction only
     */
    async getDirectionalLineage(fqn, entityType = 'table', upstreamDepth = 0, downstreamDepth = 0) {
        try {
            const lineageData = await this.getLineageData(fqn, entityType, {
                upstreamDepth,
                downstreamDepth,
            });
            // Extract nodes from the lineage data
            const nodes = Object.values(lineageData.nodes).map(nodeData => nodeData.entity);
            // Find the center node (the one we requested lineage for)
            const centerNode = nodes.find(node => node.fullyQualifiedName === fqn);
            if (!centerNode) {
                throw new Error(`Center node not found for FQN: ${fqn}`);
            }
            // Combine upstream and downstream edges
            const allEdges = [];
            // Add upstream edges if requested
            if (upstreamDepth > 0 && lineageData.upstreamEdges) {
                allEdges.push(...lineageData.upstreamEdges);
            }
            // Add downstream edges if requested
            if (downstreamDepth > 0 && lineageData.downstreamEdges) {
                allEdges.push(...lineageData.downstreamEdges);
            }
            return {
                nodes,
                edges: allEdges,
                centerNode
            };
        }
        catch (error) {
            console.error('Error getting directional lineage:', error);
            throw error;
        }
    }
    /**
     * Get simplified lineage data with just the essential information
     */
    async getSimpleLineage(fqn, entityType = 'table', depth = 2) {
        try {
            const lineageData = await this.getLineageData(fqn, entityType, {
                upstreamDepth: depth,
                downstreamDepth: depth,
            });
            // Extract nodes from the lineage data
            const nodes = Object.values(lineageData.nodes).map(nodeData => nodeData.entity);
            // Find the center node (the one we requested lineage for)
            const centerNode = nodes.find(node => node.fullyQualifiedName === fqn);
            if (!centerNode) {
                throw new Error(`Center node not found for FQN: ${fqn}`);
            }
            // Combine upstream and downstream edges
            const edges = [
                ...Object.values(lineageData.upstreamEdges),
                ...Object.values(lineageData.downstreamEdges),
            ];
            return {
                nodes,
                edges,
                centerNode,
            };
        }
        catch (error) {
            console.error('Error getting simple lineage:', error);
            throw error;
        }
    }
    /**
     * Check if lineage data is available for an entity
     */
    async hasLineage(fqn, entityType = 'table') {
        try {
            const lineageData = await this.getLineageData(fqn, entityType, {
                upstreamDepth: 1,
                downstreamDepth: 1,
            });
            const hasUpstream = Object.keys(lineageData.upstreamEdges).length > 0;
            const hasDownstream = Object.keys(lineageData.downstreamEdges).length > 0;
            return hasUpstream || hasDownstream;
        }
        catch (error) {
            console.error('Error checking lineage availability:', error);
            return false;
        }
    }
}
exports.LineageService = LineageService;


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
        this.authToken = config.get('openmetadataAuthToken');
    }
    // Extract meaningful search terms from natural language queries
    extractSearchTerms(query) {
        // Remove common question words and phrases
        const stopWords = [
            'what', 'where', 'when', 'how', 'why', 'which', 'who',
            'do', 'does', 'did', 'can', 'could', 'would', 'should',
            'i', 'have', 'get', 'find', 'show', 'me', 'my', 'the', 'a', 'an',
            'is', 'are', 'was', 'were', 'about', 'for', 'with', 'in', 'on',
            'information', 'data', 'table', 'tables'
        ];
        // Extract potential data-related terms
        const dataTerms = [
            'customer', 'customers', 'user', 'users', 'client', 'clients',
            'order', 'orders', 'purchase', 'purchases', 'transaction', 'transactions',
            'product', 'products', 'item', 'items', 'inventory',
            'sale', 'sales', 'revenue', 'payment', 'payments',
            'address', 'addresses', 'location', 'locations',
            'profile', 'profiles', 'account', 'accounts',
            'metric', 'metrics', 'analytics', 'report', 'reports'
        ];
        const words = query.toLowerCase()
            .replace(/[^\w\s]/g, ' ') // Remove punctuation
            .split(/\s+/)
            .filter(word => word.length > 2);
        // Find data-related terms or use non-stop words
        const searchTerms = words.filter(word => dataTerms.includes(word) || !stopWords.includes(word));
        return searchTerms.length > 0 ? searchTerms : words.filter(word => !stopWords.includes(word));
    }
    isNaturalLanguageQuery(query) {
        const questionWords = ['what', 'where', 'when', 'how', 'why', 'which', 'who'];
        const questionMarkers = ['?', 'do i have', 'can i find', 'show me', 'tell me'];
        const lowerQuery = query.toLowerCase();
        return questionWords.some(word => lowerQuery.startsWith(word)) ||
            questionMarkers.some(marker => lowerQuery.includes(marker)) ||
            query.includes('?');
    }
    // Enhanced search that handles natural language
    async searchWithNaturalLanguage(query) {
        try {
            console.log(`Searching OpenMetadata for: ${query}`);
            // Try original query first
            let results = await this.search(query);
            // If no results and query looks like natural language, try extracted terms
            if (results.length === 0 && this.isNaturalLanguageQuery(query)) {
                const searchTerms = this.extractSearchTerms(query);
                console.log(`No results for original query. Trying extracted terms: ${searchTerms.join(', ')}`);
                if (searchTerms.length > 0) {
                    const allResults = [];
                    const foundTerms = [];
                    for (const term of searchTerms) {
                        try {
                            const termResults = await this.search(term);
                            if (termResults.length > 0) {
                                foundTerms.push(term);
                                // Add results, avoiding duplicates
                                termResults.forEach(result => {
                                    if (!allResults.find(r => r.id === result.id)) {
                                        allResults.push(result);
                                    }
                                });
                            }
                        }
                        catch (error) {
                            console.warn(`Failed to search for term: ${term}`, error);
                        }
                    }
                    console.log(`Found ${allResults.length} results using extracted terms: ${foundTerms.join(', ')}`);
                    return {
                        results: allResults.slice(0, 20),
                        searchTermsUsed: foundTerms,
                        wasNaturalLanguage: true
                    };
                }
            }
            return {
                results,
                searchTermsUsed: [query],
                wasNaturalLanguage: false
            };
        }
        catch (error) {
            console.error('Error searching OpenMetadata:', error);
            throw error;
        }
    }
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        return headers;
    }
    async search(query) {
        try {
            console.log(`Searching OpenMetadata for: ${query}`);
            // First, try the search API
            const searchUrl = `${this.baseUrl}/api/v1/search/query?q=${encodeURIComponent(query)}&index=table_search_index&size=20`;
            const response = await fetch(searchUrl, {
                method: 'GET',
                headers: this.getAuthHeaders()
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
                headers: this.getAuthHeaders()
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
                headers: this.getAuthHeaders()
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
                headers: this.getAuthHeaders()
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