// ============================================================
// NeuroX v2.0 — Main App Controller
// ============================================================

import { initStorage, clearConversations, clearImages, getConversationCount, getImageCount, setSetting, getSetting } from './storage.js';
import { checkApiKey, setCallbacks, getStatus } from './ai-engine.js';
import { initChat, initCodeChat, loadConversation } from './chat.js';
import { initImageCreator, loadGallery } from './image-creator.js';
import { initNavigation, showToast, updateAIStatus, hideSplash, updateSplashProgress } from './ui.js';
import { initVoice, isVoiceInputSupported, startListening, stopListening, getIsListening } from './voice.js';
import { initCalculator, initNotes, initTimer, initConverter, initToolTabs, backToNotesList } from './tools.js';
import { initConversations } from './conversations.js';

let deferredInstallPrompt = null;

async function init() {
  updateSplashProgress(10, 'Loading storage...');

  // Initialize storage
  await initStorage();
  updateSplashProgress(25, 'Setting up UI...');

  // Initialize navigation
  initNavigation();
  updateSplashProgress(35, 'Initializing voice...');

  // Initialize voice
  initVoice();
  updateSplashProgress(45, 'Initializing chat...');

  // Initialize modules
  initChat();
  initCodeChat();
  updateSplashProgress(55, 'Setting up tools...');

  // Initialize tools
  initToolTabs();
  initCalculator();
  await initNotes();
  initTimer();
  initConverter();
  updateSplashProgress(70, 'Setting up image creator...');

  initImageCreator();
  updateSplashProgress(85, 'Setting up conversations...');

  // Initialize conversations sidebar
  initConversations(loadConversation);

  updateSplashProgress(90, 'Almost ready...');

  // Set up AI engine callbacks
  setCallbacks({
    onReady: (modelId) => {
      updateAIStatus('ready', modelId);
      document.getElementById('btn-send').disabled = false;
      document.getElementById('btn-send-code').disabled = false;
    },
    onError: (msg) => {
      updateAIStatus('error', 'Error');
      showToast('API error: ' + msg, 'error');
    },
  });

  // Setup settings page
  initSettings();

  // Setup voice input button
  initVoiceButton();

  // Setup notes back button
  document.getElementById('btn-back-notes').addEventListener('click', backToNotesList);

  // Update storage counts
  updateStorageCounts();

  // Check API key
  setTimeout(() => {
    updateSplashProgress(100, 'Ready!');
    setTimeout(() => {
      hideSplash();
      checkApiKey().then(isReady => {
        if (!isReady) {
          updateAIStatus('error', 'API Key Required');
          showToast('Go to Settings to configure your Gemini API key', 'info');
        } else {
          showToast('Gemini API configured and ready! 🚀', 'success');
        }
      });
    }, 400);
  }, 300);

  // PWA install prompt
  setupInstallPrompt();
}

function initVoiceButton() {
  const voiceBtn = document.getElementById('btn-voice');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('btn-send');

  if (!isVoiceInputSupported()) {
    voiceBtn.style.display = 'none';
    return;
  }

  voiceBtn.addEventListener('click', () => {
    if (getIsListening()) {
      stopListening();
      voiceBtn.classList.remove('listening');
    } else {
      startListening(
        // On final result
        (transcript) => {
          chatInput.value = transcript;
          chatInput.dispatchEvent(new Event('input'));
          sendBtn.disabled = false;
        },
        // On end
        () => {
          voiceBtn.classList.remove('listening');
        },
        // On interim result
        (interim) => {
          chatInput.value = interim;
          chatInput.style.height = 'auto';
          chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
        }
      );
      voiceBtn.classList.add('listening');
    }
  });
}

function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    
    // Show install banner
    const banner = document.getElementById('install-banner');
    banner.classList.remove('hidden');
    
    document.getElementById('btn-install').addEventListener('click', async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const result = await deferredInstallPrompt.userChoice;
        if (result.outcome === 'accepted') {
          showToast('NeuroX installed! 🎉', 'success');
        }
        deferredInstallPrompt = null;
        banner.classList.add('hidden');
      }
    });
    
    document.getElementById('btn-install-dismiss').addEventListener('click', () => {
      banner.classList.add('hidden');
    });
  });
}

function initSettings() {
  const saveBtn = document.getElementById('btn-save-key');
  const inputEl = document.getElementById('api-key-input');

  // Try to load existing
  getSetting('gemini_api_key').then(key => {
    if (key) inputEl.value = '********';
  });

  saveBtn.addEventListener('click', async () => {
    const key = inputEl.value.trim();
    if (!key) return;
    
    if (key !== '********') {
      await setSetting('gemini_api_key', key);
    }
    
    const isReady = await checkApiKey();
    if (isReady) {
      showToast('API Key saved successfully!', 'success');
    }
  });

  // Clear buttons
  document.getElementById('btn-clear-chats').addEventListener('click', async () => {
    if (confirm('Delete all chat history?')) {
      await clearConversations();
      showToast('Chat history cleared', 'success');
      updateStorageCounts();
    }
  });

  document.getElementById('btn-clear-images').addEventListener('click', async () => {
    if (confirm('Delete all saved images?')) {
      await clearImages();
      showToast('Images cleared', 'success');
      loadGallery();
      updateStorageCounts();
    }
  });
}

async function updateStorageCounts() {
  try {
    const convCount = await getConversationCount();
    const imgCount = await getImageCount();
    const chatEl = document.getElementById('chat-storage-size');
    const imgEl = document.getElementById('image-storage-size');
    if (chatEl) chatEl.textContent = `${convCount} conversation${convCount !== 1 ? 's' : ''}`;
    if (imgEl) imgEl.textContent = `${imgCount} image${imgCount !== 1 ? 's' : ''}`;
  } catch (e) {
    // ignore
  }
}

// Unregister Service Workers to forcefully clear aggressive local caching
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
  });
}

// Start the app
init().catch(err => {
  console.error('Init failed:', err);
  hideSplash();
});
