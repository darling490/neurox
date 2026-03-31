// ============================================================
// Video Creator — Slide-based video composition
// ============================================================
import { showToast } from './ui.js';

let canvas, ctx;
let slides = [];
let activeSlideIndex = 0;
let isPlaying = false;
let animationId = null;

const backgrounds = {
  'gradient-purple': ['#1a0533', '#2d1b69', '#7c3aed'],
  'gradient-blue': ['#0a1628', '#1e3a5f', '#3b82f6'],
  'gradient-sunset': ['#1a0505', '#7f1d1d', '#f97316'],
  'gradient-forest': ['#051a0a', '#064e3b', '#10b981'],
  'gradient-ocean': ['#051a2e', '#0c4a6e', '#06b6d4'],
  'gradient-dark': ['#06060c', '#0e0e18', '#1a1a2e'],
};

function defaultSlide() {
  return { text: 'Your Text Here', bg: 'gradient-purple', duration: 3, transition: 'fade', fontSize: 36 };
}

export function initVideoCreator() {
  canvas = document.getElementById('video-canvas');
  ctx = canvas.getContext('2d');
  canvas.width = 640;
  canvas.height = 360;

  slides.push(defaultSlide());
  renderTimeline();
  renderSlide(0);
  updateSlideEditor();

  document.getElementById('btn-add-slide').addEventListener('click', () => {
    slides.push(defaultSlide());
    activeSlideIndex = slides.length - 1;
    renderTimeline(); renderSlide(activeSlideIndex); updateSlideEditor();
    showToast('Slide added', 'success');
  });

  document.getElementById('slide-text').addEventListener('input', e => {
    slides[activeSlideIndex].text = e.target.value; renderSlide(activeSlideIndex);
  });
  document.getElementById('slide-bg').addEventListener('change', e => {
    slides[activeSlideIndex].bg = e.target.value; renderSlide(activeSlideIndex); renderTimeline();
  });
  document.getElementById('slide-duration').addEventListener('input', e => {
    slides[activeSlideIndex].duration = parseInt(e.target.value) || 3;
  });
  document.getElementById('slide-transition').addEventListener('change', e => {
    slides[activeSlideIndex].transition = e.target.value;
  });
  document.getElementById('slide-font-size').addEventListener('input', e => {
    const s = parseInt(e.target.value);
    slides[activeSlideIndex].fontSize = s;
    document.getElementById('font-size-value').textContent = s + 'px';
    renderSlide(activeSlideIndex);
  });

  document.getElementById('btn-preview-video').addEventListener('click', previewVideo);
  document.getElementById('btn-export-video').addEventListener('click', exportVideo);
}

function renderTimeline() {
  const c = document.getElementById('timeline-slides');
  c.innerHTML = '';
  slides.forEach((s, i) => {
    const el = document.createElement('div');
    el.className = `timeline-slide ${i === activeSlideIndex ? 'active' : ''}`;
    const colors = backgrounds[s.bg] || backgrounds['gradient-purple'];
    el.style.background = `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
    el.textContent = s.text.substring(0, 20) || `Slide ${i+1}`;
    el.addEventListener('click', () => { activeSlideIndex = i; renderTimeline(); renderSlide(i); updateSlideEditor(); });
    c.appendChild(el);
  });
}

function updateSlideEditor() {
  const s = slides[activeSlideIndex]; if (!s) return;
  document.getElementById('slide-text').value = s.text;
  document.getElementById('slide-bg').value = s.bg;
  document.getElementById('slide-duration').value = s.duration;
  document.getElementById('slide-transition').value = s.transition;
  document.getElementById('slide-font-size').value = s.fontSize;
  document.getElementById('font-size-value').textContent = s.fontSize + 'px';
}

function renderSlide(index, progress = 1) {
  const s = slides[index]; if (!s) return;
  const w = canvas.width, h = canvas.height;
  const colors = backgrounds[s.bg] || backgrounds['gradient-purple'];
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, colors[0]); grad.addColorStop(0.5, colors[1]); grad.addColorStop(1, colors[2]);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

  // Particles
  for (let i = 0; i < 30; i++) {
    const x = ((i*73+index*31)%w), y = ((i*137+index*47)%h);
    ctx.fillStyle = `rgba(255,255,255,${0.03+(i%5)*0.015})`;
    ctx.beginPath(); ctx.arc(x, y, 1+(i%3), 0, Math.PI*2); ctx.fill();
  }

  if (s.text) {
    ctx.save(); ctx.globalAlpha = progress;
    ctx.fillStyle = 'white'; ctx.font = `bold ${s.fontSize}px 'Inter', sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10;
    const words = s.text.split(' '), maxW = w*0.8, lines = []; let cur = '';
    for (const word of words) { const t = cur ? cur+' '+word : word; if (ctx.measureText(t).width > maxW) { lines.push(cur); cur = word; } else cur = t; }
    lines.push(cur);
    const lh = s.fontSize*1.3, startY = h/2 - lines.length*lh/2 + lh/2;
    lines.forEach((l,i) => ctx.fillText(l, w/2, startY + i*lh));
    ctx.restore();
  }
}

function renderWithTransition(i, trans, p) {
  const w = canvas.width, h = canvas.height; ctx.save();
  if (trans === 'fade') { ctx.globalAlpha = p; renderSlide(i); }
  else if (trans === 'slide-left') { ctx.clearRect(0,0,w,h); ctx.translate(w*(1-p),0); renderSlide(i); }
  else if (trans === 'slide-up') { ctx.clearRect(0,0,w,h); ctx.translate(0,h*(1-p)); renderSlide(i); }
  else if (trans === 'zoom') { ctx.clearRect(0,0,w,h); const sc=0.5+p*0.5; ctx.translate(w*(1-sc)/2,h*(1-sc)/2); ctx.scale(sc,sc); renderSlide(i); }
  else renderSlide(i);
  ctx.restore();
}

async function previewVideo() {
  if (isPlaying) { isPlaying = false; if (animationId) cancelAnimationFrame(animationId); return; }
  isPlaying = true;
  const timeEl = document.getElementById('video-time');
  const btn = document.getElementById('btn-preview-video');
  btn.innerHTML = '⏸ Pause';
  let totalTime = 0;
  for (let i = 0; i < slides.length; i++) {
    if (!isPlaying) break;
    const dur = slides[i].duration * 1000, start = performance.now();
    activeSlideIndex = i; renderTimeline();
    await new Promise(res => {
      (function anim() {
        if (!isPlaying) { res(); return; }
        const el = performance.now() - start, tp = Math.min(el/500,1);
        renderWithTransition(i, slides[i].transition, tp);
        const sec = Math.floor((totalTime+el)/1000);
        timeEl.textContent = `${Math.floor(sec/60)}:${(sec%60).toString().padStart(2,'0')}`;
        if (el < dur) animationId = requestAnimationFrame(anim); else { totalTime += dur; res(); }
      })();
    });
  }
  isPlaying = false;
  btn.innerHTML = '▶ Preview'; timeEl.textContent = '0:00';
}

async function exportVideo() {
  if (!slides.length) { showToast('Add slides first', 'error'); return; }
  showToast('Recording video...', 'info');
  const btn = document.getElementById('btn-export-video'); btn.disabled = true;
  try {
    const stream = canvas.captureStream(30);
    const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 2500000 });
    const chunks = [];
    rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    const done = new Promise(res => { rec.onstop = () => {
      const blob = new Blob(chunks, {type:'video/webm'}), url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `neurox-video-${Date.now()}.webm`; a.click();
      URL.revokeObjectURL(url); res();
    };});
    rec.start();
    for (let i = 0; i < slides.length; i++) {
      const dur = slides[i].duration*1000, st = performance.now();
      await new Promise(res => { (function anim() { const el = performance.now()-st;
        renderWithTransition(i, slides[i].transition, Math.min(el/500,1));
        if (el < dur) requestAnimationFrame(anim); else res();
      })(); });
    }
    rec.stop(); await done;
    showToast('Video exported! 🎬', 'success');
  } catch (e) { showToast('Export failed: '+e.message, 'error'); }
  btn.disabled = false;
}
