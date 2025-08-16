import * as vscode from 'vscode';
import { GeminiService } from './services/GeminiService';
import { LineageService } from './services/LineageService';
import { ModeManagerService } from './services/ModeManagerService';
import { OpenMetadataService } from './services/OpenMetadataService';

export class OpenMetadataExplorerProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'openmetadataExplorer';
    private _view?: vscode.WebviewView;
    private openMetadataService: OpenMetadataService;
    private geminiService?: GeminiService;
    private lineageService!: LineageService;
    private modeManagerService!: ModeManagerService;

    constructor(private readonly _extensionUri: vscode.Uri, private context: vscode.ExtensionContext) {
        console.log('🔧 OpenMetadataExplorerProvider: Starting constructor...');
        
        try {
            console.log('🗄️ Initializing OpenMetadata service...');
            this.openMetadataService = new OpenMetadataService();
            
            console.log('🤖 Initializing Gemini service...');
            this.initializeGeminiService();
            
            console.log('📊 Initializing Lineage service...');
            this.initializeLineageService();
            
            console.log('🎤 Initializing ModeManager service...');
            // Initialize ModeManagerService asynchronously
            this.initializeModeManagerService().catch(error => {
                console.error('❌ Failed to initialize ModeManagerService:', error);
            });
            
            console.log('✅ OpenMetadataExplorerProvider constructor completed');
        } catch (error) {
            console.error('❌ Error in OpenMetadataExplorerProvider constructor:', error);
            throw error;
        }
    }

    private initializeGeminiService() {
        const config = vscode.workspace.getConfiguration('openmetadataExplorer');
        const apiKey = config.get<string>('geminiApiKey');
        
        if (apiKey) {
            this.geminiService = new GeminiService(apiKey);
        }
    }

    private initializeLineageService() {
        const config = vscode.workspace.getConfiguration('openmetadataExplorer');
        const openmetadataUrl = config.get<string>('openmetadataUrl') || 'http://localhost:8585';
        const authToken = config.get<string>('openmetadataAuthToken') || '';
        
        this.lineageService = new LineageService(openmetadataUrl, authToken);
    }

    private async initializeModeManagerService() {
        this.modeManagerService = new ModeManagerService(this.context);
        await this.modeManagerService.initialize();
        
        // Set up message handler for webview communication
        this.modeManagerService.setMessageHandler((message) => {
            this._view?.webview.postMessage(message);
        });
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
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
                case 'openVibeCoder':
                    await this.handleOpenVibeCoder();
                    break;
                // Forward all other messages to ModeManagerService
                default:
                    if (this.modeManagerService) {
                        try {
                            const response = await this.modeManagerService.handleMessage(data);
                            if (response) {
                                this._view?.webview.postMessage(response);
                            }
                        } catch (error) {
                            console.error('Error handling message in ModeManagerService:', error);
                        }
                    } else {
                        console.warn('ModeManagerService not initialized yet, ignoring message:', data.type);
                    }
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

    private async handleSearch(query: string) {
        if (!this._view) return;

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
                    const aiInsights = await this.geminiService.searchInsights(
                        query, 
                        searchResult.results, 
                        searchResult.searchTermsUsed, 
                        searchResult.wasNaturalLanguage
                    );
                    
                    // Send AI insights as a separate update
                    this._view.webview.postMessage({
                        type: 'aiInsightsUpdate',
                        aiInsights: aiInsights
                    });
                } catch (error) {
                    console.error('AI insights error:', error);
                    this._view.webview.postMessage({
                        type: 'aiInsightsUpdate',
                        aiInsights: searchResult.wasNaturalLanguage 
                            ? `I found ${searchResult.results.length} tables related to ${searchResult.searchTermsUsed.join(' and ')}. AI analysis is currently unavailable.`
                            : `Found ${searchResult.results.length} tables. AI analysis is currently unavailable.`
                    });
                }
            } else if (!this.geminiService) {
                this._view.webview.postMessage({
                    type: 'aiInsightsUpdate',
                    aiInsights: searchResult.wasNaturalLanguage 
                        ? `I found ${searchResult.results.length} tables related to ${searchResult.searchTermsUsed.join(' and ')}. Configure Gemini API key in settings for AI analysis.`
                        : `Found ${searchResult.results.length} tables. Configure Gemini API key in settings for AI analysis.`
                });
            }

        } catch (error) {
            console.error('Search error:', error);
            this._view.webview.postMessage({
                type: 'searchError',
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            });
        }
    }

    private async handleOpenVibeCoder() {
        if (!this._view) return;

        // Send message to webview to open the Vibe Coder modal
        this._view.webview.postMessage({
            type: 'openVibeCoderModal'
        });
    }

    private async handleGetLineage(tableFqn: string, entityType: string = 'table') {
        if (!this._view) return;

        try {
            // Get simple lineage data
            const lineageData = await this.lineageService.getSimpleLineage(tableFqn, entityType, 2);
            
            // Send lineage data to webview
            this._view.webview.postMessage({
                type: 'lineageData',
                tableFqn: tableFqn,
                lineageData: lineageData
            });

        } catch (error) {
            console.error('Lineage error:', error);
            this._view.webview.postMessage({
                type: 'lineageError',
                tableFqn: tableFqn,
                error: error instanceof Error ? error.message : 'Failed to load lineage data'
            });
        }
    }

    private async handleExpandLineage(tableFqn: string, nodeId: string, direction: string, entityType: string = 'table') {
        if (!this._view) return;

        try {
            console.log(`Expanding lineage for node ${nodeId} in direction ${direction}`);
            
            // Get lineage data in the specified direction only
            let expandedData;
            if (direction === 'upstream') {
                // Only get upstream data
                expandedData = await this.lineageService.getDirectionalLineage(nodeId, entityType, 2, 0);
            } else if (direction === 'downstream') {
                // Only get downstream data  
                expandedData = await this.lineageService.getDirectionalLineage(nodeId, entityType, 0, 2);
            } else {
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

        } catch (error) {
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

    private async handleCollapseLineage(tableFqn: string, nodeId: string, direction: string) {
        if (!this._view) return;

        console.log(`Collapsing lineage for node ${nodeId} in direction ${direction}`);
        
        // Send collapse confirmation to webview
        this._view.webview.postMessage({
            type: 'collapsedLineage',
            tableFqn: tableFqn,
            nodeId: nodeId,
            direction: direction
        });
    }

    private async sendConfig() {
        if (!this._view) return;

        const config = vscode.workspace.getConfiguration('openmetadataExplorer');
        
        this._view.webview.postMessage({
            type: 'config',
            config: {
                openmetadataUrl: config.get<string>('openmetadataUrl'),
                hasGeminiKey: !!config.get<string>('geminiApiKey'),
                hasAuthToken: !!config.get<string>('openmetadataAuthToken')
            }
        });
    }

    public refresh() {
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.js')
        );

        const logoUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'assets', 'extension-logo.svg')
        );

        const workerUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'dist', 'whisperWorker.js')
        );

        console.log('🔗 Webview script URI:', scriptUri.toString());
        console.log('🖼️ Logo URI:', logoUri.toString());

        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}' https://cdn.jsdelivr.net 'unsafe-eval'; worker-src ${webview.cspSource} blob:; connect-src https: ${webview.cspSource};">
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
                console.log('🚀 Webview script starting...');
                console.log('📍 Script URI: ${scriptUri}');
                console.log('🖼️ Logo URI: ${logoUri}');
                
                // Make URIs available globally
                window.extensionLogoUri = '${logoUri}';
                window.whisperWorkerUri = '${workerUri}';
                
                // Show loading message
                setTimeout(() => {
                    const loading = document.querySelector('.loading');
                    if (loading && !document.querySelector('.app')) {
                        console.error('❌ React app failed to load within 5 seconds');
                        loading.innerHTML = '<h2>⚠️ Loading Failed</h2><p>React app failed to load. Check the developer console for errors.</p>';
                    }
                }, 5000);
                
                // Check if the main script loads
                const script = document.querySelector('script[src="${scriptUri}"]');
                if (script) {
                    script.addEventListener('load', () => {
                        console.log('✅ Main script loaded successfully');
                    });
                    script.addEventListener('error', (e) => {
                        console.error('❌ Failed to load main script:', e);
                    });
                }
            </script>
            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}