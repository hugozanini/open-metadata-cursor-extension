import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

console.log('React entry point starting...');

const container = document.getElementById('root');
if (container) {
    console.log('Root container found, mounting React app...');
    try {
        const root = createRoot(container);
        root.render(<App />);
        console.log('React app mounted successfully!');
    } catch (error) {
        console.error('Failed to mount React app:', error);
        container.innerHTML = `
            <div style="padding: 20px; color: var(--vscode-errorForeground);">
                <h2>❌ React App Failed to Load</h2>
                <p>Error: ${error instanceof Error ? error.message : String(error)}</p>
                <pre>${error instanceof Error ? error.stack : ''}</pre>
            </div>
        `;
    }
} else {
    console.error('Root container not found - DOM structure:', document.body.innerHTML);
}