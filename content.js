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
    // Find all post containers that haven't been processed yet
    // Using multiple selectors to catch different LinkedIn post types and layouts
    const postSelectors = [
        // Feed post containers
        'div.feed-shared-update-v2:not([data-summarizer-processed])',
        // Article posts
        'div.feed-shared-article:not([data-summarizer-processed])',
        // Generic post containers
        'div.ember-view.occludable-update:not([data-summarizer-processed])',
        // Container with post content
        'div.feed-shared-wrapper:not([data-summarizer-processed])',
        // More general approach
        'div[data-id^="urn:li:activity"]:not([data-summarizer-processed])',
        // Another container pattern
        'div.update-components-text:not([data-summarizer-processed])'
    ];

    // Use all selectors and combine results
    let postContainers = [];
    postSelectors.forEach(selector => {
        try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => postContainers.push(el));
        } catch (e) {
            // Some browsers might not support certain selectors
            console.debug(`Selector not supported: ${selector}`);
        }
    });

    // Make the array unique (no duplicates)
    postContainers = [...new Set(postContainers)];

    console.log(`Found ${postContainers.length} unprocessed posts`);

    postContainers.forEach(post => {
        // Mark this post as processed
        post.setAttribute('data-summarizer-processed', 'true');

        // Specifically target only the main post content, not comments
        // First, try the most specific selectors
        const specificContentSelectors = [
            // Specific class for post content (not comments)
            '.update-components-text.relative.update-components-update-v2__commentary',
            '.feed-shared-update-v2__description',
            '.update-components-text:not(.comments-comment-item__main-content)',
            '.feed-shared-inline-show-more-text'
        ];

        let contentDiv = null;

        // Try the specific selectors first
        for (const selector of specificContentSelectors) {
            const element = post.querySelector(selector);
            if (element && element.textContent.trim().length > 30) {
                contentDiv = element;
                break;
            }
        }

        // If specific selectors fail, try more general ones but exclude comment sections
        if (!contentDiv) {
            // More general selectors, but excluding comments
            const generalContentSelectors = [
                'span.break-words',
                'div.feed-shared-text',
                'p',
                'article'
            ];

            for (const selector of generalContentSelectors) {
                // Check if this element is NOT inside a comments container
                const elements = post.querySelectorAll(selector);
                for (const el of elements) {
                    // Skip if this element is inside a comments section
                    if (
                        !el.closest('.feed-shared-update-v2__comments-container') &&
                        !el.closest('.comments-comment-item') &&
                        !el.closest('.comments-comments-list') &&
                        el.textContent.trim().length > 30
                    ) {
                        contentDiv = el;
                        break;
                    }
                }
                if (contentDiv) break;
            }
        }

        if (!contentDiv) return; // Skip if no content found

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

        // Find the right location to inject our button - look specifically for the social actions area
        // which appears between the post content and comments
        const possibleInsertionPoints = [
            '.social-details-social-counts',
            '.feed-shared-social-actions',
            '.feed-shared-social-counts-module',
            '[data-control-name="comment"]',
            '[aria-label="Like"]',
            '[aria-label="Comment"]'
        ];

        let insertPoint = null;

        // Try to find the social actions area (between post and comments)
        for (const selector of possibleInsertionPoints) {
            const element = post.querySelector(selector);
            if (element) {
                insertPoint = element;
                break;
            }
        }

        // If we found an insertion point, insert our button
        if (insertPoint) {
            // Try to insert near the actions bar
            const parentEl = insertPoint.parentNode;

            if (parentEl) {
                // Insert after the insertion point
                if (insertPoint.nextSibling) {
                    parentEl.insertBefore(summarizeBtn, insertPoint.nextSibling);
                    parentEl.insertBefore(summaryContainer, summarizeBtn.nextSibling);
                } else {
                    parentEl.appendChild(summarizeBtn);
                    parentEl.appendChild(summaryContainer);
                }
            }
        } else {
            // If no action bar found, insert directly after the content div
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