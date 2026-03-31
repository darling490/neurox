// ============================================================
// Image Creator — Procedural art generation with Canvas API
// ============================================================

import { saveImage, getAllImages, deleteImage } from './storage.js';
import { showToast } from './ui.js';

let canvas, ctx;
let currentStyle = 'nebula';
let currentColors = ['#7c3aed', '#06b6d4', '#0a0a2e'];
let seed = Math.random();

export function initImageCreator() {
  canvas = document.getElementById('image-canvas');
  ctx = canvas.getContext('2d');
  canvas.width = 512;
  canvas.height = 512;

  // Style buttons
  document.getElementById('style-selector').addEventListener('click', (e) => {
    const btn = e.target.closest('.style-btn');
    if (!btn) return;
    document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentStyle = btn.dataset.style;
  });

  // Color swatches
  document.getElementById('color-palette').addEventListener('click', (e) => {
    const swatch = e.target.closest('.color-swatch');
    if (!swatch) return;
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    swatch.classList.add('active');
    currentColors = swatch.dataset.colors.split(',');
  });

  // Buttons
  document.getElementById('btn-generate-image').addEventListener('click', () => {
    seed = Math.random();
    generateArt();
  });

  document.getElementById('btn-randomize-image').addEventListener('click', () => {
    seed = Math.random();
    // Random style
    const styles = ['nebula', 'geometric', 'landscape', 'abstract', 'fractal', 'waves'];
    currentStyle = styles[Math.floor(Math.random() * styles.length)];
    document.querySelectorAll('.style-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.style === currentStyle);
    });
    // Random colors
    const swatches = document.querySelectorAll('.color-swatch');
    const randomSwatch = swatches[Math.floor(Math.random() * swatches.length)];
    swatches.forEach(s => s.classList.remove('active'));
    randomSwatch.classList.add('active');
    currentColors = randomSwatch.dataset.colors.split(',');
    generateArt();
  });

  document.getElementById('btn-save-image').addEventListener('click', saveCurrentImage);

  // Generate initial art
  generateArt();
  loadGallery();
}

function seededRandom() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}

function generateArt() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  switch (currentStyle) {
    case 'nebula': drawNebula(w, h); break;
    case 'geometric': drawGeometric(w, h); break;
    case 'landscape': drawLandscape(w, h); break;
    case 'abstract': drawAbstract(w, h); break;
    case 'fractal': drawFractal(w, h); break;
    case 'waves': drawWaves(w, h); break;
  }
}

function drawNebula(w, h) {
  // Dark background
  ctx.fillStyle = currentColors[2] || '#0a0a2e';
  ctx.fillRect(0, 0, w, h);

  // Stars
  for (let i = 0; i < 300; i++) {
    const x = seededRandom() * w;
    const y = seededRandom() * h;
    const size = seededRandom() * 2;
    const opacity = seededRandom() * 0.8 + 0.2;
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Nebula clouds
  for (let i = 0; i < 6; i++) {
    const cx = seededRandom() * w;
    const cy = seededRandom() * h;
    const radius = 80 + seededRandom() * 150;

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    const colorIdx = i % 2 === 0 ? 0 : 1;
    gradient.addColorStop(0, hexToRgba(currentColors[colorIdx], 0.3));
    gradient.addColorStop(0.5, hexToRgba(currentColors[colorIdx], 0.1));
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  // Bright center nebula
  const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w * 0.4);
  grad.addColorStop(0, hexToRgba(currentColors[0], 0.15));
  grad.addColorStop(0.3, hexToRgba(currentColors[1], 0.08));
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Particle streaks
  for (let i = 0; i < 50; i++) {
    const x = seededRandom() * w;
    const y = seededRandom() * h;
    const len = 20 + seededRandom() * 60;
    const angle = seededRandom() * Math.PI * 2;

    ctx.strokeStyle = hexToRgba(currentColors[i % 2], 0.15);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }
}

function drawGeometric(w, h) {
  ctx.fillStyle = currentColors[2] || '#0a0a2e';
  ctx.fillRect(0, 0, w, h);

  const shapes = 15 + Math.floor(seededRandom() * 20);
  for (let i = 0; i < shapes; i++) {
    const x = seededRandom() * w;
    const y = seededRandom() * h;
    const size = 30 + seededRandom() * 120;
    const sides = 3 + Math.floor(seededRandom() * 5);
    const rotation = seededRandom() * Math.PI * 2;
    const colorIdx = i % 2;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // Glow effect
    ctx.shadowColor = currentColors[colorIdx];
    ctx.shadowBlur = 20;

    ctx.strokeStyle = hexToRgba(currentColors[colorIdx], 0.6);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let j = 0; j <= sides; j++) {
      const angle = (j / sides) * Math.PI * 2;
      const px = Math.cos(angle) * size;
      const py = Math.sin(angle) * size;
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = hexToRgba(currentColors[colorIdx], 0.05);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Connection lines
  const points = [];
  for (let i = 0; i < 20; i++) {
    points.push({ x: seededRandom() * w, y: seededRandom() * h });
  }
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dist = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
      if (dist < 200) {
        ctx.strokeStyle = hexToRgba(currentColors[0], 0.1 * (1 - dist / 200));
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(points[i].x, points[i].y);
        ctx.lineTo(points[j].x, points[j].y);
        ctx.stroke();
      }
    }
  }
}

function drawLandscape(w, h) {
  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.6);
  skyGrad.addColorStop(0, currentColors[2] || '#0a0a2e');
  skyGrad.addColorStop(1, currentColors[0]);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // Sun/Moon
  const sunX = w * (0.2 + seededRandom() * 0.6);
  const sunY = h * (0.15 + seededRandom() * 0.25);
  const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 80);
  sunGrad.addColorStop(0, hexToRgba(currentColors[1], 0.9));
  sunGrad.addColorStop(0.3, hexToRgba(currentColors[1], 0.3));
  sunGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = sunGrad;
  ctx.fillRect(0, 0, w, h);

  // Stars
  for (let i = 0; i < 100; i++) {
    const x = seededRandom() * w;
    const y = seededRandom() * h * 0.4;
    ctx.fillStyle = `rgba(255,255,255,${seededRandom() * 0.5})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // Mountains
  for (let layer = 0; layer < 4; layer++) {
    const baseY = h * (0.4 + layer * 0.12);
    const darkness = 0.08 + layer * 0.07;

    ctx.fillStyle = `rgba(10, 10, 20, ${0.5 + layer * 0.15})`;
    ctx.beginPath();
    ctx.moveTo(0, h);

    for (let x = 0; x <= w; x += 4) {
      const noiseVal = noise(x * 0.004 + layer * 10 + seed * 100, 0) * 120;
      const y = baseY - noiseVal + layer * 30;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }

  // Water reflection
  const waterGrad = ctx.createLinearGradient(0, h * 0.75, 0, h);
  waterGrad.addColorStop(0, hexToRgba(currentColors[0], 0.2));
  waterGrad.addColorStop(1, hexToRgba(currentColors[1], 0.3));
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, h * 0.78, w, h * 0.22);
}

function drawAbstract(w, h) {
  ctx.fillStyle = currentColors[2] || '#0a0a2e';
  ctx.fillRect(0, 0, w, h);

  // Flowing curves
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    const startX = seededRandom() * w;
    const startY = seededRandom() * h;

    ctx.moveTo(startX, startY);
    for (let j = 0; j < 6; j++) {
      const cp1x = seededRandom() * w;
      const cp1y = seededRandom() * h;
      const cp2x = seededRandom() * w;
      const cp2y = seededRandom() * h;
      const endX = seededRandom() * w;
      const endY = seededRandom() * h;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
    }

    ctx.strokeStyle = hexToRgba(currentColors[i % 2], 0.3);
    ctx.lineWidth = 2 + seededRandom() * 4;
    ctx.shadowColor = currentColors[i % 2];
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Circles
  for (let i = 0; i < 20; i++) {
    const x = seededRandom() * w;
    const y = seededRandom() * h;
    const r = 10 + seededRandom() * 50;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(currentColors[i % 2], 0.08);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(currentColors[i % 2], 0.2);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawFractal(w, h) {
  ctx.fillStyle = currentColors[2] || '#0a0a2e';
  ctx.fillRect(0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const centerX = -0.5 + (seededRandom() - 0.5) * 0.5;
  const centerY = 0 + (seededRandom() - 0.5) * 0.5;
  const zoom = 2.5 + seededRandom() * 1.5;

  const c1 = hexToRgb(currentColors[0]);
  const c2 = hexToRgb(currentColors[1]);

  for (let px = 0; px < w; px++) {
    for (let py = 0; py < h; py++) {
      let x0 = (px - w / 2) / (w / zoom) + centerX;
      let y0 = (py - h / 2) / (h / zoom) + centerY;

      let x = 0, y = 0;
      let iteration = 0;
      const maxIter = 100;

      while (x * x + y * y <= 4 && iteration < maxIter) {
        const temp = x * x - y * y + x0;
        y = 2 * x * y + y0;
        x = temp;
        iteration++;
      }

      const idx = (py * w + px) * 4;
      if (iteration === maxIter) {
        data[idx] = 5;
        data[idx + 1] = 5;
        data[idx + 2] = 10;
      } else {
        const t = iteration / maxIter;
        const s = Math.sin(t * Math.PI);
        data[idx] = Math.floor(c1.r * (1 - s) + c2.r * s);
        data[idx + 1] = Math.floor(c1.g * (1 - s) + c2.g * s);
        data[idx + 2] = Math.floor(c1.b * (1 - s) + c2.b * s);
      }
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Glow overlay
  const glow = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w * 0.5);
  glow.addColorStop(0, hexToRgba(currentColors[0], 0.1));
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}

function drawWaves(w, h) {
  ctx.fillStyle = currentColors[2] || '#0a0a2e';
  ctx.fillRect(0, 0, w, h);

  const numWaves = 12;
  for (let i = 0; i < numWaves; i++) {
    const baseY = h * 0.2 + (i / numWaves) * h * 0.7;
    const amplitude = 30 + seededRandom() * 40;
    const frequency = 0.005 + seededRandom() * 0.015;
    const phase = seededRandom() * Math.PI * 2;
    const colorIdx = i % 2;

    ctx.beginPath();
    ctx.moveTo(0, h);

    for (let x = 0; x <= w; x += 2) {
      const y = baseY + Math.sin(x * frequency + phase + seed * 10) * amplitude
                      + Math.sin(x * frequency * 2.5 + phase * 1.3) * amplitude * 0.3;
      ctx.lineTo(x, y);
    }

    ctx.lineTo(w, h);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, baseY - amplitude, 0, h);
    grad.addColorStop(0, hexToRgba(currentColors[colorIdx], 0.15));
    grad.addColorStop(1, hexToRgba(currentColors[colorIdx], 0.02));
    ctx.fillStyle = grad;
    ctx.fill();

    // Wave line
    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const y = baseY + Math.sin(x * frequency + phase + seed * 10) * amplitude
                      + Math.sin(x * frequency * 2.5 + phase * 1.3) * amplitude * 0.3;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = hexToRgba(currentColors[colorIdx], 0.3);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// Utility functions
function hexToRgba(hex, alpha) {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  return {
    r: parseInt(hex.substr(0, 2), 16),
    g: parseInt(hex.substr(2, 2), 16),
    b: parseInt(hex.substr(4, 2), 16),
  };
}

// Simple noise function
function noise(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43758.5453) * 43758.5453;
  return n - Math.floor(n);
}

async function saveCurrentImage() {
  try {
    const dataUrl = canvas.toDataURL('image/png');
    const img = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      data: dataUrl,
      style: currentStyle,
      createdAt: Date.now(),
    };
    await saveImage(img);
    showToast('Image saved to gallery! 🎨', 'success');
    loadGallery();
  } catch (err) {
    showToast('Failed to save image', 'error');
  }
}

async function loadGallery() {
  const grid = document.getElementById('gallery-grid');
  const images = await getAllImages();
  grid.innerHTML = '';

  if (images.length === 0) {
    grid.innerHTML = '<p style="color: var(--text-muted); font-size: 13px; grid-column: 1/-1; text-align: center; padding: 20px;">No saved images yet. Generate and save some art!</p>';
    return;
  }

  images.reverse().forEach(img => {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.innerHTML = `
      <img src="${img.data}" alt="Generated art" loading="lazy" />
      <button class="delete-btn" title="Delete">✕</button>
    `;

    // Click to view full
    item.querySelector('img').addEventListener('click', () => {
      const link = document.createElement('a');
      link.href = img.data;
      link.download = `neurox-art-${img.id}.png`;
      link.click();
    });

    // Delete
    item.querySelector('.delete-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteImage(img.id);
      showToast('Image deleted', 'info');
      loadGallery();
    });

    grid.appendChild(item);
  });

  // Update settings count
  const countEl = document.getElementById('image-storage-size');
  if (countEl) countEl.textContent = `${images.length} image${images.length !== 1 ? 's' : ''}`;
}

export { loadGallery };
