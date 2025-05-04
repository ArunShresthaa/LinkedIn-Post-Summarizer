// This file helps with direct testing of the summarize button functionality
// You can paste this into the browser console when on LinkedIn to test without loading the extension

(function () {
    console.log("LinkedIn Post Summarizer: Direct injection script running");

    // Find the post element from your example
    const postElements = document.querySelectorAll('span.break-words.tvm-parent-container');

    if (postElements.length === 0) {
        console.error("No post elements found with class 'break-words tvm-parent-container'");
        return;
    }

    console.log(`Found ${postElements.length} post elements`);

    postElements.forEach((postEl, index) => {
        console.log(`Processing post ${index + 1}`);

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
        container.textContent = "This is where the summary would appear. In the actual extension, this would call the Gemini API.";

        // Insert after the post
        const parentEl = postEl.parentElement;
        if (parentEl) {
            parentEl.insertBefore(button, postEl.nextSibling);
            parentEl.insertBefore(container, button.nextSibling);

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

            console.log(`Added button to post ${index + 1}`);
        } else {
            console.error(`Could not find parent element for post ${index + 1}`);
        }
    });
})();