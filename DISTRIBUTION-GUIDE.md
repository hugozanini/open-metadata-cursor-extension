# Private Extension Distribution Guide

This guide shows how to distribute the OpenMetadata AI Explorer extension privately within your company without using the VS Code Marketplace.

## Method 1: VSIX Package Distribution (Recommended)

### Prerequisites
1. Ensure your extension compiles successfully: `npm run compile`
2. Install VSCE (VS Code Extension Manager):
   ```bash
   npm install -g @vscode/vsce
   # OR if global install fails:
   npx @vscode/vsce --version
   ```

### Step 1: Update Package.json
Make sure these fields are set correctly in `package.json`:
```json
{
  "publisher": "your-company-name",  // Replace with your company name
  "author": {
    "name": "Your Name",             // Replace with your name
    "email": "your.email@company.com" // Replace with your email
  },
  "version": "1.1.0"                 // Current version
}
```

### Step 2: Create VSIX Package
```bash
# Build and package the extension
npm run compile
npx @vscode/vsce package

# This creates: openmetadata-ai-explorer-1.1.0.vsix
```

### Step 3: Distribute to Users
Share the `.vsix` file with your team members via:
- Internal file sharing (SharePoint, Google Drive, etc.)
- Internal artifact repository
- Email attachment
- Internal wiki/documentation site

### Step 4: Installation Instructions for Users

#### For VS Code:
1. Open VS Code
2. Go to Extensions view (Ctrl+Shift+X / Cmd+Shift+X)
3. Click the "..." menu → "Install from VSIX..."
4. Select the `openmetadata-ai-explorer-1.1.0.vsix` file
5. Reload VS Code when prompted

#### For Cursor:
1. Open Cursor
2. Go to Extensions view (Ctrl+Shift+X / Cmd+Shift+X)
3. Click the "..." menu → "Install from VSIX..."
4. Select the `openmetadata-ai-explorer-1.1.0.vsix` file
5. Reload Cursor when prompted

#### Command Line Installation:
```bash
# VS Code
code --install-extension openmetadata-ai-explorer-1.1.0.vsix

# Cursor (if available)
cursor --install-extension openmetadata-ai-explorer-1.1.0.vsix
```

## Method 2: Internal Extension Registry (Advanced)

### Option A: Azure DevOps Extensions
If your company uses Azure DevOps:
1. Create a private Azure DevOps marketplace
2. Publish your extension there
3. Users install from your private marketplace

### Option B: Internal NPM Registry
If you have an internal NPM registry:
1. Package extension as npm package
2. Publish to internal registry
3. Create installation script for users

### Option C: GitHub Releases (Private Repo)
1. Create releases on your private GitHub repository
2. Attach `.vsix` files to releases
3. Users download from releases page

## Method 3: Development Installation (For Testing)

### Direct Development Setup:
```bash
# Clone the repository
git clone https://github.com/hugozanini/open-metadata-cursor-extension.git
cd open-metadata-cursor-extension

# Install dependencies
npm install

# Compile
npm run compile

# Install in development mode
# This creates a symlink to your development folder
code --install-extension . --force
```

## Configuration Instructions for Users

After installation, users need to configure these settings in VS Code/Cursor:

```json
{
  "openmetadataExplorer.openmetadataUrl": "http://your-openmetadata-server:8585",
  "openmetadataExplorer.geminiApiKey": "your-gemini-api-key",
  "openmetadataExplorer.openmetadataAuthToken": "your-openmetadata-token"
}
```

### How to Configure:
1. Open VS Code/Cursor Settings (Ctrl+, / Cmd+,)
2. Search for "OpenMetadata"
3. Fill in the required values:
   - **OpenMetadata URL**: Your company's OpenMetadata server
   - **Gemini API Key**: AI integration key (optional)
   - **Auth Token**: OpenMetadata authentication token

## Version Management

### Updating the Extension:
1. Update version in `package.json`
2. Create new VSIX package
3. Distribute new version to users
4. Users install new VSIX (overwrites previous version)

### Version Numbering:
- Use semantic versioning: `MAJOR.MINOR.PATCH`
- Current version: `1.1.0` (complete UI redesign)
- Next version: `1.2.0` (new features) or `1.1.1` (bug fixes)

## Security Considerations

### For Company Distribution:
1. **Code Review**: Ensure all code is reviewed before packaging
2. **Dependency Audit**: Run `npm audit` to check for vulnerabilities
3. **Internal Hosting**: Host VSIX files on internal servers only
4. **Access Control**: Restrict access to authorized personnel only
5. **Configuration Security**: Provide secure configuration guidelines

### Sensitive Information:
- Never include API keys or tokens in the extension package
- Use VS Code settings for all sensitive configuration
- Provide clear documentation on secure configuration

## Troubleshooting

### Common Issues:
1. **VSCE Installation Fails**: Use `npx @vscode/vsce` instead of global install
2. **Package Creation Fails**: Ensure `npm run compile` works first
3. **Extension Won't Load**: Check VS Code/Cursor version compatibility
4. **Missing Dependencies**: Run `npm install` before packaging

### Build Script for Automation:
```bash
#!/bin/bash
# build-extension.sh

echo "Building OpenMetadata AI Explorer Extension..."

# Clean previous builds
rm -f *.vsix

# Install dependencies
npm install

# Compile
npm run compile

# Create package
npx @vscode/vsce package

echo "Extension packaged successfully!"
echo "File: openmetadata-ai-explorer-1.1.0.vsix"
echo "Ready for distribution!"
```

## Support and Maintenance

### For Internal Support:
1. Create internal documentation/wiki
2. Set up support channels (Slack, email, etc.)
3. Maintain changelog for updates
4. Provide configuration examples for your environment

### Update Distribution:
1. Notify users of new versions
2. Provide update instructions
3. Maintain backward compatibility when possible
4. Document breaking changes clearly

## Next Steps

1. Replace placeholder values in `package.json`
2. Test packaging process: `npx @vscode/vsce package`
3. Test installation with generated VSIX file
4. Create internal distribution process
5. Document configuration for your company's OpenMetadata setup
6. Set up update notification process
