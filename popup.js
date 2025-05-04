// Popup script to handle API key management

document.addEventListener('DOMContentLoaded', function () {
    const apiKeyInput = document.getElementById('apiKey');
    const saveBtn = document.getElementById('saveBtn');
    const clearBtn = document.getElementById('clearBtn');
    const statusDiv = document.getElementById('status');

    // Load saved API key on popup open
    chrome.storage.local.get(['geminiApiKey'], function (result) {
        if (result.geminiApiKey) {
            // Show a masked version of the key for security
            apiKeyInput.value = maskApiKey(result.geminiApiKey);
            apiKeyInput.dataset.masked = 'true';
        }
    });

    // Handle input field focus to clear masking
    apiKeyInput.addEventListener('focus', function () {
        if (apiKeyInput.dataset.masked === 'true') {
            apiKeyInput.value = '';
            apiKeyInput.dataset.masked = 'false';
        }
    });

    // Save API key
    saveBtn.addEventListener('click', function () {
        const apiKey = apiKeyInput.value.trim();

        if (!apiKey) {
            showStatus('Please enter a valid API key', 'error');
            return;
        }

        // Save to Chrome storage
        chrome.storage.local.set({ geminiApiKey: apiKey }, function () {
            showStatus('API key saved successfully!', 'success');

            // Mask the API key for display
            apiKeyInput.value = maskApiKey(apiKey);
            apiKeyInput.dataset.masked = 'true';

            // Test the API key
            testApiKey(apiKey);
        });
    });

    // Clear API key
    clearBtn.addEventListener('click', function () {
        chrome.storage.local.remove(['geminiApiKey'], function () {
            apiKeyInput.value = '';
            apiKeyInput.dataset.masked = 'false';
            showStatus('API key cleared', 'success');
        });
    });

    // Helper function to mask API key
    function maskApiKey(key) {
        if (key.length <= 6) return '*'.repeat(key.length);
        return key.substring(0, 3) + '*'.repeat(key.length - 6) + key.substring(key.length - 3);
    }

    // Display status message
    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = 'status ' + type;
        statusDiv.style.display = 'block';

        // Hide status after 3 seconds
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }

    // Test API key by making a simple request
    async function testApiKey(apiKey) {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const testBody = {
            contents: [{
                parts: [{
                    text: "Hello! Please respond with 'API connection successful' if you receive this message."
                }]
            }],
            generationConfig: {
                maxOutputTokens: 10
            }
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(testBody)
            });

            if (!response.ok) {
                throw new Error('API test failed');
            }

            showStatus('API connection verified!', 'success');
        } catch (error) {
            showStatus('Warning: Could not verify API key', 'error');
        }
    }
});