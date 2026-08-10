import os

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request
from google import genai

load_dotenv()

gemini_api_key = os.getenv('GEMINI_API_KEY')
if not gemini_api_key:
    print('Warning: GEMINI_API_KEY is not set. Gemini API calls will fail until it is configured.')

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
    data = request.get_json(silent=True)
    message = None

    if isinstance(data, dict):
        message = data.get('message')

    try:
        if message is None:
            raise ValueError('Missing message field in request body')

        response_text = get_gemini_response(message)
        return jsonify({'response': response_text})
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


@app.route('/')
def index():
    return render_template('index.html')


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port)