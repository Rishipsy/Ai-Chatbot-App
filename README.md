# AI Chatbot

## Project Overview

AI Chatbot is a lightweight academic chatbot project that connects a browser-based chat UI to a Flask backend and the Google Gemini API. It delivers real-time AI responses, renders formatted message content safely, and includes modern UI enhancements for a polished user experience.

## Features

- Clean conversational chat interface with user and AI message bubbles
- Real-time Gemini AI responses via backend `/api/chat` requests
- AI response formatting for markdown-like content such as bold text, lists, and paragraphs
- Inline "AI is typing..." loading indicator with animated typing bubbles
- Client-side error handling with user-friendly messages
- Responsive layout and animated UI details for desktop and mobile
- Voice input support via the browser Web Speech API in supported browsers (Chrome/Edge)

## Technology Stack

- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Python, Flask
- AI: Google Gemini API via the `google-genai` SDK
- Deployment: Render, Gunicorn

## Architecture

User -> HTML/CSS/JS -> Flask Backend -> Gemini API -> Flask Backend -> JS -> Chatbot UI

## Project Structure

ai-chatbot/
  app.py
  requirements.txt
  .env
  .gitignore
  README.md
  templates/
    index.html
  static/
    css/
      style.css
    js/
      script.js
  screenshots/
    .gitkeep

## Prerequisites

- Python 3.x
- pip
- A Google Gemini API key
- A modern browser such as Chrome or Edge for best compatibility with voice input

## Local Installation

```bash
git clone [ADD_REPO_URL_HERE]
cd ai-chatbot
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## Environment Variable Setup

Create a `.env` file in the project root with your Gemini API key:

```env
GEMINI_API_KEY=your_key_here
```

The `.env` file is listed in `.gitignore`, so it is not committed to version control.

## How to Run Locally

```bash
python app.py
```

Then open `http://localhost:5000` in your browser.

## API Documentation

### POST /api/chat

- Request JSON:

```json
{ "message": "Hello, Gemini!" }
```

- Success Response (HTTP 200):

```json
{ "response": "AI reply text" }
```

- Error Responses:

  - HTTP 400 for invalid request payloads
  - HTTP 503 when the AI service is unavailable
  - HTTP 500 for unexpected server errors

## Error Handling

The backend validates incoming requests to ensure they contain valid JSON, a `message` field, a string value, and a non-empty trimmed message within the allowed length. Validation failures return safe JSON error messages. AI service failures are surfaced as generic service-unavailable errors.

## Security Information

- The Gemini API key is loaded from environment variables and is never hardcoded in the repository.
- The API key is not exposed to the frontend in templates, responses, or JavaScript.
- User-provided chat messages are inserted safely using text-safe rendering, while AI response content is HTML-escaped before markdown-style formatting to prevent XSS.
- `.env` is gitignored, so credentials remain outside source control.

## Deployment Instructions

On Render, use:

- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app:app`

Then configure `GEMINI_API_KEY` as an environment variable in the Render dashboard.

## Repository and Live URL

- GitHub repository: [ADD_REPO_URL_HERE]
- Live application: [ADD_LIVE_URL_HERE]

## Screenshot

![Chatbot screenshot](screenshots/chatbot.png)

## Future Improvements

- Add conversation history and persistent chat memory
- Support streaming AI responses for faster partial answers
- Add multi-language support
- Refine voice input options and browser compatibility handling
