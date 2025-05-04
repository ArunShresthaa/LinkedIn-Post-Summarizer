// Main content script that runs on LinkedIn pages

// Log that content script is loaded
console.log("LinkedIn Post Summarizer: Content script loaded");

// Observer to detect new posts as they load
const observerConfig = { childList: true, subtree: true };
let observer = new MutationObserver(onMutation);
observer.observe(document.body, observerConfig);

// Process initial posts when page loads
document.addEventListener('DOMContentLoaded', () => {
    processLinkedInPosts();
});

// Re-process posts when the page changes (for SPA navigation)
window.addEventListener('load', () => {
    processLinkedInPosts();
});

// Also check periodically for new posts that might have been missed
setInterval(processLinkedInPosts, 3000);

// Handler for DOM mutations
function onMutation(mutations) {
    let shouldProcess = false;

    for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
            shouldProcess = true;
            break;
        }
    }

    if (shouldProcess) {
        processLinkedInPosts();
    }
}

// Main function to find and process LinkedIn posts
function processLinkedInPosts() {
    // Specifically target the LinkedIn post text using the exact selector
    const postSelectors = [
        'div.update-components-text.relative.update-components-update-v2__commentary:not([data-summarizer-processed])'
    ];

    // Use all selectors and combine results
    let postContainers = [];
    postSelectors.forEach(selector => {
        try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => postContainers.push(el));
        } catch (e) {
            console.debug(`Selector not supported: ${selector}`);
        }
    });

    console.log(`Found ${postContainers.length} unprocessed LinkedIn posts`);

    postContainers.forEach(contentDiv => {
        // Mark this post as processed
        contentDiv.setAttribute('data-summarizer-processed', 'true');

        // Skip if the content is too short (likely not a meaningful post)
        if (contentDiv.textContent.trim().length < 30) return;

        // Create summarize button
        const summarizeBtn = document.createElement('button');
        summarizeBtn.className = 'linkedin-summarize-btn';
        summarizeBtn.textContent = '✨ Summarize';

        // Create summary container (hidden initially)
        const summaryContainer = document.createElement('div');
        summaryContainer.className = 'linkedin-summary-container';
        summaryContainer.style.display = 'none';

        // Create loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'linkedin-summary-loading';
        loadingIndicator.textContent = 'Generating summary...';

        // Create summary content container
        const summaryContent = document.createElement('div');
        summaryContent.className = 'linkedin-summary-content';

        // Append elements
        summaryContainer.appendChild(loadingIndicator);
        summaryContainer.appendChild(summaryContent);

        // Find the parent container of the post to place our button after the content
        const postContainer = contentDiv.closest('.feed-shared-update-v2') ||
            contentDiv.closest('.ember-view.occludable-update') ||
            contentDiv.closest('[data-id^="urn:li:activity"]');

        if (postContainer) {
            // Try to find the social actions area to place the button near the like/comment buttons
            const socialActionsArea = postContainer.querySelector('.social-details-social-counts') ||
                postContainer.querySelector('.feed-shared-social-actions') ||
                postContainer.querySelector('.feed-shared-social-counts-module');

            if (socialActionsArea) {
                // Insert near the social actions area
                socialActionsArea.parentNode.insertBefore(summarizeBtn, socialActionsArea.nextSibling);
                socialActionsArea.parentNode.insertBefore(summaryContainer, summarizeBtn.nextSibling);
            } else {
                // If no social actions area, insert directly after the content div
                contentDiv.parentNode.insertBefore(summarizeBtn, contentDiv.nextSibling);
                contentDiv.parentNode.insertBefore(summaryContainer, summarizeBtn.nextSibling);
            }
        } else {
            // Fallback: Insert directly after the content div
            contentDiv.parentNode.insertBefore(summarizeBtn, contentDiv.nextSibling);
            contentDiv.parentNode.insertBefore(summaryContainer, summarizeBtn.nextSibling);
        }

        // Add click event to the button
        summarizeBtn.addEventListener('click', async () => {
            // Toggle summary visibility
            if (summaryContainer.style.display === 'none') {
                summaryContainer.style.display = 'block';

                // Only fetch summary if it hasn't been loaded yet
                if (!summaryContent.textContent) {
                    loadingIndicator.style.display = 'block';

                    try {
                        // Get the post text
                        const postText = contentDiv.textContent.trim();

                        console.log("Found post text:", postText.substring(0, 100) + "...");

                        // Send message to background script to get summary
                        chrome.runtime.sendMessage(
                            { action: 'summarize', text: postText },
                            response => {
                                loadingIndicator.style.display = 'none';

                                if (response.error) {
                                    summaryContent.textContent = `Error: ${response.error}`;
                                } else {
                                    summaryContent.textContent = response.summary;
                                }
                            }
                        );
                    } catch (error) {
                        loadingIndicator.style.display = 'none';
                        summaryContent.textContent = `Error: ${error.message}`;
                        console.error("Summarization error:", error);
                    }
                }

                summarizeBtn.textContent = '✨ Hide Summary';
            } else {
                summaryContainer.style.display = 'none';
                summarizeBtn.textContent = '✨ Summarize';
            }
        });
    });
}