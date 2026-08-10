document.addEventListener('DOMContentLoaded', function () {
  var chatMessages = document.getElementById('chatMessages');
  var loadingIndicator = document.getElementById('loadingIndicator');
  var errorMessage = document.getElementById('errorMessage');
  var messageInput = document.getElementById('messageInput');
  var sendButton = document.getElementById('sendButton');
  var micButton = document.getElementById('micButton');

  var isSending = false;
  var errorTimeout = null;
  var loadingRow = null;
  var recognition = null;
  var isListening = false;

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatAIResponse(text) {
    var escaped = escapeHtml(text);
    var formatted = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    var blocks = formatted.split(/\n{2,}/);

    return blocks
      .map(function (block) {
        var lines = block.split('\n');
        if (lines.every(function (line) { return /^\s*[-*]\s+/.test(line); })) {
          var items = lines
            .map(function (line) {
              return '<li>' + line.replace(/^\s*[-*]\s+/, '') + '</li>';
            })
            .join('');
          return '<ul>' + items + '</ul>';
        }

        if (lines.every(function (line) { return /^\s*\d+\.\s+/.test(line); })) {
          var items = lines
            .map(function (line) {
              return '<li>' + line.replace(/^\s*\d+\.\s+/, '') + '</li>';
            })
            .join('');
          return '<ol>' + items + '</ol>';
        }

        return '<p>' + lines.join('<br>') + '</p>';
      })
      .join('');
  }

  function appendMessage(text, type) {
    var row = document.createElement('div');
    row.className = 'message-row ' + (type === 'user' ? 'user-row' : 'ai-row');

    var avatar = document.createElement('div');
    avatar.className = 'avatar ' + (type === 'user' ? 'user-avatar' : 'ai-avatar');
    avatar.innerHTML = type === 'user'
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12a4 4 0 100-8 4 4 0 000 8zm-6 8a1 1 0 011-1h10a1 1 0 011 1v1H6v-1zm3-2a6 6 0 0112 0v1H6v-1zm0 0" fill="currentColor"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 4h10v2H7V4zm2 2V4h2v2H9zm4 0V4h2v2h-2zM6 8h12v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8zm2 2h8v4H8v-4z" fill="currentColor"/></svg>';

    var bubble = document.createElement('div');
    bubble.className = (type === 'user' ? 'user-message' : 'ai-message') + ' message-bubble';

    if (type === 'ai') {
      bubble.innerHTML = formatAIResponse(text);
    } else {
      bubble.textContent = text;
    }

    row.appendChild(avatar);
    row.appendChild(bubble);
    chatMessages.appendChild(row);
    scrollChatToBottom();
  }

  function showLoading(show) {
    if (show) {
      if (!loadingRow) {
        loadingRow = document.createElement('div');
        loadingRow.className = 'message-row ai-row loading-row';

        var avatar = document.createElement('div');
        avatar.className = 'avatar ai-avatar';
        avatar.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 4h10v2H7V4zm2 2V4h2v2H9zm4 0V4h2v2h-2zM6 8h12v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8zm2 2h8v4H8v-4z" fill="currentColor"/></svg>';

        var bubble = document.createElement('div');
        bubble.className = 'ai-message message-bubble loading-message';
        bubble.innerHTML =
          '<span class="loading-dots" aria-hidden="true"><span></span><span></span><span></span></span>' +
          '<span class="loading-text">AI is typing...</span>';

        loadingRow.appendChild(avatar);
        loadingRow.appendChild(bubble);
      }

      if (!chatMessages.contains(loadingRow)) {
        chatMessages.appendChild(loadingRow);
      }
      scrollChatToBottom();
    } else {
      if (loadingRow && loadingRow.parentNode) {
        loadingRow.parentNode.removeChild(loadingRow);
      }
    }
  }

  function setupVoiceInput() {
    if (!micButton) {
      return;
    }

    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      micButton.style.display = 'none';
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = function () {
      isListening = true;
      micButton.classList.add('listening');
    };

    recognition.onresult = function (event) {
      var transcript = '';
      if (event.results && event.results[0] && event.results[0][0]) {
        transcript = event.results[0][0].transcript;
      }
      if (transcript) {
        messageInput.value = transcript;
        messageInput.focus();
      }
    };

    recognition.onend = function () {
      isListening = false;
      micButton.classList.remove('listening');
    };

    recognition.onerror = function () {
      isListening = false;
      micButton.classList.remove('listening');
      showError('Voice input failed, please try again or type your message.');
    };

    micButton.addEventListener('click', function () {
      if (isListening) {
        recognition.stop();
        return;
      }
      try {
        recognition.start();
      } catch (error) {
        showError('Voice input failed, please try again or type your message.');
      }
    });
  }

  function showError(text) {
    if (!errorMessage) {
      return;
    }

    errorMessage.textContent = text;
    errorMessage.style.display = 'block';

    if (errorTimeout) {
      clearTimeout(errorTimeout);
    }

    errorTimeout = setTimeout(function () {
      errorMessage.style.display = 'none';
      errorMessage.textContent = '';
      errorTimeout = null;
    }, 4000);
  }

  function clearError() {
    if (!errorMessage) {
      return;
    }

    if (errorTimeout) {
      clearTimeout(errorTimeout);
      errorTimeout = null;
    }

    errorMessage.style.display = 'none';
    errorMessage.textContent = '';
  }

  function scrollChatToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  setupVoiceInput();

  async function sendMessage() {
    if (isSending) {
      return;
    }

    var message = messageInput.value.trim();
    if (!message) {
      return;
    }

    clearError();
    isSending = true;
    sendButton.disabled = true;
    messageInput.disabled = true;

    appendMessage(message, 'user');
    messageInput.value = '';
    showLoading(true);

    try {
      var response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: message }),
      });

      if (!response.ok) {
        var errorText = await response.text();
        showError('Server error. Please try again.');
        return;
      }

      var data = await response.json();
      if (data.error) {
        showError(data.error);
        return;
      }

      if (typeof data.response === 'string') {
        appendMessage(data.response, 'ai');
      } else {
        showError('Unexpected response from server.');
      }
    } catch (error) {
      showError('Unable to send message. Please try again.');
    } finally {
      showLoading(false);
      isSending = false;
      sendButton.disabled = false;
      messageInput.disabled = false;
      messageInput.focus();
    }
  }

  sendButton.addEventListener('click', function () {
    sendMessage();
  });

  messageInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });
});