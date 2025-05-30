# LinkedIn Post Summarizer

A Chrome extension that uses Google's Gemini 2.0 Flash AI model to generate concise summaries of LinkedIn posts.

![LinkedIn Post Summarizer](icons/icon128.png)

## Features

- 🚀 Summarize lengthy LinkedIn posts with one click
- ✨ Clean, intuitive interface that integrates seamlessly with LinkedIn
- 🔒 Secure API key management (your key is stored locally)
- 🌗 Supports both light and dark modes
- ⚡ Fast summarization using Gemini 2.0 Flash

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The LinkedIn Post Summarizer icon should now appear in your browser toolbar

## Setup

1. Click on the extension icon in your browser toolbar
2. Enter your Gemini API key ([Get one here](https://makersuite.google.com/app/apikey) if you don't have one)
3. Click "Save API Key"
4. Navigate to LinkedIn and start summarizing posts!

## How to Use

1. Browse LinkedIn as you normally would
2. When you encounter a lengthy post, look for the "✨ Summarize" button below the post
3. Click the button to generate a concise summary
4. Click "✨ Hide Summary" to collapse the summary view

## Technical Details

- Built using vanilla JavaScript, HTML, and CSS
- Uses the Google Gemini 2.0 Flash model for AI-powered summarization
- Follows Chrome extension Manifest V3 guidelines
- Designed for performance with minimal impact on page load times

## Privacy

This extension:
- Does not collect any personal data
- Only processes the text of LinkedIn posts you choose to summarize
- API requests are made directly from your browser to Google's Gemini API
- Your API key is stored locally in your browser's storage

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Credits

Developed by Arun Shrestha
