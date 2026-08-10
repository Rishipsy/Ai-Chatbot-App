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

# Secure server-side mapping of sector keys to system instructions.
# The frontend only sends the short sector key; full instructions are enforced here.
SECTOR_INSTRUCTIONS = {
    'general': (
        "You are a helpful, neutral AI assistant. Provide clear, concise, and accurate "
        "answers to user questions. Keep explanations accessible and avoid making "
        "unwarranted assumptions."
    ),
    'healthcare': (
        "You are an AI assistant responding in a healthcare context. Provide general, "
        "evidence-based information in a clear and empathetic tone. Include a clear "
        "disclaimer: you are not a medical professional and your responses are not a "
        "substitute for professional medical advice, diagnosis, or treatment. Advise "
        "the user to consult a qualified healthcare provider for personal medical "
        "concerns. Avoid providing prescriptive treatment plans or dosing guidance."
    ),
    'business': (
        "You are an AI assistant focusing on business and finance topics. Provide practical, "
        "actionable, and structured advice suitable for entrepreneurs, managers, and investors. "
        "When appropriate, highlight trade-offs, risk considerations, and next steps. Keep tone "
        "professional and concise."
    ),
    'education': (
        "You are an AI teaching assistant. Explain concepts step-by-step with clear examples, "
        "definitions, and simple analogies where useful. Structure answers to support learning "
        "progression and provide references to further reading when appropriate. Be patient and "
        "encourage curiosity."
    ),
    'legal': (
        "You are an AI assistant providing general legal information. Offer clear, structured "
        "explanations of legal concepts and procedures, but do NOT provide legal advice. Include a "
        "clear disclaimer that you are not a licensed attorney and that users should consult a "
        "qualified lawyer for advice about specific legal matters. Avoid creating contracts or "
        "giving jurisdiction-specific definitive answers without clarifying limitations."
    ),
}


def get_gemini_response(user_message: str, sector_key: str = 'general') -> str:
    # Safely resolve the sector instruction; default to 'general' if the key is unknown
    system_instruction = SECTOR_INSTRUCTIONS.get(sector_key, SECTOR_INSTRUCTIONS['general'])

    # NOTE: Some versions of the google-genai SDK do not accept a 'messages' argument
    # in chats.create(); calls may raise TypeError. To remain compatible across SDK
    # variants, prepend a guarded system instruction server-side to the user message
    # before sending. The instruction text is still controlled on the server (secure).
    chat = gemini_client.chats.create(model='gemini-3.5-flash')
    # Compose a controlled prompt that places the system instruction first; this is
    # functionally equivalent to setting a system role when the SDK does not expose
    # that parameter. The instruction is server-side only and cannot be influenced
    # by the client.
    prompt = f"System instruction:\n{system_instruction}\n\nUser: {user_message}"
    response = chat.send_message(prompt)

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

    # Validate sector key: only accept keys explicitly in SECTOR_INSTRUCTIONS
    sector = 'general'
    raw_sector = data.get('sector')
    if isinstance(raw_sector, str) and raw_sector in SECTOR_INSTRUCTIONS:
        sector = raw_sector
    else:
        # If provided but invalid, default to general silently
        sector = 'general'

    try:
        response_text = get_gemini_response(trimmed_message, sector_key=sector)
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