// ============================================================
// Tools Module — Calculator, Notes, Timer, Unit Converter
// ============================================================

import { showToast } from './ui.js';
import { setSetting, getSetting } from './storage.js';

// ==================== CALCULATOR ====================
let calcDisplay = '';
let calcHistory = [];

export function initCalculator() {
  const display = document.getElementById('calc-display');
  const historyEl = document.getElementById('calc-history');

  document.getElementById('calc-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('.calc-btn');
    if (!btn) return;
    
    if (navigator.vibrate) navigator.vibrate(15);
    const val = btn.dataset.val;
    
    if (val === 'C') {
      calcDisplay = '';
      display.textContent = '0';
    } else if (val === 'DEL') {
      calcDisplay = calcDisplay.slice(0, -1);
      display.textContent = calcDisplay || '0';
    } else if (val === '=') {
      try {
        // Safe math evaluation
        const sanitized = calcDisplay
          .replace(/×/g, '*')
          .replace(/÷/g, '/')
          .replace(/π/g, 'Math.PI')
          .replace(/√\(/g, 'Math.sqrt(')
          .replace(/sin\(/g, 'Math.sin(')
          .replace(/cos\(/g, 'Math.cos(')
          .replace(/tan\(/g, 'Math.tan(')
          .replace(/log\(/g, 'Math.log10(')
          .replace(/ln\(/g, 'Math.log(')
          .replace(/\^/g, '**');
        
        // eslint-disable-next-line no-eval
        const result = Function('"use strict"; return (' + sanitized + ')')();
        const resultStr = Number.isFinite(result) ? 
          (Number.isInteger(result) ? result.toString() : parseFloat(result.toFixed(10)).toString()) 
          : 'Error';
        
        calcHistory.unshift(`${calcDisplay} = ${resultStr}`);
        if (calcHistory.length > 10) calcHistory.pop();
        updateCalcHistory();
        
        calcDisplay = resultStr === 'Error' ? '' : resultStr;
        display.textContent = resultStr;
      } catch (e) {
        display.textContent = 'Error';
        calcDisplay = '';
      }
    } else {
      calcDisplay += val;
      display.textContent = calcDisplay;
    }
  });
}

function updateCalcHistory() {
  const el = document.getElementById('calc-history');
  if (!el) return;
  el.innerHTML = calcHistory.length 
    ? calcHistory.map(h => `<div class="calc-history-item">${h}</div>`).join('')
    : '<p class="tool-empty">No calculations yet</p>';
}

// ==================== NOTES ====================
let notes = [];
let activeNoteId = null;

export async function initNotes() {
  // Load saved notes
  const saved = await getSetting('notes');
  if (saved) notes = saved;
  renderNotesList();
  
  document.getElementById('btn-new-note').addEventListener('click', createNewNote);
  document.getElementById('note-content').addEventListener('input', debounce(saveCurrentNote, 500));
  document.getElementById('note-title').addEventListener('input', debounce(saveCurrentNote, 500));
}

function createNewNote() {
  const note = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    title: '',
    content: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  notes.unshift(note);
  activeNoteId = note.id;
  renderNotesList();
  showNoteEditor(note);
  if (navigator.vibrate) navigator.vibrate(20);
}

function showNoteEditor(note) {
  const titleEl = document.getElementById('note-title');
  const contentEl = document.getElementById('note-content');
  const editorEl = document.getElementById('note-editor');
  const listEl = document.getElementById('notes-list-view');
  
  titleEl.value = note.title;
  contentEl.value = note.content;
  editorEl.classList.add('visible');
  listEl.classList.add('hidden-view');
  contentEl.focus();
}

function renderNotesList() {
  const list = document.getElementById('notes-grid');
  if (!list) return;
  
  if (notes.length === 0) {
    list.innerHTML = '<p class="tool-empty">No notes yet. Tap + to create one.</p>';
    return;
  }
  
  list.innerHTML = notes.map(n => `
    <div class="note-card ${n.id === activeNoteId ? 'active' : ''}" data-id="${n.id}">
      <h4>${n.title || 'Untitled'}</h4>
      <p>${(n.content || '').substring(0, 60) || 'Empty note...'}</p>
      <span class="note-date">${new Date(n.updatedAt).toLocaleDateString()}</span>
      <button class="note-delete" data-id="${n.id}" title="Delete">✕</button>
    </div>
  `).join('');
  
  // Click handlers
  list.querySelectorAll('.note-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('note-delete')) return;
      const note = notes.find(n => n.id === card.dataset.id);
      if (note) {
        activeNoteId = note.id;
        showNoteEditor(note);
        renderNotesList();
      }
    });
  });
  
  list.querySelectorAll('.note-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      notes = notes.filter(n => n.id !== btn.dataset.id);
      if (activeNoteId === btn.dataset.id) activeNoteId = null;
      await setSetting('notes', notes);
      renderNotesList();
      showToast('Note deleted', 'info');
    });
  });
}

async function saveCurrentNote() {
  if (!activeNoteId) return;
  const note = notes.find(n => n.id === activeNoteId);
  if (!note) return;
  
  note.title = document.getElementById('note-title').value;
  note.content = document.getElementById('note-content').value;
  note.updatedAt = Date.now();
  
  await setSetting('notes', notes);
  renderNotesList();
}

export function backToNotesList() {
  document.getElementById('note-editor').classList.remove('visible');
  document.getElementById('notes-list-view').classList.remove('hidden-view');
  activeNoteId = null;
  renderNotesList();
}

// ==================== TIMER & STOPWATCH ====================
let timerInterval = null;
let timerRemaining = 0;
let timerRunning = false;
let stopwatchInterval = null;
let stopwatchTime = 0;
let stopwatchRunning = false;

export function initTimer() {
  // Timer controls
  document.getElementById('btn-timer-start').addEventListener('click', toggleTimer);
  document.getElementById('btn-timer-reset').addEventListener('click', resetTimer);
  
  // Stopwatch controls
  document.getElementById('btn-sw-start').addEventListener('click', toggleStopwatch);
  document.getElementById('btn-sw-reset').addEventListener('click', resetStopwatch);
  
  // Quick timer buttons
  document.querySelectorAll('.quick-timer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mins = parseInt(btn.dataset.mins);
      setTimer(mins * 60);
      if (navigator.vibrate) navigator.vibrate(20);
    });
  });

  // Timer tabs
  document.querySelectorAll('.timer-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.timer-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.target;
      document.getElementById('timer-panel').style.display = target === 'timer' ? 'block' : 'none';
      document.getElementById('stopwatch-panel').style.display = target === 'stopwatch' ? 'block' : 'none';
    });
  });
}

function setTimer(seconds) {
  if (timerRunning) toggleTimer();
  timerRemaining = seconds;
  updateTimerDisplay();
}

function toggleTimer() {
  if (timerRunning) {
    clearInterval(timerInterval);
    timerRunning = false;
    document.getElementById('btn-timer-start').textContent = '▶ Start';
  } else {
    if (timerRemaining <= 0) {
      // Default 5 minutes
      timerRemaining = 300;
      updateTimerDisplay();
    }
    timerRunning = true;
    document.getElementById('btn-timer-start').textContent = '⏸ Pause';
    timerInterval = setInterval(() => {
      timerRemaining--;
      updateTimerDisplay();
      if (timerRemaining <= 0) {
        clearInterval(timerInterval);
        timerRunning = false;
        document.getElementById('btn-timer-start').textContent = '▶ Start';
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
        showToast('⏰ Timer finished!', 'success');
      }
    }, 1000);
  }
}

function resetTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  timerRemaining = 0;
  document.getElementById('btn-timer-start').textContent = '▶ Start';
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const mins = Math.floor(timerRemaining / 60);
  const secs = timerRemaining % 60;
  document.getElementById('timer-display').textContent = 
    `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function toggleStopwatch() {
  if (stopwatchRunning) {
    clearInterval(stopwatchInterval);
    stopwatchRunning = false;
    document.getElementById('btn-sw-start').textContent = '▶ Resume';
  } else {
    stopwatchRunning = true;
    document.getElementById('btn-sw-start').textContent = '⏸ Pause';
    const startMs = Date.now() - stopwatchTime;
    stopwatchInterval = setInterval(() => {
      stopwatchTime = Date.now() - startMs;
      updateStopwatchDisplay();
    }, 50);
  }
}

function resetStopwatch() {
  clearInterval(stopwatchInterval);
  stopwatchRunning = false;
  stopwatchTime = 0;
  document.getElementById('btn-sw-start').textContent = '▶ Start';
  updateStopwatchDisplay();
}

function updateStopwatchDisplay() {
  const totalMs = stopwatchTime;
  const mins = Math.floor(totalMs / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = Math.floor((totalMs % 1000) / 10);
  document.getElementById('stopwatch-display').textContent = 
    `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

// ==================== UNIT CONVERTER ====================
const conversions = {
  length: {
    units: ['m', 'km', 'cm', 'mm', 'mi', 'ft', 'in', 'yd'],
    labels: ['Meters', 'Kilometers', 'Centimeters', 'Millimeters', 'Miles', 'Feet', 'Inches', 'Yards'],
    toBase: [1, 1000, 0.01, 0.001, 1609.344, 0.3048, 0.0254, 0.9144]
  },
  weight: {
    units: ['kg', 'g', 'mg', 'lb', 'oz', 'ton'],
    labels: ['Kilograms', 'Grams', 'Milligrams', 'Pounds', 'Ounces', 'Metric Tons'],
    toBase: [1, 0.001, 0.000001, 0.453592, 0.0283495, 1000]
  },
  temperature: {
    units: ['°C', '°F', 'K'],
    labels: ['Celsius', 'Fahrenheit', 'Kelvin'],
    special: true
  },
  speed: {
    units: ['m/s', 'km/h', 'mph', 'knots'],
    labels: ['m/s', 'km/h', 'mph', 'Knots'],
    toBase: [1, 0.277778, 0.44704, 0.514444]
  }
};

export function initConverter() {
  const categoryEl = document.getElementById('convert-category');
  const fromUnitEl = document.getElementById('convert-from-unit');
  const toUnitEl = document.getElementById('convert-to-unit');
  const fromValEl = document.getElementById('convert-from-val');
  const toValEl = document.getElementById('convert-to-val');

  function populateUnits() {
    const cat = categoryEl.value;
    const conv = conversions[cat];
    fromUnitEl.innerHTML = conv.labels.map((l, i) => `<option value="${i}">${l}</option>`).join('');
    toUnitEl.innerHTML = conv.labels.map((l, i) => `<option value="${i}">${l}</option>`).join('');
    if (conv.labels.length > 1) toUnitEl.selectedIndex = 1;
    doConvert();
  }

  function doConvert() {
    const cat = categoryEl.value;
    const conv = conversions[cat];
    const fromIdx = parseInt(fromUnitEl.value);
    const toIdx = parseInt(toUnitEl.value);
    const val = parseFloat(fromValEl.value) || 0;

    let result;
    if (conv.special && cat === 'temperature') {
      result = convertTemp(val, fromIdx, toIdx);
    } else {
      const baseVal = val * conv.toBase[fromIdx];
      result = baseVal / conv.toBase[toIdx];
    }

    toValEl.value = Number.isFinite(result) ? parseFloat(result.toFixed(8)) : '';
  }

  categoryEl.addEventListener('change', populateUnits);
  fromUnitEl.addEventListener('change', doConvert);
  toUnitEl.addEventListener('change', doConvert);
  fromValEl.addEventListener('input', doConvert);

  // Swap button
  document.getElementById('btn-convert-swap').addEventListener('click', () => {
    const f = fromUnitEl.selectedIndex;
    fromUnitEl.selectedIndex = toUnitEl.selectedIndex;
    toUnitEl.selectedIndex = f;
    doConvert();
    if (navigator.vibrate) navigator.vibrate(15);
  });

  populateUnits();
}

function convertTemp(val, fromIdx, toIdx) {
  // 0=C, 1=F, 2=K
  let celsius;
  if (fromIdx === 0) celsius = val;
  else if (fromIdx === 1) celsius = (val - 32) * 5 / 9;
  else celsius = val - 273.15;

  if (toIdx === 0) return celsius;
  if (toIdx === 1) return celsius * 9 / 5 + 32;
  return celsius + 273.15;
}

// ==================== TOOL TABS ====================
export function initToolTabs() {
  document.querySelectorAll('.tool-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tool-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tool-content').forEach(c => c.classList.remove('active'));
      document.getElementById(`tool-${btn.dataset.tool}`).classList.add('active');
      if (navigator.vibrate) navigator.vibrate(15);
    });
  });
}

// Utility
function debounce(fn, ms) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
}
