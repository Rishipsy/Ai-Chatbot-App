# AI Chatbot

## Project overview

AI Chatbot is an academic Flask application that provides a browser-based chat interface which communicates with Google Gemini via a Flask backend. The UI displays formatted AI responses, visual loading states, and several progressive enhancements aimed at a polished user experience.

## Features

- Browser chat UI with distinct user and AI message bubbles
- Backend `/api/chat` endpoint that returns real AI responses from Google Gemini (via google-genai)
- AI response formatting: markdown-like support for **bold**, unordered lists, ordered lists, paragraphs, and line breaks (rendered safely)
- Inline "AI is typing..." loading bubble inserted into the chat flow while awaiting a response
- Animated empty-state placeholder before the first message is sent
- Rich UI redesign: gradient header, colored message bubbles, avatars, ambient background blobs, and entry animations
- Voice input using the browser Web Speech API (microphone button is present and wired in supported browsers)
- Initial splash / loading screen on first page load: branded overlay with animated progress bar that fills over ~2.5s then fades to reveal the chat
- Client-side error handling and friendly messages when requests fail
- Responsive layout for desktop and mobile

## Technology stack

- Frontend: HTML5, CSS3, Vanilla JavaScript (Web Speech API present in supported browsers)
- Backend: Python, Flask
- AI: Google Gemini API via the `google-genai` SDK
- Deployment: Render (recommended), Gunicorn as process manager

## Architecture

User -> HTML/CSS/JS (browser UI) -> Flask backend (/api/chat) -> Gemini API (google-genai) -> Flask backend -> JS updates Chat UI

## Project structure

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
- A modern Chromium-based browser (Chrome/Edge) for full Web Speech API voice-input support

## Local installation

```bash
git clone [ADD_REPO_URL_HERE]
cd ai-chatbot
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
# source venv/bin/activate
pip install -r requirements.txt
```

## Environment variable setup

Create a `.env` file at the project root containing your Gemini API key:

```env
GEMINI_API_KEY=your_key_here
```

Note: `.env` is listed in `.gitignore` and should not be committed.

## How to run locally

Development (simple):

```bash
python app.py
```

Production-style with Gunicorn (recommended):

```bash
gunicorn app:app
```

Then open `http://localhost:5000` in your browser.

## API documentation

POST /api/chat

- Request (JSON):

```json
{ "message": "Hello, Gemini!" }
```

- Success response (HTTP 200):

```json
{ "response": "AI reply text" }
```

- Validation and error responses:
  - HTTP 400 — invalid JSON or missing/invalid `message` (examples: not JSON, missing `message`, `message` not a string, empty after trimming, or message too long)
  - HTTP 503 — AI service unavailable (generic message returned to client)
  - HTTP 500 — unexpected server error (generic message returned)

All error responses use a consistent JSON shape: `{ "error": "descriptive but safe message" }`.

## Error handling (implemented)

The backend performs these checks for each POST /api/chat request:
- Ensures the request Content-Type is application/json and the body parses to a JSON object
- Verifies the presence of the `message` field
- Validates that `message` is a string
- Ensures `message` is not empty after trimming
- Enforces a maximum length (2000 characters)

On Gemini/API failures the server returns a 503 with a safe generic message. Unexpected exceptions are logged server-side and return a 500 with a generic error to the client.

## Security information

- GEMINI_API_KEY is read from environment variables (python-dotenv loads `.env`) and is not hardcoded in source
- The API key is not sent to the frontend in templates, responses, or JavaScript
- Server-side logs do not include the raw API key
- Frontend rendering is defensive: user messages are inserted with textContent; AI responses are HTML-escaped then converted from limited markdown to HTML (this preserves formatting while preventing XSS)
- `.env` is included in `.gitignore` so secrets are not committed

## Deployment (Render)

- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app:app`
- Set `GEMINI_API_KEY` in the Render dashboard environment variables

## Repository and live URL

- GitHub repository: [ADD_REPO_URL_HERE]
- Live application: [ADD_LIVE_URL_HERE]

## Screenshot

![Chatbot screenshot](screenshots/chatbot.png)

## Future improvements

(Only items not currently implemented in the codebase)
- Conversation history persistence / database-backed chat memory
- Streaming AI responses so partial answers appear progressively
- Multi-language support and language-detection
- Accessibility refinements and expanded browser compatibility fallbacks for `:has()` and Web Speech API

---

Summary of listed features:
- Chat UI with user/AI bubbles
- Formatted AI responses (markdown-like: bold, lists, paragraphs)
- Inline "AI is typing..." loading bubble
- Animated empty-state placeholder
- UI redesign: gradient header, avatars, colors, animations, background blobs
- Voice input (Web Speech API / mic button)
- Initial splash/loading screen (branded progress bar, ~2.5s)
- Client-side error handling and responsive layout

Confirmations:
(a) Voice input: Present in the code — microphone button and SpeechRecognition handling are implemented in `templates/index.html` and `static/js/script.js`.
(b) Splash loading screen: Present and described in the Features section — the overlay with animated progress bar that fills over ~2.5s then fades away is implemented in `templates/index.html`, `static/css/style.css`, and `static/js/script.js`.
