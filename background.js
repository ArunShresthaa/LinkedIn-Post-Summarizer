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

    // Prepare the prompt for structured output
    const prompt = `Please analyze the following LinkedIn post:
    
    ${text}
    
    Provide:
    1. A concise summary of the key points in 2-3 short sentences.
    2. Classify this post with the most appropriate tag from these options: advice, achievement, post, advertisement.
    
    Format your response as structured JSON with "summary" and "tag" fields.`;

    // Prepare the API request with structured output format
    const requestBody = {
        contents: [{
            parts: [{
                text: prompt
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
                text: "Return a JSON object with 'summary' and 'tag' fields. The tag should be one of: advice, achievement, post, advertisement."
            }]
        }
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

        // Extract the response from Gemini
        if (data.candidates && data.candidates[0]?.content?.parts && data.candidates[0].content.parts[0]?.text) {
            const responseText = data.candidates[0].content.parts[0].text.trim();

            // Parse the JSON response
            try {
                // The response might contain markdown code blocks, so we need to extract just the JSON
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
                } else {
                    throw new Error('Response missing required fields');
                }
            } catch (parseError) {
                console.error('Failed to parse structured response:', parseError);

                // Fallback: If we can't parse the JSON, just return the text as summary
                return {
                    summary: responseText,
                    tag: 'post' // Default tag if parsing fails
                };
            }
        } else {
            throw new Error('Unexpected API response format');
        }
    } catch (error) {
        console.error('API request failed:', error);
        throw new Error(`Failed to analyze post: ${error.message}`);
    }
}