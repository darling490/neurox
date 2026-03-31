// ============================================================
// UI Module — Navigation, toasts, and common UI components (v2.0)
// ============================================================

const tabTitles = {
  chat: { icon: '💬', title: 'Chat' },
  code: { icon: '💻', title: 'Code' },
  image: { icon: '🎨', title: 'Create' },
  tools: { icon: '🧰', title: 'Tools' },
  settings: { icon: '⚙️', title: 'Settings' },
};

export function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const panels = document.querySelectorAll('.tab-panel');
  const indicator = document.querySelector('.nav-indicator');
  const headerTitle = document.getElementById('header-title');

  navItems.forEach((item, index) => {
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;

      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(10);

      // Update active nav
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      // Update indicator
      indicator.style.transform = `translateX(${index * 100}%)`;

      // Update panels
      panels.forEach(p => p.classList.remove('active'));
      document.getElementById(`panel-${tab}`).classList.add('active');

      // Update header
      const info = tabTitles[tab];
      headerTitle.innerHTML = `<span class="header-icon">${info.icon}</span> ${info.title}`;

      // Hide/show header buttons based on tab
      const btnNew = document.getElementById('btn-new-chat');
      const btnHistory = document.getElementById('btn-history');
      const modeSelector = document.getElementById('mode-selector');
      
      btnNew.style.display = (tab === 'chat') ? 'flex' : 'none';
      btnHistory.style.display = (tab === 'chat' || tab === 'code') ? 'flex' : 'none';
      modeSelector.style.display = (tab === 'chat') ? 'flex' : 'none';
    });
  });
}

export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

export function updateAIStatus(status, text) {
  const pill = document.getElementById('ai-status-pill');
  const statusText = document.getElementById('ai-status-text');

  pill.className = `status-pill ${status}`;
  statusText.textContent = text;

  // Also update settings status
  const dot = document.getElementById('status-dot-lg');
  const label = document.getElementById('model-status-label');
  const detail = document.getElementById('model-status-detail');

  if (dot) {
    dot.className = `status-dot-lg ${status}`;
  }

  if (status === 'ready') {
    if (label) label.textContent = 'Model loaded';
    if (detail) detail.textContent = text;
  } else if (status === 'loading') {
    if (label) label.textContent = 'Loading model...';
    if (detail) detail.textContent = text;
  } else if (status === 'error') {
    if (label) label.textContent = 'Error';
    if (detail) detail.textContent = text;
  }
}

export function showSplash() {
  document.getElementById('splash-screen').classList.remove('fade-out');
}

export function hideSplash() {
  const splash = document.getElementById('splash-screen');
  splash.classList.add('fade-out');
  setTimeout(() => splash.style.display = 'none', 600);
  document.getElementById('main-app').classList.remove('hidden');
}

export function updateSplashProgress(progress, text) {
  const fill = document.getElementById('splash-progress');
  const status = document.getElementById('splash-status');
  if (fill) fill.style.width = progress + '%';
  if (status) status.textContent = text;
}
