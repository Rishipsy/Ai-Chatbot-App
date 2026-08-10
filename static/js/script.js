document.addEventListener('DOMContentLoaded', function () {
  var chatMessages = document.getElementById('chatMessages');
  var loadingIndicator = document.getElementById('loadingIndicator');
  var errorMessage = document.getElementById('errorMessage');
  var messageInput = document.getElementById('messageInput');
  var sendButton = document.getElementById('sendButton');

  var isSending = false;
  var errorTimeout = null;

  function appendMessage(text, type) {
    var bubble = document.createElement('div');
    bubble.textContent = text;
    bubble.className = type === 'user' ? 'user-message' : 'ai-message';
    chatMessages.appendChild(bubble);
    scrollChatToBottom();
  }

  function showLoading(show) {
    if (show) {
      loadingIndicator.style.display = 'block';
    } else {
      loadingIndicator.style.display = 'none';
    }
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