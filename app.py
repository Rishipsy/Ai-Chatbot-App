import logging
import os

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request
from google import genai
from google.genai.errors import APIError

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

gemini_api_key = os.getenv('GEMINI_API_KEY')
if not gemini_api_key:
    logger.warning('GEMINI_API_KEY is not set. Gemini API calls will fail until it is configured.')

gemini_client = genai.Client(api_key=gemini_api_key)

app = Flask(__name__)


def get_gemini_response(user_message: str) -> str:
    chat = gemini_client.chats.create(model='gemini-3.5-flash')
    response = chat.send_message(user_message)

    if (
        not response.candidates
        or not response.candidates[0].content
        or not response.candidates[0].content.parts
    ):
        return ''

    text_parts = []
    for part in response.candidates[0].content.parts:
        if hasattr(part, 'text') and isinstance(part.text, str):
            if getattr(part, 'thought', False):
                continue
            text_parts.append(part.text)

    return ''.join(text_parts).strip()


@app.route('/api/chat', methods=['POST'])
def chat():
    if not request.is_json:
        logger.error('Invalid JSON request: content type is not application/json')
        return jsonify({'error': 'Invalid JSON'}), 400

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        logger.error('Invalid JSON request body: expected a JSON object')
        return jsonify({'error': 'Invalid JSON'}), 400

    if 'message' not in data:
        logger.error('Missing message field in JSON body')
        return jsonify({'error': 'Missing message field'}), 400

    message = data['message']
    if not isinstance(message, str):
        logger.error('Invalid message type: expected string')
        return jsonify({'error': 'Message must be a string'}), 400

    trimmed_message = message.strip()
    if not trimmed_message:
        logger.error('Empty message after trimming whitespace')
        return jsonify({'error': 'Message must not be empty'}), 400

    max_length = 2000
    if len(message) > max_length:
        logger.error('Message too long: length %d exceeds limit %d', len(message), max_length)
        return jsonify({'error': f'Message must be at most {max_length} characters'}), 400

    try:
        response_text = get_gemini_response(trimmed_message)
        return jsonify({'response': response_text})
    except APIError as exc:
        logger.error('Gemini API error while handling /api/chat', exc_info=exc)
        return jsonify({'error': 'AI service is currently unavailable, please try again'}), 503
    except Exception as exc:
        logger.error('Unexpected error in /api/chat', exc_info=exc)
        return jsonify({'error': 'Something went wrong'}), 500


@app.route('/')
def index():
    return render_template('index.html')


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port)