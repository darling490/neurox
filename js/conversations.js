// ============================================================
// Conversations Module — History sidebar, search, export, pin
// ============================================================

import { getAllConversations, saveConversation, deleteConversation } from './storage.js';
import { showToast } from './ui.js';

let isDrawerOpen = false;
let onConversationLoad = null;

export function initConversations(loadCallback) {
  onConversationLoad = loadCallback;
  
  // Drawer toggle
  document.getElementById('btn-history').addEventListener('click', toggleDrawer);
  document.getElementById('drawer-overlay').addEventListener('click', closeDrawer);
  document.getElementById('btn-close-drawer').addEventListener('click', closeDrawer);
  
  // Search
  document.getElementById('conv-search').addEventListener('input', (e) => {
    renderConversationList(e.target.value.toLowerCase());
  });
}

export async function toggleDrawer() {
  if (isDrawerOpen) {
    closeDrawer();
  } else {
    await openDrawer();
  }
}

async function openDrawer() {
  isDrawerOpen = true;
  await renderConversationList();
  document.getElementById('conversation-drawer').classList.add('open');
  document.getElementById('drawer-overlay').classList.add('open');
  if (navigator.vibrate) navigator.vibrate(20);
}

export function closeDrawer() {
  isDrawerOpen = false;
  document.getElementById('conversation-drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('open');
}

async function renderConversationList(searchQuery = '') {
  const list = document.getElementById('conv-list');
  let conversations = await getAllConversations();
  
  // Sort by updatedAt (newest first)
  conversations.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  
  // Filter by search
  if (searchQuery) {
    conversations = conversations.filter(c => {
      const lastMessage = c.messages && c.messages.length > 0 
        ? c.messages[c.messages.length - 1].content 
        : '';
      const firstUserMsg = c.messages?.find(m => m.role === 'user')?.content || '';
      return firstUserMsg.toLowerCase().includes(searchQuery) || 
             lastMessage.toLowerCase().includes(searchQuery);
    });
  }
  
  if (conversations.length === 0) {
    list.innerHTML = `<div class="conv-empty">
      <p>${searchQuery ? 'No matching conversations' : 'No conversations yet'}</p>
    </div>`;
    return;
  }
  
  list.innerHTML = conversations.map(c => {
    const firstUserMsg = c.messages?.find(m => m.role === 'user')?.content || 'New conversation';
    const title = firstUserMsg.substring(0, 50) + (firstUserMsg.length > 50 ? '...' : '');
    const messageCount = c.messages?.length || 0;
    const timeAgo = getTimeAgo(c.updatedAt || c.createdAt);
    const isPinned = c.pinned;
    
    return `<div class="conv-item ${isPinned ? 'pinned' : ''}" data-id="${c.id}">
      <div class="conv-item-main">
        ${isPinned ? '<span class="conv-pin-icon">📌</span>' : ''}
        <div class="conv-item-info">
          <span class="conv-item-title">${escapeHtml(title)}</span>
          <span class="conv-item-meta">${messageCount} messages · ${timeAgo}</span>
        </div>
      </div>
      <div class="conv-item-actions">
        <button class="conv-action-btn conv-pin" data-id="${c.id}" title="${isPinned ? 'Unpin' : 'Pin'}">
          ${isPinned ? '📌' : '📍'}
        </button>
        <button class="conv-action-btn conv-export" data-id="${c.id}" title="Export">
          📥
        </button>
        <button class="conv-action-btn conv-delete" data-id="${c.id}" title="Delete">
          🗑️
        </button>
      </div>
    </div>`;
  }).join('');
  
  // Event listeners
  list.querySelectorAll('.conv-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.conv-action-btn')) return;
      const conv = conversations.find(c => c.id === item.dataset.id);
      if (conv && onConversationLoad) {
        onConversationLoad(conv);
        closeDrawer();
      }
    });
  });
  
  list.querySelectorAll('.conv-pin').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const conv = conversations.find(c => c.id === btn.dataset.id);
      if (conv) {
        conv.pinned = !conv.pinned;
        await saveConversation(conv);
        await renderConversationList(searchQuery);
        showToast(conv.pinned ? 'Conversation pinned 📌' : 'Unpinned', 'info');
      }
    });
  });
  
  list.querySelectorAll('.conv-export').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const conv = conversations.find(c => c.id === btn.dataset.id);
      if (conv) exportConversation(conv);
    });
  });
  
  list.querySelectorAll('.conv-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm('Delete this conversation?')) {
        await deleteConversation(btn.dataset.id);
        await renderConversationList(searchQuery);
        showToast('Conversation deleted', 'info');
      }
    });
  });
}

function exportConversation(conv) {
  const firstMsg = conv.messages?.find(m => m.role === 'user')?.content || 'conversation';
  const filename = `neurox-chat-${firstMsg.substring(0, 30).replace(/[^a-z0-9]/gi, '_')}.md`;
  
  let content = `# NeuroX Chat Export\n`;
  content += `Date: ${new Date(conv.createdAt).toLocaleDateString()}\n\n---\n\n`;
  
  if (conv.messages) {
    conv.messages.forEach(m => {
      if (m.role === 'user') {
        content += `## 🧑 You\n${m.content}\n\n`;
      } else if (m.role === 'assistant') {
        content += `## ✨ NeuroX\n${m.content}\n\n`;
      }
    });
  }
  
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  
  showToast('Chat exported! 📥', 'success');
}

export async function shareMessage(text) {
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'NeuroX AI Response',
        text: text,
      });
    } catch (e) {
      // User cancelled or error
      if (e.name !== 'AbortError') {
        fallbackCopy(text);
      }
    }
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard! 📋', 'success');
  }).catch(() => {
    showToast('Could not copy text', 'error');
  });
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
