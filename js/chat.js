// ============================================================
// Chat Module — Handles chat UI and message management (v2.0)
// ============================================================

import { generateResponse, isModelReady } from './ai-engine.js';
import { saveConversation, getConversation, getAllConversations } from './storage.js';
import { showToast } from './ui.js';
import { speakText, stopSpeaking, getIsSpeaking } from './voice.js';
import { shareMessage } from './conversations.js';

let currentConversation = null;
let chatHistory = [];
let isGenerating = false;
let currentMode = 'general';

const welcomeCardHTML = `
<div class="welcome-card" id="welcome-card">
  <div class="welcome-orb-mini"><div class="orb-core"></div></div>
  <h2>Hello! I'm <span class="gradient-text">NeuroX</span></h2>
  <p>Your AI assistant — chat, create, and get things done, right on your device.</p>
  <div class="mode-hint" id="mode-hint">
    <span class="mode-hint-icon">💬</span>
    <span>General Mode — Ask me anything</span>
  </div>
  <div class="quick-actions">
    <button class="quick-action-btn" data-prompt="Explain quantum computing in simple terms">
      <span class="qa-icon">🧠</span><span>Explain a concept</span>
    </button>
    <button class="quick-action-btn" data-prompt="Write a Python function to sort a list using merge sort with detailed comments">
      <span class="qa-icon">💻</span><span>Write some code</span>
    </button>
    <button class="quick-action-btn" data-prompt="Give me 5 creative project ideas for a weekend hackathon">
      <span class="qa-icon">💡</span><span>Brainstorm ideas</span>
    </button>
    <button class="quick-action-btn" data-prompt="What are the best practices for learning a new programming language quickly?">
      <span class="qa-icon">📚</span><span>Learning tips</span>
    </button>
  </div>
</div>
`;

const modePrompts = {
  general: 'You are NeuroX, a helpful, friendly, and knowledgeable AI assistant. Provide clear, concise, and accurate responses. Use markdown formatting when appropriate.',
  tutor: 'You are NeuroX in Tutor Mode. You are a patient, encouraging teacher. Explain concepts step-by-step, use simple language first then add complexity. Use examples, analogies, and ask questions to check understanding. Format with headers, bullet points, and numbered steps.',
  writer: 'You are NeuroX in Writer Mode. You are a skilled writing assistant. Help with emails, essays, stories, resumes, social media posts, and any written content. Suggest improvements, provide alternatives, and maintain the user\'s desired tone. Be creative and eloquent.',
  translator: 'You are NeuroX in Translator Mode. You are a multilingual translation assistant. Translate text between languages accurately. If the user doesn\'t specify a target language, translate to English. Provide pronunciation guides when helpful. Note any cultural context or nuances.'
};

const modeLabels = {
  general: 'General',
  tutor: 'Tutor',
  writer: 'Writer',
  translator: 'Translator'
};

// Simple Markdown parser
function parseMarkdown(text) {
  let html = text;

  // Code blocks with language
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const escapedCode = escapeHtml(code.trim());
    const langLabel = lang || 'code';
    return `<pre><div class="code-header"><span>${langLabel}</span><button class="copy-btn" onclick="window.__copyCode(this)">Copy</button></div><code class="language-${lang}">${highlightSyntax(escapedCode, lang)}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');

  // Unordered lists
  html = html.replace(/^[*-] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Line breaks (but not inside pre/code)
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');

  // Wrap in paragraphs if not already wrapped
  if (!html.startsWith('<')) html = '<p>' + html + '</p>';

  return html;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlightSyntax(code, lang) {
  let highlighted = code;

  const keywords = /\b(function|const|let|var|if|else|for|while|return|import|export|from|class|extends|new|this|async|await|try|catch|throw|switch|case|break|default|true|false|null|undefined|typeof|instanceof|yield|of|in|def|print|self|None|True|False|elif|except|finally|with|as|lambda|pass|raise|and|or|not|is)\b/g;
  highlighted = highlighted.replace(keywords, '<span class="hljs-keyword">$1</span>');

  highlighted = highlighted.replace(/(["'])((?:(?!\1|\\).|\\.)*?)\1/g, '<span class="hljs-string">$1$2$1</span>');
  highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="hljs-number">$1</span>');
  highlighted = highlighted.replace(/(\/\/.*$|#.*$)/gm, '<span class="hljs-comment">$1</span>');
  highlighted = highlighted.replace(/\b(\w+)\s*\(/g, '<span class="hljs-function">$1</span>(');

  return highlighted;
}

// Copy code helper
window.__copyCode = function(btn) {
  const code = btn.closest('pre').querySelector('code').textContent;
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy', 2000);
  });
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function createMessageEl(role, content, isStreaming = false) {
  const div = document.createElement('div');
  div.className = `message ${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = role === 'user' ? '🧑' : '✨';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';

  if (isStreaming) {
    contentDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
  } else {
    contentDiv.innerHTML = parseMarkdown(content);
    
    // Add action buttons for assistant messages
    if (role === 'assistant') {
      const actions = createMessageActions(content);
      contentDiv.appendChild(actions);
    }
  }

  div.appendChild(avatar);
  div.appendChild(contentDiv);
  return div;
}

function createMessageActions(content) {
  const actions = document.createElement('div');
  actions.className = 'message-actions';

  // Read aloud button
  const speakBtn = document.createElement('button');
  speakBtn.className = 'msg-action-btn';
  speakBtn.innerHTML = '🔊 Read';
  speakBtn.addEventListener('click', () => {
    if (getIsSpeaking()) {
      stopSpeaking();
      speakBtn.classList.remove('speaking');
      speakBtn.innerHTML = '🔊 Read';
    } else {
      speakText(content, () => {
        speakBtn.classList.remove('speaking');
        speakBtn.innerHTML = '🔊 Read';
      });
      speakBtn.classList.add('speaking');
      speakBtn.innerHTML = '⏹ Stop';
    }
    if (navigator.vibrate) navigator.vibrate(15);
  });

  // Share/Copy button
  const shareBtn = document.createElement('button');
  shareBtn.className = 'msg-action-btn';
  shareBtn.innerHTML = '📋 Copy';
  shareBtn.addEventListener('click', () => {
    shareMessage(content);
    if (navigator.vibrate) navigator.vibrate(15);
  });

  actions.appendChild(speakBtn);
  actions.appendChild(shareBtn);
  return actions;
}

function scrollToBottom(container) {
  requestAnimationFrame(() => {
    container.scrollTop = container.scrollHeight;
  });
}

export function setMode(mode) {
  currentMode = mode;
  const label = document.getElementById('current-mode-label');
  if (label) label.textContent = modeLabels[mode] || 'General';
  
  const hint = document.getElementById('mode-hint');
  if (hint) {
    const icons = { general: '💬', tutor: '🎓', writer: '✍️', translator: '🌐' };
    const descs = { 
      general: 'General Mode — Ask me anything',
      tutor: 'Tutor Mode — I\'ll teach step by step',
      writer: 'Writer Mode — I\'ll help you write',
      translator: 'Translator Mode — I\'ll translate for you'
    };
    hint.innerHTML = `<span class="mode-hint-icon">${icons[mode]}</span><span>${descs[mode]}</span>`;
  }
}

export function loadConversation(conv) {
  currentConversation = conv;
  chatHistory = conv.messages ? [...conv.messages] : [];
  
  const container = document.getElementById('chat-messages');
  container.innerHTML = '';
  
  if (chatHistory.length === 0) {
    insertWelcomeCard(container);
    return;
  }
  
  // Render all messages
  chatHistory.forEach(msg => {
    if (msg.role === 'user' || msg.role === 'assistant') {
      const el = createMessageEl(msg.role, msg.content);
      container.appendChild(el);
    }
  });
  
  scrollToBottom(container);
  showToast('Conversation loaded', 'info');
}

export function initChat() {
  const chatInput = document.getElementById('chat-input');
  const btnSend = document.getElementById('btn-send');
  const chatContainer = document.getElementById('chat-messages');
  const btnNewChat = document.getElementById('btn-new-chat');

  // Auto-resize textarea
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    btnSend.disabled = !chatInput.value.trim();
  });

  // Send on Enter (not Shift+Enter)
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage('chat');
    }
  });

  btnSend.addEventListener('click', () => sendMessage('chat'));

  // New chat
  btnNewChat.addEventListener('click', () => {
    newConversation();
    if (navigator.vibrate) navigator.vibrate(20);
  });

  // Quick actions
  document.querySelectorAll('#panel-chat .quick-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      chatInput.value = btn.dataset.prompt;
      chatInput.dispatchEvent(new Event('input'));
      sendMessage('chat');
    });
  });

  // Mode switcher
  document.querySelectorAll('#mode-selector .mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#mode-selector .mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setMode(btn.dataset.mode);
      if (navigator.vibrate) navigator.vibrate(15);
    });
  });

  // Start with a fresh conversation
  newConversation();
}

function newConversation() {
  currentConversation = {
    id: generateId(),
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  chatHistory = [];
  const container = document.getElementById('chat-messages');
  container.innerHTML = '';
  insertWelcomeCard(container);
}

function insertWelcomeCard(container) {
  if (!welcomeCardHTML) return;
  container.innerHTML = welcomeCardHTML;
  // Re-attach quick action listeners
  container.querySelectorAll('.quick-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const chatInput = document.getElementById('chat-input');
      chatInput.value = btn.dataset.prompt;
      chatInput.dispatchEvent(new Event('input'));
      sendMessage('chat');
    });
  });
}

export async function sendMessage(mode) {
  if (isGenerating) return;

  const inputId = mode === 'chat' ? 'chat-input' : 'code-input';
  const containerId = mode === 'chat' ? 'chat-messages' : 'code-messages';
  const input = document.getElementById(inputId);
  const container = document.getElementById(containerId);

  const text = input.value.trim();
  if (!text) return;

  if (!isModelReady()) {
    showToast('Please load an AI model first in Settings', 'error');
    return;
  }

  // Hide welcome card
  const welcomeCard = container.querySelector('.welcome-card');
  if (welcomeCard) welcomeCard.style.display = 'none';

  // Add user message
  const userMsg = createMessageEl('user', text);
  container.appendChild(userMsg);
  scrollToBottom(container);

  // Clear input
  input.value = '';
  input.style.height = 'auto';
  const sendBtn = document.getElementById(mode === 'chat' ? 'btn-send' : 'btn-send-code');
  sendBtn.disabled = true;

  // Add typing indicator
  const assistantMsg = createMessageEl('assistant', '', true);
  container.appendChild(assistantMsg);
  scrollToBottom(container);

  isGenerating = true;
  if (navigator.vibrate) navigator.vibrate(15);

  // Build messages for AI
  const systemPrompt = mode === 'code'
    ? 'You are an expert software developer. When asked to write code, provide clean, well-commented code with explanations. Use markdown code blocks with language identifiers (e.g., ```python). Be concise but thorough.'
    : modePrompts[currentMode] || modePrompts.general;

  chatHistory.push({ role: 'user', content: text });

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.slice(-10),
  ];

  try {
    const contentDiv = assistantMsg.querySelector('.message-content');
    let finalResponse = '';

    await generateResponse(messages, (currentText) => {
      finalResponse = currentText;
      contentDiv.innerHTML = parseMarkdown(currentText);
      scrollToBottom(container);
    });

    // Add action buttons after streaming completes
    const actions = createMessageActions(finalResponse);
    contentDiv.appendChild(actions);

    chatHistory.push({ role: 'assistant', content: finalResponse });

    // Save conversation
    if (currentConversation) {
      currentConversation.messages = chatHistory;
      currentConversation.updatedAt = Date.now();
      await saveConversation(currentConversation);
    }

  } catch (err) {
    const contentDiv = assistantMsg.querySelector('.message-content');
    contentDiv.innerHTML = `<p style="color: var(--danger);">⚠️ ${escapeHtml(err.message)}</p>`;
    showToast('Error generating response', 'error');
  }

  isGenerating = false;
}

export function initCodeChat() {
  const codeInput = document.getElementById('code-input');
  const btnSend = document.getElementById('btn-send-code');

  codeInput.addEventListener('input', () => {
    codeInput.style.height = 'auto';
    codeInput.style.height = Math.min(codeInput.scrollHeight, 120) + 'px';
    btnSend.disabled = !codeInput.value.trim();
  });

  codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage('code');
    }
  });

  btnSend.addEventListener('click', () => sendMessage('code'));

  // Quick actions
  document.querySelectorAll('#panel-code .quick-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      codeInput.value = btn.dataset.prompt;
      codeInput.dispatchEvent(new Event('input'));
      sendMessage('code');
    });
  });
}
