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

        // Create toggle button (hidden initially, will be shown once summary is ready)
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'linkedin-toggle-btn';
        toggleBtn.textContent = '✨ Hide Summary & Tags';
        toggleBtn.style.display = 'none';

        // Create summary container
        const summaryContainer = document.createElement('div');
        summaryContainer.className = 'linkedin-summary-container';

        // Create loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'linkedin-summary-loading';
        loadingIndicator.textContent = 'Analyzing post...';

        // Create summary content container
        const summaryContent = document.createElement('div');
        summaryContent.className = 'linkedin-summary-content';

        // Create tag container
        const tagContainer = document.createElement('div');
        tagContainer.className = 'linkedin-tag-container';

        // Append elements
        summaryContainer.appendChild(loadingIndicator);
        summaryContainer.appendChild(summaryContent);
        summaryContainer.appendChild(tagContainer);

        // Find the parent container of the post to place our summary after the content
        const postContainer = contentDiv.closest('.feed-shared-update-v2') ||
            contentDiv.closest('.ember-view.occludable-update') ||
            contentDiv.closest('[data-id^="urn:li:activity"]');

        if (postContainer) {
            // Try to find the social actions area to place the summary near the like/comment buttons
            const socialActionsArea = postContainer.querySelector('.social-details-social-counts') ||
                postContainer.querySelector('.feed-shared-social-actions') ||
                postContainer.querySelector('.feed-shared-social-counts-module');

            if (socialActionsArea) {
                // Insert near the social actions area
                socialActionsArea.parentNode.insertBefore(toggleBtn, socialActionsArea.nextSibling);
                socialActionsArea.parentNode.insertBefore(summaryContainer, toggleBtn.nextSibling);
            } else {
                // If no social actions area, insert directly after the content div
                contentDiv.parentNode.insertBefore(toggleBtn, contentDiv.nextSibling);
                contentDiv.parentNode.insertBefore(summaryContainer, toggleBtn.nextSibling);
            }
        } else {
            // Fallback: Insert directly after the content div
            contentDiv.parentNode.insertBefore(toggleBtn, contentDiv.nextSibling);
            contentDiv.parentNode.insertBefore(summaryContainer, toggleBtn.nextSibling);
        }

        // Automatically generate summary and tags
        try {
            // Get the post text
            const postText = contentDiv.textContent.trim();

            console.log("Analyzing post:", postText.substring(0, 100) + "...");

            // Send message to background script to get summary and tags
            chrome.runtime.sendMessage(
                { action: 'summarize', text: postText },
                response => {
                    loadingIndicator.style.display = 'none';
                    toggleBtn.style.display = 'inline-block'; // Show toggle button when analysis is ready

                    if (response.error) {
                        summaryContent.textContent = `Error: ${response.error}`;
                    } else {
                        // Display summary
                        summaryContent.innerHTML = `<strong>Summary:</strong> ${response.summary}`;

                        // Create and display tag
                        const tagPill = document.createElement('span');
                        tagPill.className = 'linkedin-tag-pill';
                        tagPill.setAttribute('data-tag', response.tag || 'post');
                        tagPill.textContent = response.tag || 'post';

                        tagContainer.innerHTML = '<strong>Tag:</strong> ';
                        tagContainer.appendChild(tagPill);
                    }
                }
            );
        } catch (error) {
            loadingIndicator.style.display = 'none';
            summaryContent.textContent = `Error: ${error.message}`;
            console.error("Analysis error:", error);
        }

        // Add click event to the toggle button
        toggleBtn.addEventListener('click', () => {
            // Toggle summary visibility
            if (summaryContainer.style.display === 'none') {
                summaryContainer.style.display = 'block';
                toggleBtn.textContent = '✨ Hide Summary & Tags';
            } else {
                summaryContainer.style.display = 'none';
                toggleBtn.textContent = '✨ Show Summary & Tags';
            }
        });
    });
}

// Removed the applyTagStyling function as we're now using CSS classes with data attributes