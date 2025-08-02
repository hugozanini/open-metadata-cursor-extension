import * as vscode from 'vscode';
import { OpenMetadataExplorerProvider } from './OpenMetadataExplorerProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('OpenMetadata AI Explorer is now active!');

    // Create the webview provider
    const provider = new OpenMetadataExplorerProvider(context.extensionUri);

    // Register the webview provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('openmetadataExplorer', provider)
    );

    // Register refresh command
    context.subscriptions.push(
        vscode.commands.registerCommand('openmetadataExplorer.refresh', () => {
            provider.refresh();
        })
    );

    // Show welcome message
    vscode.window.showInformationMessage('OpenMetadata AI Explorer is ready! 🚀');
}

export function deactivate() {
    console.log('OpenMetadata AI Explorer deactivated');
}