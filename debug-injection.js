// This file helps with direct testing of the summarize button functionality
// You can paste this into the browser console when on LinkedIn to test without loading the extension

(function () {
    console.log("LinkedIn Post Summarizer: Direct injection script running");

    // Specifically target post content, not comments
    const postElements = document.querySelectorAll('.update-components-text.relative.update-components-update-v2__commentary');

    if (postElements.length === 0) {
        console.error("No post elements found. Let's try other selectors.");

        // Try alternative selectors
        const altSelectors = [
            '.feed-shared-update-v2__description',
            '.update-components-text:not(.comments-comment-item__main-content)',
            '.feed-shared-inline-show-more-text',
            'span.break-words:not(.comments-comment-item__main-content span)'
        ];

        for (const selector of altSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                console.log(`Found ${elements.length} elements with selector: ${selector}`);
                processElements(elements);
                return;
            }
        }

        console.error("Could not find any post content with known selectors");
        return;
    }

    console.log(`Found ${postElements.length} post elements`);
    processElements(postElements);

    function processElements(elements) {
        elements.forEach((postEl, index) => {
            // Skip if it's in a comments section
            if (
                postEl.closest('.feed-shared-update-v2__comments-container') ||
                postEl.closest('.comments-comment-item') ||
                postEl.closest('.comments-comments-list')
            ) {
                console.log(`Skipping element ${index + 1} as it appears to be in comments section`);
                return;
            }

            console.log(`Processing post ${index + 1}: "${postEl.textContent.substring(0, 50)}..."`);

            // Create the button
            const button = document.createElement('button');
            button.textContent = '✨ Summarize (Test)';
            button.style.backgroundColor = '#f3f2f1';
            button.style.border = 'none';
            button.style.borderRadius = '16px';
            button.style.color = '#0a66c2';
            button.style.cursor = 'pointer';
            button.style.fontSize = '14px';
            button.style.fontWeight = '600';
            button.style.margin = '8px 0';
            button.style.padding = '6px 12px';
            button.style.display = 'block';
            button.style.zIndex = '1000';
            button.style.position = 'relative';

            // Create the summary container (initially hidden)
            const container = document.createElement('div');
            container.style.backgroundColor = '#f9f9f9';
            container.style.border = '1px solid #e6e6e6';
            container.style.borderRadius = '8px';
            container.style.margin = '8px 0 12px';
            container.style.padding = '12px';
            container.style.fontSize = '14px';
            container.style.display = 'none';
            container.textContent = `Summary for post ${index + 1}: This is sample text that would be replaced with a Gemini-generated summary in the actual extension.`;

            // Try to find insertion point near social actions
            const socialActionSelectors = [
                '.social-details-social-counts',
                '.feed-shared-social-actions',
                '[data-control-name="comment"]'
            ];

            let insertPoint = null;

            for (const selector of socialActionSelectors) {
                // Find the closest container to this post that has social actions
                const container = postEl.closest('.feed-shared-update-v2, .occludable-update, .feed-shared-update-v2__description');
                if (container) {
                    const element = container.querySelector(selector);
                    if (element) {
                        insertPoint = element;
                        break;
                    }
                }
            }

            if (insertPoint) {
                // Insert near social actions
                const parentEl = insertPoint.parentElement;
                if (parentEl) {
                    parentEl.insertBefore(button, insertPoint.nextSibling);
                    parentEl.insertBefore(container, button.nextSibling);
                    console.log(`Added button after social actions for post ${index + 1}`);
                }
            } else {
                // Insert after the post content
                const parentEl = postEl.parentElement;
                if (parentEl) {
                    parentEl.insertBefore(button, postEl.nextSibling);
                    parentEl.insertBefore(container, button.nextSibling);
                    console.log(`Added button directly after post ${index + 1}`);
                } else {
                    console.error(`Could not find parent element for post ${index + 1}`);
                }
            }

            // Add click event
            button.addEventListener('click', () => {
                if (container.style.display === 'none') {
                    container.style.display = 'block';
                    button.textContent = '✨ Hide Summary (Test)';
                } else {
                    container.style.display = 'none';
                    button.textContent = '✨ Summarize (Test)';
                }
            });
        });
    }
})();