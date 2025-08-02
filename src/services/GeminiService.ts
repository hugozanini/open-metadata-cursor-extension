import { TableResult } from './OpenMetadataService';

export class GeminiService {
    private apiKey: string;
    private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async analyzeTable(tableMetadata: TableResult): Promise<string> {
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
    tableMetadata.columns.slice(0, 10).map((col: any) => 
        `- ${col.name} (${col.dataType || 'unknown type'}): ${col.description || 'no description'}`
    ).join('\n') : 'Column information not available'}

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
            } else {
                console.error('Unexpected Gemini response format:', data);
                return '❌ AI analysis returned unexpected format';
            }

        } catch (error) {
            console.error('Error calling Gemini API:', error);
            return `❌ AI analysis failed: ${error instanceof Error ? error.message : 'Network error'}`;
        }
    }

    async searchInsights(query: string, searchResults: TableResult[]): Promise<string> {
        const prompt = `
Found ${searchResults.length} tables for "${query}".

Top matches: ${searchResults.slice(0, 3).map(r => r.name).join(', ')}

Respond in this exact format:
**Key tables:** [2-3 most relevant table names]
**Try next:** [2 related search terms]

Keep it minimal - max 2 lines total.
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
                        temperature: 0.5,
                        topK: 20,
                        topP: 0.9,
                        maxOutputTokens: 80
                    }
                })
            });

            if (!response.ok) {
                console.error('Gemini API error for insights:', response.status);
                return `Found ${searchResults.length} tables matching "${query}". Configure Gemini API key for AI insights.`;
            }

            const data = await response.json();
            
            if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                return data.candidates[0].content.parts[0].text;
            } else {
                return `Found ${searchResults.length} tables matching "${query}". AI insights unavailable.`;
            }

        } catch (error) {
            console.error('Error getting search insights:', error);
            return `Found ${searchResults.length} tables matching "${query}". Check your internet connection for AI insights.`;
        }
    }

    async validateApiKey(): Promise<boolean> {
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
        } catch (error) {
            console.error('Error validating Gemini API key:', error);
            return false;
        }
    }
}