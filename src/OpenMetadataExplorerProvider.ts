import * as vscode from 'vscode';
import { GeminiService } from './services/GeminiService';
import { OpenMetadataService } from './services/OpenMetadataService';
import { LineageService } from './services/LineageService';

export class OpenMetadataExplorerProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'openmetadataExplorer';
    private _view?: vscode.WebviewView;
    private openMetadataService: OpenMetadataService;
    private geminiService?: GeminiService;
    private lineageService!: LineageService;

    constructor(private readonly _extensionUri: vscode.Uri) {
        this.openMetadataService = new OpenMetadataService();
        this.initializeGeminiService();
        this.initializeLineageService();
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

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}