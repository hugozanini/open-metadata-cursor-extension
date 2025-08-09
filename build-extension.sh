#!/bin/bash

# Build script for OpenMetadata AI Explorer Extension
# This script creates a VSIX package for private distribution

echo "🚀 Building OpenMetadata AI Explorer Extension..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -f *.vsix

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Compile the extension
echo "🔨 Compiling extension..."
npm run compile

# Check if compilation was successful
if [ $? -ne 0 ]; then
    echo "❌ Compilation failed. Please fix errors and try again."
    exit 1
fi

# Create VSIX package
echo "📦 Creating VSIX package..."
npx @vscode/vsce package

# Check if packaging was successful
if [ $? -eq 0 ]; then
    echo "✅ Extension packaged successfully!"
    echo ""
    echo "📄 Generated file:"
    ls -la *.vsix
    echo ""
    echo "🎯 Next steps:"
    echo "1. Test the extension: Install the VSIX file in VS Code/Cursor"
    echo "2. Distribute to your team via internal channels"
    echo "3. Provide configuration instructions to users"
    echo ""
    echo "💡 Installation command:"
    echo "   code --install-extension $(ls *.vsix)"
    echo ""
else
    echo "❌ Packaging failed. Check the error messages above."
    exit 1
fi
