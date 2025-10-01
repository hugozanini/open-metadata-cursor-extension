import * as vscode from 'vscode';
import { OpenMetadataExplorerProvider } from './OpenMetadataExplorerProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('🚀 OpenMetadata AI Explorer: Starting activation...');
    
    try {
        // Create the webview provider
        console.log('🔧 Creating webview provider...');
        const provider = new OpenMetadataExplorerProvider(context.extensionUri, context);

        // Register the webview provider
        console.log('📝 Registering webview provider...');
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider('openmetadataExplorer', provider)
        );

        // Register refresh command
        console.log('⚙️ Registering commands...');
        context.subscriptions.push(
            vscode.commands.registerCommand('openmetadataExplorer.refresh', () => {
                provider.refresh();
            })
        );

        // Register command to open Vibe Coder (Voice to Text) modal
        context.subscriptions.push(
            vscode.commands.registerCommand('openmetadataExplorer.openVibeCoder', async () => {
                await provider.openVibeCoder();
            })
        );

        console.log('✅ OpenMetadata AI Explorer activated successfully!');
        
        // Show welcome message
        vscode.window.showInformationMessage('OpenMetadata AI Explorer is ready! 🚀');
    } catch (error) {
        console.error('❌ Failed to activate OpenMetadata AI Explorer:', error);
        vscode.window.showErrorMessage(`Failed to activate OpenMetadata AI Explorer: ${error}`);
    }
}

export function deactivate() {
    console.log('OpenMetadata AI Explorer deactivated');
}