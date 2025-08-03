# Common Issues & Troubleshooting

## Extension Loading Issues

### Issue: Extension Panel is Blank/Empty
**Symptoms**: OpenMetadata AI Explorer panel shows completely white/empty space

**Possible Causes**:
1. **VS Code API Error**: Multiple API acquisitions
2. **React Mount Failure**: JavaScript errors preventing React from loading
3. **Missing Build Files**: Compilation issues

**Troubleshooting Steps**:
1. **Check Console**: Open Developer Tools in Extension Development Host
   - Look for error messages in Console tab
   - Common errors: "VS Code API already acquired", React mounting errors
2. **Verify Build**: Ensure `npm run compile` runs without errors
3. **Check Files**: Verify `dist/extension.js` and `dist/webview.js` exist
4. **Restart Extension**: Close Extension Development Host and press F5 again

**Recent Fix**: Added global singleton pattern for VS Code API to prevent multiple acquisition errors.

### Issue: Extension Opens in Wrong Panel
**Symptoms**: Extension appears in left sidebar instead of bottom panel next to terminal

**Root Cause**: Incorrect `package.json` configuration for panel positioning

**Solution**: Verify `package.json` has both `viewsContainers` and `views`:
```json
{
  "contributes": {
    "viewsContainers": {
      "panel": [{
        "id": "openmetadataPanel",
        "title": "OpenMetadata AI",
        "icon": "$(database)"
      }]
    },
    "views": {
      "openmetadataPanel": [{
        "id": "openmetadataExplorer", 
        "name": "Explorer",
        "type": "webview"
      }]
    }
  }
}
```

### Issue: Extension Not Loading at All
**Symptoms**: Extension doesn't appear in Extension Development Host

**Troubleshooting**:
1. **Check Extension Host**: Verify you're running Extension Development Host (F5)
2. **Verify Directory**: Ensure VS Code is opened to correct extension directory
3. **Check Package.json**: Verify extension manifest is valid
4. **Debug Configuration**: Ensure `.vscode/launch.json` exists and is correct

## Search & API Issues

### Issue: "HTTP 401: Unauthorized" Errors
**Symptoms**: Search fails with authentication error

**Root Cause**: Missing or invalid OpenMetadata authentication token

**Solution**:
1. **Create Bot Token**:
   - Access OpenMetadata UI: http://localhost:8585
   - Go to Settings → Bots
   - Create new bot or use existing one
   - Copy the JWT token
2. **Configure Extension**:
   - Open VS Code Settings (JSON)
   - Add: `"openmetadataExplorer.openmetadataAuthToken": "your-token"`
3. **Restart Extension**: Close and reopen Extension Development Host

### Issue: "Failed to fetch" or Connection Errors
**Symptoms**: Cannot connect to OpenMetadata API

**Troubleshooting**:
1. **Verify OpenMetadata Running**: Check http://localhost:8585 loads
2. **Check URL Configuration**: Verify `openmetadataExplorer.openmetadataUrl` setting
3. **Test API Directly**: Try http://localhost:8585/api/v1/version in browser
4. **Docker Status**: Ensure OpenMetadata containers are running

### Issue: No Search Results
**Symptoms**: Search completes but returns empty results

**Possible Causes**:
1. **No matching data**: Search terms don't match any tables
2. **Index issues**: OpenMetadata search index problems  
3. **Permissions**: Bot token lacks search permissions

**Troubleshooting**:
1. **Try Broad Search**: Search for "*" or "table"
2. **Check UI**: Verify same search works in OpenMetadata web UI
3. **Bot Permissions**: Ensure bot has appropriate access rights

## AI Integration Issues

### Issue: AI Insights Not Appearing
**Symptoms**: Search results show but no AI insights

**Possible Causes**:
1. **Missing API Key**: Gemini API key not configured
2. **Invalid API Key**: API key expired or incorrect
3. **Quota Exceeded**: Free tier limits reached
4. **Network Issues**: Cannot reach Gemini API

**Solution**:
1. **Configure API Key**:
   - Get key from https://makersuite.google.com/app/apikey
   - Add to settings: `"openmetadataExplorer.geminiApiKey": "your-key"`
2. **Test API Key**: Check console for Gemini API errors
3. **Check Quotas**: Monitor usage in AI Studio

### Issue: AI Responses Are Generic/Unhelpful
**Symptoms**: AI provides vague or irrelevant insights

**Cause**: Prompt engineering or response processing issues

**Troubleshooting**:
1. **Check Console**: Look for prompt/response logs
2. **Verify Data**: Ensure search results contain sufficient metadata
3. **Test Different Queries**: Try various search terms

## Lineage Visualization Issues

### Issue: Lineage Modal Crashes/Blank
**Symptoms**: Clicking lineage button shows blank modal or JavaScript errors

**Recent Fixes**: Added comprehensive null safety checks for entity properties

**Troubleshooting**:
1. **Check Console**: Look for TypeError messages
2. **Verify Data**: Check if table has lineage data in OpenMetadata UI
3. **Test Different Tables**: Try lineage on various tables

### Issue: "Cannot read properties of undefined" Errors
**Root Cause**: Missing entity properties in lineage data

**Fixed**: Added null checks for:
- `entity.type.toLowerCase()`
- `entity.fullyQualifiedName.split()`
- Missing entity objects

**Prevention**: All lineage components now handle incomplete data gracefully

### Issue: Lineage Graph Layout Problems
**Symptoms**: Nodes overlap or appear in wrong positions

**Troubleshooting**:
1. **ELK Layout**: Check console for ELK layout errors
2. **Fallback Layout**: System should use manual positioning if ELK fails
3. **Data Validation**: Verify lineage data has proper relationships

## Build & Development Issues

### Issue: TypeScript Compilation Errors
**Symptoms**: `npm run compile` fails with type errors

**Common Fixes**:
1. **d3-dispatch Errors**: Set `transpileOnly: true` in webpack ts-loader
2. **Strict Null Checks**: Add proper null checks for undefined values
3. **Import Issues**: Verify import paths and module resolution

### Issue: Webpack Bundle Size Warnings  
**Symptoms**: Large bundle warnings during compilation

**Current Status**: ReactFlow creates ~1.73MB webview bundle
**Impact**: Acceptable for development, could optimize for production
**Future Fix**: Code splitting for large dependencies

### Issue: Hot Reload Not Working
**Symptoms**: Changes don't appear without manual reload

**Solution**: Use `npm run watch` instead of `npm run compile` for development

## Configuration Issues

### Issue: Settings Not Appearing in VS Code
**Symptoms**: Cannot find extension settings in VS Code preferences

**Solution**:
1. **Reload Extension**: Close Extension Development Host and press F5
2. **Verify Package.json**: Check `configuration` section is correct
3. **Use JSON Settings**: Add settings directly to settings.json file

### Issue: Settings Not Taking Effect
**Symptoms**: Configuration changes don't impact extension behavior

**Troubleshooting**:
1. **Restart Extension**: Changes require extension restart
2. **Check Format**: Verify JSON syntax in settings
3. **Validate Values**: Ensure URLs and API keys are correct

## Performance Issues

### Issue: Slow Extension Loading
**Cause**: Large ReactFlow bundle size

**Mitigations**:
1. **Acceptable Impact**: ~1.73MB is reasonable for development
2. **Future Optimization**: Code splitting planned
3. **Network Cache**: Bundle cached after first load

### Issue: Memory Usage Growth
**Symptoms**: Extension uses increasing memory over time

**Prevention**:
1. **Event Cleanup**: useEffect cleanup functions implemented
2. **Component Unmounting**: Proper state management
3. **Service Reuse**: Singleton pattern for services

## General Debugging Steps

### Console Debugging
1. **Extension Host**: Check VS Code Developer Console
2. **Webview**: Check Extension Development Host Developer Tools
3. **Network Tab**: Monitor API calls and responses
4. **Application Tab**: Check local storage and settings

### Logging Levels
```typescript
// Current logging in place
console.log('React entry point starting...');
console.log('Fetching lineage data for:', tableFqn);
console.log('Received lineage data:', message.lineageData);
```

### Reset Extension
1. **Close Extension Development Host**
2. **Clean Build**: `rm -rf dist/ && npm run compile`
3. **Restart**: Press F5 in VS Code
4. **Clear Settings**: Remove extension settings if needed

### Report Issues
When reporting issues, include:
1. **Console Errors**: Screenshots or text of error messages
2. **Steps to Reproduce**: Exact sequence that triggers issue
3. **Environment**: VS Code version, OS, Node.js version
4. **Configuration**: Relevant settings (without API keys)
5. **OpenMetadata Status**: Verify local deployment is running