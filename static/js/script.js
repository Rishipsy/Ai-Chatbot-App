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
      // TODO: Phase 8 will add the actual fetch('/api/chat') call here
      await new Promise(function (resolve) {
        setTimeout(resolve, 1000);
      });
      appendMessage('This is a placeholder response', 'ai');
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