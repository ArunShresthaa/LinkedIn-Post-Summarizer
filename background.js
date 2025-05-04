// Background script for handling API calls to Gemini

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'summarize') {
        summarizeAndTagText(request.text)
            .then(result => {
                sendResponse(result);
            })
            .catch(error => {
                console.error('Summarization error:', error);
                sendResponse({ error: error.message });
            });

        // Return true to indicate we'll respond asynchronously
        return true;
    }
});

// Function to get API key from storage
async function getApiKey() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['geminiApiKey'], (result) => {
            resolve(result.geminiApiKey || '');
        });
    });
}

// Function to summarize and tag text using Gemini 2.0 Flash
async function summarizeAndTagText(text) {
    const apiKey = await getApiKey();

    if (!apiKey) {
        throw new Error('API key not set. Please configure your Gemini API key in the extension popup.');
    }

    // Gemini 2.0 Flash API endpoint
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // Define the structured output schema
    const structuredOutputSchema = {
        "type": "object",
        "properties": {
            "summary": {
                "type": "string",
                "description": "A concise summary of the LinkedIn post in 2-3 short sentences."
            },
            "tag": {
                "type": "string",
                "enum": [
                    "advice",
                    "achievement",
                    "post",
                    "advertisement",
                    "announcement",
                    "opinion",
                    "question",
                    "job",
                    "event",
                    "milestone",
                    "story",
                    "news",
                    "collaboration",
                    "testimonial"
                ],
                "description": "Classification of the LinkedIn post content."
            }
        },
        "required": ["summary", "tag"]
    };

    // Prepare the API request with structured output format
    const requestBody = {
        contents: [{
            parts: [{
                text: `Please analyze the following LinkedIn post:
                
                ${text}
                
                Provide a concise summary of the key points in 2-3 short sentences and classify this post with the most appropriate tag.`
            }]
        }],
        generationConfig: {
            maxOutputTokens: 200,
            temperature: 0.2,
            topP: 0.95,
            topK: 40
        },
        systemInstruction: {
            parts: [{
                text: "You are a helpful assistant that summarizes LinkedIn posts. You must provide a structured output with a concise summary and categorize the post."
            }]
        },
        tools: [
            {
                functionDeclarations: [
                    {
                        name: "summarizeLinkedInPost",
                        description: "Summarize and classify a LinkedIn post",
                        parameters: structuredOutputSchema
                    }
                ]
            }
        ]
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to get summary from Gemini API');
        }

        const data = await response.json();

        // Check if we have structured output (tool calls)
        if (data.candidates &&
            data.candidates[0] &&
            data.candidates[0].content &&
            data.candidates[0].content.parts &&
            data.candidates[0].content.parts[0] &&
            data.candidates[0].content.parts[0].functionCall) {

            // Extract the function call result
            const functionCall = data.candidates[0].content.parts[0].functionCall;

            if (functionCall.name === "summarizeLinkedInPost" && functionCall.args) {
                return {
                    summary: functionCall.args.summary,
                    tag: functionCall.args.tag.toLowerCase() // Normalize tag to lowercase
                };
            }
        }

        // Fallback if structured output is not available
        if (data.candidates &&
            data.candidates[0]?.content?.parts &&
            data.candidates[0].content.parts[0]?.text) {

            const responseText = data.candidates[0].content.parts[0].text.trim();

            // Try to parse any JSON in the response
            try {
                const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                    responseText.match(/```\s*([\s\S]*?)\s*```/) ||
                    [null, responseText];

                const jsonStr = jsonMatch[1] || responseText;
                const parsedResponse = JSON.parse(jsonStr);

                // Ensure the response has the expected structure
                if (parsedResponse.summary && parsedResponse.tag) {
                    return {
                        summary: parsedResponse.summary,
                        tag: parsedResponse.tag.toLowerCase() // Normalize tag to lowercase
                    };
                }
            } catch (parseError) {
                console.error('Failed to parse response:', parseError);
            }

            // Second fallback: Try to extract summary and tag from text
            const tagMatch = responseText.match(/tag:\s*([a-zA-Z]+)/i);
            const summaryMatch = responseText.match(/summary:\s*([^]*?)(?:\n|$)/i);

            return {
                summary: summaryMatch ? summaryMatch[1].trim() : "Summary extraction failed",
                tag: tagMatch ? tagMatch[1].toLowerCase().trim() : "post" // Default tag if parsing fails
            };
        }

        throw new Error('Unexpected API response format');
    } catch (error) {
        console.error('API request failed:', error);
        throw new Error(`Failed to analyze post: ${error.message}`);
    }
}