/*
 * widget.js — Step 5c: an embeddable chat widget for the CV chatbot.
 *
 * Any website adds it with ONE line (the same model Greetova will sell):
 *   <script src="https://YOUR-API-HOST/widget.js" defer></script>
 *
 * Optional attributes on that <script> tag:
 *   data-title="Ask about my CV"   header text
 *   data-open="true"               open the panel on page load (used for testing)
 *   data-bottom="90"               distance of the bubble from the bottom edge in px
 *                                  (raise it if the site already has a button there)
 *
 * Design notes:
 * - Plain JavaScript, no framework: small and fast on any website.
 * - Shadow DOM: the widget's CSS can't affect the host page, and the host page's CSS
 *   can't break the widget.
 * - All text is HTML-escaped before display, so answers can never inject scripts.
 */
(function () {
  'use strict';

  // Guard: never load twice if the script tag is added twice by mistake.
  if (window.__cvChatWidgetLoaded) return;
  window.__cvChatWidgetLoaded = true;

  // Work out where the API lives: the same server that served this script.
  var scriptTag = document.currentScript;
  var apiBase = new URL(scriptTag.src).origin;
  var title = scriptTag.getAttribute('data-title') || 'Ask about Ahmer\'s CV';
  var openOnLoad = scriptTag.getAttribute('data-open') === 'true';
  // Only accept a plain number for the offset, so the attribute can't inject CSS.
  var bottomOffset = parseInt(scriptTag.getAttribute('data-bottom'), 10);
  if (!(bottomOffset >= 0 && bottomOffset <= 400)) bottomOffset = 20;
  var MAX_LENGTH = 500; // matches the server limit

  // ---------- Styles (portfolio dark theme, cyan accent) ----------
  var css = `
    :host { all: initial; --cw-bottom: ${bottomOffset}px; }
    * { box-sizing: border-box; font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; }
    .bubble {
      position: fixed; right: 20px; bottom: var(--cw-bottom); width: 58px; height: 58px; border-radius: 50%;
      border: none; cursor: pointer; z-index: 2147483000;
      background: linear-gradient(135deg, #00d4aa, #00b4d8); color: #0a0a0f;
      box-shadow: 0 6px 24px rgba(0, 212, 170, 0.35); display: grid; place-items: center;
      transition: transform 0.2s ease;
    }
    .bubble:hover { transform: scale(1.06); }
    .bubble:focus-visible, button:focus-visible, textarea:focus-visible { outline: 2px solid #00d4aa; outline-offset: 2px; }
    .panel {
      position: fixed; right: 20px; bottom: calc(var(--cw-bottom) + 70px); width: 370px; max-width: calc(100vw - 32px);
      height: 520px; max-height: calc(100vh - var(--cw-bottom) - 100px); z-index: 2147483000;
      background: #0a0a0f; border: 1px solid #1f2a3a; border-radius: 16px; overflow: hidden;
      display: none; flex-direction: column; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
    }
    .panel.open { display: flex; }
    .header {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      padding: 14px 16px; background: #1a1a2e; border-bottom: 1px solid #1f2a3a;
    }
    .header h2 { margin: 0; font-size: 15px; font-weight: 600; color: #e6edf3; }
    .header p { margin: 2px 0 0; font-size: 11.5px; color: #8b949e; }
    .close { background: none; border: none; color: #8b949e; font-size: 22px; cursor: pointer; line-height: 1; padding: 4px; }
    .close:hover { color: #e6edf3; }
    .messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .msg { max-width: 85%; padding: 10px 13px; border-radius: 12px; font-size: 14px; line-height: 1.5; word-wrap: break-word; }
    .msg.bot { align-self: flex-start; background: #1a1a2e; color: #e6edf3; border-bottom-left-radius: 4px; }
    .msg.user { align-self: flex-end; background: linear-gradient(135deg, #00d4aa, #00b4d8); color: #0a0a0f; border-bottom-right-radius: 4px; }
    .msg.error { align-self: flex-start; background: #2a1620; color: #ffb4c1; }
    .msg ul { margin: 6px 0 0; padding-left: 18px; }
    .msg strong { color: #00d4aa; }
    .typing { align-self: flex-start; color: #8b949e; font-size: 13px; padding: 4px 2px; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip {
      background: transparent; border: 1px solid #00d4aa55; color: #00d4aa; border-radius: 999px;
      padding: 6px 11px; font-size: 12.5px; cursor: pointer;
    }
    .chip:hover { background: #00d4aa18; }
    .composer { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #1f2a3a; background: #0d0d14; }
    textarea {
      flex: 1; resize: none; height: 42px; max-height: 110px; padding: 10px 12px; border-radius: 10px;
      border: 1px solid #1f2a3a; background: #1a1a2e; color: #e6edf3; font-size: 14px;
    }
    textarea::placeholder { color: #6e7681; }
    .send {
      width: 42px; height: 42px; border-radius: 10px; border: none; cursor: pointer;
      background: linear-gradient(135deg, #00d4aa, #00b4d8); color: #0a0a0f; font-size: 18px; font-weight: 700;
    }
    .send:disabled { opacity: 0.5; cursor: not-allowed; }
    .footer { text-align: center; font-size: 10.5px; color: #6e7681; padding: 0 12px 10px; background: #0d0d14; }
    @media (max-width: 480px) {
      .panel { right: 16px; left: 16px; width: auto; bottom: calc(var(--cw-bottom) + 66px); height: calc(100vh - var(--cw-bottom) - 90px); }
      .bubble { right: 16px; }
    }
  `;

  // ---------- Build the widget inside a Shadow DOM ----------
  var host = document.createElement('div');
  host.id = 'cv-chat-widget';
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: 'open' });

  root.innerHTML = `
    <style>${css}</style>
    <button class="bubble" aria-label="Open chat about Ahmer's CV" aria-expanded="false">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 5h16v11H8l-4 4V5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>
    </button>
    <section class="panel" role="dialog" aria-label="${escapeHtml(title)}">
      <div class="header">
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p>AI assistant · answers only from his CV</p>
        </div>
        <button class="close" aria-label="Close chat">&times;</button>
      </div>
      <div class="messages" aria-live="polite"></div>
      <form class="composer">
        <textarea rows="1" maxlength="${MAX_LENGTH}" placeholder="Ask about skills, experience..." aria-label="Your question"></textarea>
        <button class="send" type="submit" aria-label="Send">&#10148;</button>
      </form>
      <div class="footer">AI can make mistakes. Please verify important details with Ahmer.</div>
    </section>
  `;

  var bubble = root.querySelector('.bubble');
  var panel = root.querySelector('.panel');
  var closeBtn = root.querySelector('.close');
  var messages = root.querySelector('.messages');
  var form = root.querySelector('.composer');
  var input = root.querySelector('textarea');
  var sendBtn = root.querySelector('.send');
  var busy = false;

  // ---------- Helpers ----------

  // Escape HTML special characters so text is always shown as text, never run as code.
  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Tiny, SAFE formatter for the answers: escape first, then allow only **bold** and
  // "* " / "- " bullet lists. Nothing else from the answer is interpreted as HTML.
  function formatAnswer(text) {
    var lines = escapeHtml(text).split('\n');
    var html = '';
    var inList = false;
    lines.forEach(function (line) {
      var bullet = line.match(/^\s*[*-]\s+(.*)$/);
      if (bullet) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += '<li>' + bullet[1] + '</li>';
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        if (line.trim()) html += (html ? '<br>' : '') + line;
      }
    });
    if (inList) html += '</ul>';
    return html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  function addMessage(role, text) {
    var div = document.createElement('div');
    div.className = 'msg ' + role;
    div.innerHTML = role === 'bot' ? formatAnswer(text) : escapeHtml(text);
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  function setOpen(open) {
    panel.classList.toggle('open', open);
    bubble.setAttribute('aria-expanded', String(open));
    if (open) input.focus();
  }

  // ---------- Talking to the API ----------
  function ask(question) {
    question = question.trim();
    if (!question || busy) return;
    busy = true;
    sendBtn.disabled = true;
    addMessage('user', question);
    input.value = '';

    var typing = document.createElement('div');
    typing.className = 'typing';
    typing.textContent = 'Typing…';
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;

    fetch(apiBase + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: question }),
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (result) {
        typing.remove();
        if (result.ok) addMessage('bot', result.data.answer);
        else addMessage('error', result.data.error || 'Something went wrong. Please try again.');
      })
      .catch(function () {
        typing.remove();
        addMessage('error', 'Could not reach the assistant. Please check your connection and try again.');
      })
      .finally(function () {
        busy = false;
        sendBtn.disabled = false;
        input.focus();
      });
  }

  // ---------- Events ----------
  bubble.addEventListener('click', function () { setOpen(!panel.classList.contains('open')); });
  closeBtn.addEventListener('click', function () { setOpen(false); bubble.focus(); });
  root.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setOpen(false); bubble.focus(); } });
  form.addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });
  // Enter sends; Shift+Enter makes a new line.
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input.value); }
  });

  // ---------- Welcome message + suggested questions ----------
  addMessage('bot', 'Hi! I can answer questions about **Ahmer\'s** experience, skills and background. Try one of these:');
  var chips = document.createElement('div');
  chips.className = 'chips';
  ['What does he specialise in?', 'Which AWS services has he used?', 'Where has he worked?'].forEach(function (q) {
    var chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = q;
    chip.addEventListener('click', function () { chips.remove(); ask(q); });
    chips.appendChild(chip);
  });
  messages.appendChild(chips);

  if (openOnLoad) setOpen(true);
})();
