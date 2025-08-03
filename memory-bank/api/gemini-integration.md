# Gemini AI Integration

## Overview
Integration with Google's Gemini 2.0 Flash API for AI-powered data insights and conversational responses about data catalog search results.

## Configuration

### API Key Setup
1. **Access AI Studio**: https://makersuite.google.com/app/apikey
2. **Create API Key**: Generate new API key for project
3. **Configure Extension**: Add to `openmetadataExplorer.geminiApiKey`
4. **Free Quotas**: Generous free tier for development

### Service Configuration
```typescript
const GEMINI_CONFIG = {
  apiKey: config.get<string>('geminiApiKey'),
  model: 'gemini-2.0-flash-exp',
  baseURL: 'https://generativelanguage.googleapis.com/v1beta'
};
```

## API Integration

### Base Request Format
```typescript
const requestBody = {
  contents: [{
    parts: [{ text: prompt }]
  }],
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: maxTokens,
    stopSequences: []
  }
};
```

### Authentication
```typescript
const response = await fetch(
  `${baseURL}/models/${model}:generateContent?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  }
);
```

## Use Cases

### 1. Search Insights (`searchInsights`)

#### Purpose
Provide conversational overview of search results, explaining what tables contain and why they're relevant.

#### Input Parameters
```typescript
searchInsights(
  query: string,           // Original search query
  searchResults: TableResult[], // OpenMetadata results
  searchTermsUsed: string[],    // Extracted search terms
  wasNaturalLanguage: boolean   // Query type flag
)
```

#### Prompt Engineering
```typescript
const prompt = wasNaturalLanguage 
  ? `The user asked: "${query}". Here are the relevant tables I found:`
  : `The user searched for: "${query}". Here are the matching tables:`;

// Add table details
searchResults.forEach(table => {
  prompt += `\n**${table.name}** (${table.database}.${table.schema})`;
  if (table.description) prompt += `\n${table.description}`;
  if (table.columns) prompt += `\n${table.columns.length} columns`;
  if (table.rowCount) prompt += `, ${table.rowCount} rows`;
});

prompt += `\n\nProvide a brief, conversational overview explaining what these tables contain and why they're relevant to the user's query. Keep it concise and suggest related searches if helpful.`;
```

#### Response Format
```typescript
interface GeminiResponse {
  candidates: [{
    content: {
      parts: [{ text: string }];
    };
    finishReason: string;
  }];
}
```

#### Output Processing
```typescript
const aiInsights = response.candidates[0]?.content?.parts[0]?.text || 
  'Unable to generate insights at this time.';
```

### 2. Table Analysis (`analyzeTable`)

#### Purpose  
Deep analysis of individual table metadata for detailed insights.

#### Input Parameters
```typescript
analyzeTable(tableMetadata: TableResult)
```

#### Prompt Structure
```typescript
const prompt = `Analyze this data table:

**Table**: ${table.name}
**Database**: ${table.database}.${table.schema}
**Description**: ${table.description || 'No description available'}
**Row Count**: ${table.rowCount || 'Unknown'}
**Columns**: ${table.columns?.length || 'Unknown'}

${table.columns ? 'Column Details:\n' + table.columns.map(col => 
  `- ${col.name} (${col.dataType}): ${col.description || 'No description'}`
).join('\n') : ''}

Provide:
1. **Data Summary**: What this table contains
2. **Potential Issues**: Any data quality concerns
3. **Recommendations**: How it might be used
4. **Relationships**: Likely connections to other tables

Keep the analysis practical and focused on data engineering insights.`;
```

## Response Handling

### Success Response Processing
```typescript
private extractTextFromResponse(response: GeminiResponse): string {
  try {
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('No text content in response');
    }
    return text.trim();
  } catch (error) {
    console.error('Error extracting Gemini response:', error);
    return 'Unable to generate AI insights at this time.';
  }
}
```

### Error Handling
```typescript
async callGemini(prompt: string, maxTokens: number = 500): Promise<string> {
  try {
    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    return this.extractTextFromResponse(data);
    
  } catch (error) {
    console.error('Gemini API call failed:', error);
    
    if (error.message.includes('API key')) {
      return 'Please configure your Gemini API key in settings.';
    }
    
    if (error.message.includes('quota')) {
      return 'Gemini API quota exceeded. Please try again later.';
    }
    
    return 'AI analysis temporarily unavailable.';
  }
}
```

## Configuration Management

### Settings Integration
```json
{
  "openmetadataExplorer.geminiApiKey": {
    "type": "string",
    "description": "Gemini API key from AI Studio"
  }
}
```

### Validation
```typescript
async validateApiKey(): Promise<boolean> {
  try {
    const testPrompt = "Say 'API key valid' if you can read this.";
    const response = await this.callGemini(testPrompt, 10);
    return response.includes('API key valid');
  } catch (error) {
    return false;
  }
}
```

### Conditional Initialization
```typescript
private initializeGeminiService() {
  const apiKey = config.get<string>('geminiApiKey');
  
  if (apiKey) {
    this.geminiService = new GeminiService(apiKey);
  } else {
    console.log('Gemini API key not configured - AI features disabled');
  }
}
```

## Performance Considerations

### Token Limits
```typescript
const TOKEN_LIMITS = {
  searchInsights: 150,    // Concise overviews
  tableAnalysis: 500,     // Detailed analysis
  maxInput: 8000          // Input token limit
};
```

### Rate Limiting
- **Free Tier**: 60 requests per minute
- **Strategy**: Queue requests if needed
- **Fallback**: Graceful degradation without AI

### Response Streaming
```typescript
// Future enhancement: Streaming responses
const streamResponse = async (prompt: string) => {
  // Implementation for streaming word-by-word display
  // Similar to ChatGPT/Cursor interface
};
```

## Prompt Engineering Best Practices

### Effective Prompts
1. **Clear Context**: Explain what the user is looking for
2. **Structured Data**: Format table metadata clearly
3. **Specific Instructions**: Ask for specific output format
4. **Concise Requests**: Keep token usage reasonable
5. **Error Handling**: Handle incomplete/missing data gracefully

### Example Optimizations
```typescript
// Good: Specific, structured prompt
const prompt = `User query: "${query}"
Found tables: ${tables.map(t => `${t.name} - ${t.description}`).join('; ')}

Explain in 2-3 sentences what data is available and why it's relevant.`;

// Avoid: Vague, open-ended prompts  
const badPrompt = `Tell me about these tables: ${JSON.stringify(tables)}`;
```

## Integration with Extension

### Service Layer
```typescript
export class GeminiService {
  constructor(private apiKey: string) {}
  
  async searchInsights(
    query: string,
    results: TableResult[],
    searchTerms: string[],
    wasNaturalLanguage: boolean
  ): Promise<string> {
    // Implementation
  }
  
  async analyzeTable(table: TableResult): Promise<string> {
    // Implementation  
  }
}
```

### Provider Integration
```typescript
// In OpenMetadataExplorerProvider.ts
if (this.geminiService && searchResult.results.length > 0) {
  try {
    const aiInsights = await this.geminiService.searchInsights(
      query,
      searchResult.results,
      searchResult.searchTermsUsed,
      searchResult.wasNaturalLanguage
    );
    
    this._view.webview.postMessage({
      type: 'aiInsightsUpdate',
      aiInsights: aiInsights
    });
  } catch (error) {
    // Handle AI failures gracefully
  }
}
```

### UI Integration
```typescript
// Streaming effect in AIInsights component
useEffect(() => {
  if (insights) {
    const words = insights.split(' ');
    let currentIndex = 0;
    
    const timer = setInterval(() => {
      if (currentIndex < words.length) {
        setDisplayedText(words.slice(0, currentIndex + 1).join(' '));
        currentIndex++;
      } else {
        clearInterval(timer);
      }
    }, 50); // Word-by-word streaming
  }
}, [insights]);
```

## Testing and Debugging

### Manual Testing
```typescript
// Test API key validation
const service = new GeminiService(apiKey);
const isValid = await service.validateApiKey();

// Test search insights  
const insights = await service.searchInsights(
  "what customer data do we have?",
  mockSearchResults,
  ["customer", "data"],
  true
);
```

### Common Issues
1. **Invalid API Key**: Check AI Studio configuration
2. **Quota Exceeded**: Monitor usage in AI Studio
3. **Network Errors**: Handle timeouts gracefully
4. **Response Format**: Validate response structure
5. **Token Limits**: Monitor prompt length and responses