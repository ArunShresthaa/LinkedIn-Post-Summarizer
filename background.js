// Background script for handling API calls to Gemini

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'summarize') {
        summarizeText(request.text)
            .then(summary => {
                sendResponse({ summary });
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

// Function to summarize text using Gemini 2.0 Flash
async function summarizeText(text) {
    const apiKey = await getApiKey();

    if (!apiKey) {
        throw new Error('API key not set. Please configure your Gemini API key in the extension popup.');
    }

    // Gemini 2.0 Flash API endpoint
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // Prepare the prompt
    const prompt = `Please provide a concise summary of the following LinkedIn post:
    
    ${text}
    
    Summarize the key points in 2-3 short sentences.`;

    // Prepare the API request
    const requestBody = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }],
        generationConfig: {
            maxOutputTokens: 150,
            temperature: 0.2,
            topP: 0.95,
            topK: 40
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

        // Extract the summary from the response
        if (data.candidates && data.candidates[0]?.content?.parts && data.candidates[0].content.parts[0]?.text) {
            return data.candidates[0].content.parts[0].text.trim();
        } else {
            throw new Error('Unexpected API response format');
        }
    } catch (error) {
        console.error('API request failed:', error);
        throw new Error(`Failed to summarize: ${error.message}`);
    }
}