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
  var currentController = null;
  var stopMode = false;

  // Theme initialization: use saved preference or system preference when no saved value
  var themeToggle = document.getElementById('themeToggle');
  function applyTheme(theme, save) {
    document.documentElement.setAttribute('data-theme', theme);
    if (themeToggle) {
      // show moon when current theme is light (means clicking will switch to dark)
      themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
      themeToggle.setAttribute('aria-pressed', theme === 'dark');
    }
    if (save) localStorage.setItem('chatbotTheme', theme);
  }

  (function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem('chatbotTheme'); } catch (e) { saved = null; }
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = saved || (prefersDark ? 'dark' : 'light');
    applyTheme(theme, false);

    if (themeToggle) {
      themeToggle.addEventListener('click', function () {
        var current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        var next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next, true);
      });
    }
  })();

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
        var output = [];
        var contentLines = [];

        function formatContentLines(linesToFormat) {
          if (!linesToFormat.length) return '';
          if (linesToFormat.every(function (line) { return /^\s*[-*]\s+/.test(line); })) {
            return '<ul>' + linesToFormat
              .map(function (line) {
                return '<li>' + line.replace(/^\s*[-*]\s+/, '') + '</li>';
              })
              .join('') + '</ul>';
          }

          if (linesToFormat.every(function (line) { return /^\s*\d+\.\s+/.test(line); })) {
            return '<ol>' + linesToFormat
              .map(function (line) {
                return '<li>' + line.replace(/^\s*\d+\.\s+/, '') + '</li>';
              })
              .join('') + '</ol>';
          }

          return '<p>' + linesToFormat.join('<br>') + '</p>';
        }

        lines.forEach(function (line) {
          var heading = line.match(/^(#{1,3})\s+(.+)$/);
          if (heading) {
            output.push(formatContentLines(contentLines));
            contentLines = [];
            output.push('<h' + (5 - heading[1].length) + '>' + heading[2] + '</h' + (5 - heading[1].length) + '>');
          } else {
            contentLines.push(line);
          }
        });

        output.push(formatContentLines(contentLines));
        return output.join('');
      })
      .join('');
  }

  function revealAIResponse(bubble, text) {
    var finalHtml = formatAIResponse(text);
    var words = text.match(/\S+\s*/g) || [];
    var wordIndex = 0;
    var wordsPerStep = 3;

    function revealNext() {
      if (!bubble.isConnected) return;

      wordIndex = Math.min(wordIndex + wordsPerStep, words.length);
      bubble.innerHTML = formatAIResponse(words.slice(0, wordIndex).join('')) +
        '<span class="typing-cursor" aria-hidden="true"></span>';
      scrollChatToBottom();

      if (wordIndex < words.length) {
        setTimeout(revealNext, 24);
      } else {
        bubble.innerHTML = finalHtml;
        scrollChatToBottom();
      }
    }

    revealNext();
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

    if (type !== 'ai') {
      bubble.textContent = text;
    }

    row.appendChild(avatar);
    row.appendChild(bubble);
    chatMessages.appendChild(row);
    if (type === 'ai') {
      revealAIResponse(bubble, text);
    } else {
      scrollChatToBottom();
    }
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

  var historyList = document.getElementById('historyList');
  var historyEmpty = document.getElementById('historyEmpty');
  var historySidebar = document.getElementById('historySidebar');
  var historyOverlay = document.getElementById('historyOverlay');
  var historyToggleBtn = document.getElementById('historyToggle');

  // History: localStorage-backed recent questions (most recent first)
  var HISTORY_KEY = 'chatbotHistory';
  var historyItems = [];

  function loadHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      // Support legacy format (array of strings) and new format (array of objects {question, ts})
      if (!Array.isArray(parsed)) {
        historyItems = [];
      } else if (parsed.length > 0 && typeof parsed[0] === 'string') {
        // convert to objects, preserve original order
        historyItems = parsed.map(function (s) { return { question: s, ts: Date.now() }; });
      } else {
        historyItems = parsed;
      }
    } catch (e) {
      historyItems = [];
    }
  }

  function saveHistory() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(historyItems)); } catch (e) { /* ignore */ }
  }

  function formatTimestamp(ts) {
    try {
      var d = new Date(ts);
      // Simple locale string; useful and readable for most cases
      return d.toLocaleString();
    } catch (e) {
      return '';
    }
  }

  function renderHistory() {
    if (!historyList) return;
    historyList.innerHTML = '';
    if (!historyItems || historyItems.length === 0) {
      if (historyEmpty) historyEmpty.style.display = 'block';
      return;
    }
    if (historyEmpty) historyEmpty.style.display = 'none';
    historyItems.forEach(function (item) {
      var q = item && item.question ? item.question : (item || '');
      var ts = item && item.ts ? item.ts : null;
      var li = document.createElement('li');
      li.className = 'history-item';
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');

      var textSpan = document.createElement('div');
      textSpan.className = 'history-text';
      textSpan.textContent = q;

      var tsSpan = document.createElement('div');
      tsSpan.className = 'history-ts';
      tsSpan.textContent = ts ? formatTimestamp(ts) : '';

      li.appendChild(textSpan);
      li.appendChild(tsSpan);

      li.dataset.question = q;
      if (ts) li.dataset.ts = ts;
      historyList.appendChild(li);
    });
  }

  function addToHistory(q) {
    if (!q) return;
    // remove exact duplicate if present (by question text)
    historyItems = historyItems.filter(function (item) { return item.question !== q; });
    // add new object with timestamp
    historyItems.unshift({ question: q, ts: Date.now() });
    historyItems = historyItems.slice(0, 5);
    saveHistory();
    renderHistory();
  }

  function closeSidebar() {
    if (historySidebar) historySidebar.classList.remove('sidebar-open');
    if (historyOverlay) historyOverlay.classList.remove('visible');
  }

  function openSidebar() {
    if (historySidebar) historySidebar.classList.add('sidebar-open');
    if (historyOverlay) historyOverlay.classList.add('visible');
  }

  // Initialize history UI
  loadHistory();
  renderHistory();

  // Clear history button
  var clearHistoryBtn = document.getElementById('clearHistoryBtn');
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', function () {
      historyItems = [];
      saveHistory();
      renderHistory();
    });
  }

  // New Chat button - clears current conversation but preserves history
  var newChatButton = document.getElementById('newChatButton');
  if (newChatButton) {
    newChatButton.addEventListener('click', function () {
      // abort any in-flight request first
      if (currentController) {
        try { currentController.abort(); } catch (e) { /* ignore */ }
      }
      // remove message rows and system notes but keep hero, input-area, loadingIndicator, errorMessage
      var children = Array.from(chatMessages.children);
      children.forEach(function (child) {
        if (child.classList && (child.classList.contains('message-row') || child.classList.contains('system-note-row') || child.classList.contains('loading-row'))) {
          if (child.parentNode) child.parentNode.removeChild(child);
        }
      });
      // ensure loading is hidden and errors cleared
      showLoading(false);
      clearError();
      isSending = false;
      currentController = null;
      setSendButtonSend();
      if (messageInput) {
        messageInput.disabled = false;
        messageInput.value = '';
        messageInput.focus();
      }
    });
  }

  // Click handlers for history list (event delegation)
  if (historyList) {
    historyList.addEventListener('click', function (e) {
      var li = e.target.closest('li.history-item');
      if (!li) return;
      var q = li.dataset.question || li.textContent || '';
      if (messageInput) {
        messageInput.value = q;
        messageInput.focus();
      }
      // close on mobile
      closeSidebar();
    });

    // allow keyboard activation
    historyList.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        var li = e.target.closest('li.history-item');
        if (!li) return;
        var q = li.dataset.question || li.textContent || '';
        if (messageInput) {
          messageInput.value = q;
          messageInput.focus();
        }
        closeSidebar();
      }
    });
  }

  // Overlay click to close
  if (historyOverlay) {
    historyOverlay.addEventListener('click', function () { closeSidebar(); });
  }

  // Toggle button for mobile
  if (historyToggleBtn) {
    historyToggleBtn.addEventListener('click', function () {
      if (historySidebar && historySidebar.classList.contains('sidebar-open')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });
  }

  setupVoiceInput();

  // Sector selection handling: persist selection and expose value to sendMessage
  var sectorSelect = document.getElementById('sectorSelect');
  var SECTOR_KEY = 'chatbotSector';
  try {
    var savedSector = localStorage.getItem(SECTOR_KEY);
    if (sectorSelect) {
      sectorSelect.value = savedSector || 'general';
      sectorSelect.addEventListener('change', function (e) {
        try { localStorage.setItem(SECTOR_KEY, sectorSelect.value); } catch (err) { /* ignore */ }
        // Small optional system note to indicate mode change to the user
        var label = sectorSelect.options[sectorSelect.selectedIndex] ? sectorSelect.options[sectorSelect.selectedIndex].text : sectorSelect.value;
        showSectorSwitchNotice('Switched to ' + label + ' mode');
      });
    }
  } catch (e) { /* ignore localStorage errors */ }

  // Suggestion cards click handler (fills input but does not auto-send)
  var suggestionGrid = document.querySelector('.suggestion-grid');
  if (suggestionGrid) {
    suggestionGrid.addEventListener('click', function (e) {
      var card = e.target.closest('.suggestion-card');
      if (!card) return;
      var prompt = card.dataset.prompt || '';
      if (messageInput) {
        messageInput.value = prompt;
        messageInput.focus();
      }
    });

    // keyboard activation for accessibility
    suggestionGrid.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        var card = e.target.closest('.suggestion-card');
        if (!card) return;
        e.preventDefault();
        var prompt = card.dataset.prompt || '';
        if (messageInput) {
          messageInput.value = prompt;
          messageInput.focus();
        }
      }
    });
  }

  function setSendButtonStop() {
    if (!sendButton) return;
    stopMode = true;
    sendButton.classList.add('stop-mode');
    // show square stop icon + accessible label
    sendButton.innerHTML = '■<span class="sr-only">Stop</span>';
    sendButton.setAttribute('aria-label', 'Stop response');
  }

  function setSendButtonSend() {
    if (!sendButton) return;
    stopMode = false;
    sendButton.classList.remove('stop-mode');
    sendButton.innerHTML = '➤<span class="sr-only">Send</span>';
    sendButton.setAttribute('aria-label', 'Send message');
  }

  function appendSystemNote(text) {
    try {
      var noteRow = document.createElement('div');
      noteRow.className = 'system-note-row';
      var note = document.createElement('div');
      note.className = 'system-note';
      note.textContent = text;
      noteRow.appendChild(note);
      chatMessages.appendChild(noteRow);
      scrollChatToBottom();
    } catch (e) { /* ignore append errors */ }
  }

  function showSectorSwitchNotice(text) {
    try {
      var existingNotices = chatMessages.querySelectorAll('.sector-switch-notice');
      var noticeRow = existingNotices[0];
      for (var i = 1; i < existingNotices.length; i++) {
        existingNotices[i].remove();
      }

      if (!noticeRow) {
        noticeRow = document.createElement('div');
        noticeRow.className = 'system-note-row sector-switch-notice';
        var notice = document.createElement('div');
        notice.className = 'system-note';
        noticeRow.appendChild(notice);
        chatMessages.appendChild(noticeRow);
      }

      noticeRow.querySelector('.system-note').textContent = text;
      scrollChatToBottom();
    } catch (e) { /* ignore append errors */ }
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
    // keep sendButton enabled so user can click to STOP; use stop-mode visuals
    messageInput.disabled = true;

    appendMessage(message, 'user');
    // store in history (most recent first), persist and re-render
    try { addToHistory(message); } catch (e) { /* ignore history errors */ }
    messageInput.value = '';
    showLoading(true);

    // prepare abort controller for this request
    var controller = new AbortController();
    currentController = controller;
    setSendButtonStop();

    try {
      // include the currently selected sector (frontend only sends a short key)
      var sectorVal = 'general';
      if (typeof sectorSelect !== 'undefined' && sectorSelect && sectorSelect.value) {
        sectorVal = sectorSelect.value;
      }
      var response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: message, sector: sectorVal }),
        signal: controller.signal,
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
      if (error && error.name === 'AbortError') {
        // request was intentionally aborted by user
        // remove loading indicator and append a subtle system note
        appendSystemNote('Response stopped');
      } else {
        showError('Unable to send message. Please try again.');
      }
    } finally {
      showLoading(false);
      isSending = false;
      // clear controller reference and reset button
      currentController = null;
      setSendButtonSend();
      messageInput.disabled = false;
      messageInput.focus();
    }
  }

  sendButton.addEventListener('click', function () {
    // if a request is active, clicking acts as Stop
    if (currentController) {
      try { currentController.abort(); } catch (e) { /* ignore */ }
      return;
    }
    sendMessage();
  });

  messageInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });
});

// Page loader handling: fade out after progress finishes
window.addEventListener('load', function () {
  // Slightly longer than the CSS animation to ensure full fill
  var hideDelay = 2600; // ms
  setTimeout(function () {
    var loader = document.getElementById('pageLoader');
    if (!loader) return;
    loader.classList.add('loader-hidden');
    // Remove after fade transition completes (~420ms)
    setTimeout(function () {
      if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
    }, 420);
  }, hideDelay);
});
