// Vice Cover Studio's editor: photos, layouts, grades, caption and PNG export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, SIZES, LAYOUTS, GRADES, layoutPanels } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');

/** The four sample photos shipped with the app, made with an image model. */
export const SAMPLES = [
  { name: 'pier', label: 'Pier' },
  { name: 'boulevard', label: 'Boulevard' },
  { name: 'friends-neon', label: 'Neon street' },
  { name: 'man-rooftop', label: 'Rooftop' },
];

/** The editor state: what the cover looks like and how each panel is framed. */
export const state = {
  size: 'square',
  layout: 'hero3',
  grade: 'sunset',
  title: 'Sunset Run',
  subtitle: 'one last ride down the coast',
  titleColor: '#ffffff',
  titlePos: 'bottom',
  grain: true,
  vignette: true,
  activePanel: 0,
  selectedPhoto: 0,
  slots: Array.from({ length: 9 }, (_, i) => ({ photo: i % 4, zoom: 1, dx: 0, dy: 0 })),
};

/** Loaded photos by index: { img, name } or null. */
export const photos = [];

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Loads a sample photo into `photos[index]` (no-op when already loaded). */
export async function loadSample(index) {
  if (photos[index]) return photos[index];
  const img = await loadImage(`samples/${SAMPLES[index].name}.jpg`);
  photos[index] = { img, name: SAMPLES[index].name };
  return photos[index];
}

/** Sizes the preview canvas to the chosen post size and redraws the cover. */
export function redraw() {
  const size = SIZES[state.size];
  if (canvas.width !== size.width || canvas.height !== size.height) {
    canvas.width = size.width;
    canvas.height = size.height;
  }
  const imgs = photos.map((p) => (p ? p.img : null));
  drawCover(canvas, state, imgs);
  const slot = state.slots[state.activePanel];
  const zoom = document.getElementById('zoom');
  if (document.activeElement !== zoom) zoom.value = slot.zoom;
  document.getElementById('zoomValue').textContent = `${Math.round(slot.zoom * 100)}%`;
}

/** Builds the layout and grade choice buttons. */
export function buildChoices() {
  const layouts = document.getElementById('layouts');
  for (const [key, layout] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = layout.name;
    b.setAttribute('aria-pressed', String(state.layout === key));
    b.addEventListener('click', () => {
      state.layout = key;
      state.activePanel = 0;
      buildPanelPick();
      document.querySelectorAll('#layouts button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      redraw();
    });
    layouts.appendChild(b);
  }
  const grades = document.getElementById('grades');
  for (const [key, grade] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = grade.name;
    b.style.background = `linear-gradient(135deg, ${grade.top.replace(',0)', ',0.9)')}, ${grade.bottom})`;
    b.setAttribute('aria-pressed', String(state.grade === key));
    b.addEventListener('click', () => {
      state.grade = key;
      document.querySelectorAll('#grades button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      redraw();
    });
    grades.appendChild(b);
  }
}

/** Builds the sample-photo thumbnails. */
export function buildSamples() {
  const box = document.getElementById('samples');
  SAMPLES.forEach((sample, index) => {
    const img = document.createElement('img');
    img.src = `samples/${sample.name}.jpg`;
    img.alt = sample.label;
    img.title = sample.label;
    img.setAttribute('aria-pressed', String(state.selectedPhoto === index));
    img.addEventListener('click', async () => {
      state.selectedPhoto = index;
      await loadSample(index);
      state.slots[state.activePanel].photo = index;
      document.querySelectorAll('#samples img').forEach((x) => x.setAttribute('aria-pressed', String(x === img)));
      redraw();
    });
    box.appendChild(img);
  });
}

/** Builds the panel picker for the current layout. */
export function buildPanelPick() {
  const box = document.getElementById('panelPick');
  box.innerHTML = '';
  const panels = layoutPanels(state.layout, canvas.width, canvas.height).filter((p) => !p.titleCell);
  panels.forEach((panel, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `Panel ${i + 1}`;
    b.setAttribute('aria-pressed', String(state.activePanel === i));
    b.addEventListener('click', () => {
      state.activePanel = i;
      buildPanelPick();
      redraw();
    });
    box.appendChild(b);
  });
}

/** Finds which panel (by index) a point on the canvas falls in, or -1. */
export function panelAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * canvas.width;
  const y = ((clientY - rect.top) / rect.height) * canvas.height;
  const panels = layoutPanels(state.layout, canvas.width, canvas.height).filter((p) => !p.titleCell);
  return panels.findIndex((p) => x >= p.x * canvas.width && x < (p.x + p.w) * canvas.width
    && y >= p.y * canvas.height && y < (p.y + p.h) * canvas.height);
}

/** Renders the cover offscreen at an export size and downloads it as a PNG. */
export function exportCover(sizeKey) {
  return new Promise((resolve) => {
    const size = SIZES[sizeKey];
    const off = document.createElement('canvas');
    off.width = size.width;
    off.height = size.height;
    const imgs = photos.map((p) => (p ? p.img : null));
    drawCover(off, { ...state, size: sizeKey }, imgs);
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-cover-${size.width}x${size.height}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      status.textContent = `Saved vice-cover-${size.width}x${size.height}.png`;
      resolve();
    }, 'image/png');
  });
}

function wireControls() {
  document.getElementById('photo').addEventListener('change', async (e) => {
    for (const file of e.target.files) {
      if (photos.length >= 12) break;
      const img = await loadImage(URL.createObjectURL(file));
      photos.push({ img, name: file.name });
    }
    state.slots[state.activePanel].photo = photos.length - 1;
    redraw();
  });
  document.getElementById('fillAll').addEventListener('click', () => {
    const photo = state.slots[state.activePanel].photo;
    state.slots.forEach((slot) => { slot.photo = photo; });
    redraw();
  });
  document.getElementById('resetFrame').addEventListener('click', () => {
    state.slots.forEach((slot) => { slot.zoom = 1; slot.dx = 0; slot.dy = 0; });
    redraw();
  });
  document.getElementById('zoom').addEventListener('input', (e) => {
    state.slots[state.activePanel].zoom = Number(e.target.value);
    redraw();
  });
  document.getElementById('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
  document.getElementById('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  document.getElementById('titleColor').addEventListener('change', (e) => { state.titleColor = e.target.value; redraw(); });
  document.getElementById('titlePos').addEventListener('change', (e) => { state.titlePos = e.target.value; redraw(); });
  document.getElementById('grain').addEventListener('change', (e) => { state.grain = e.target.checked; redraw(); });
  document.getElementById('vignette').addEventListener('change', (e) => { state.vignette = e.target.checked; redraw(); });
  document.getElementById('size').addEventListener('change', (e) => { state.size = e.target.value; redraw(); });
  document.getElementById('export').addEventListener('click', () => exportCover(state.size));
  document.getElementById('exportAll').addEventListener('click', async () => {
    for (const key of Object.keys(SIZES)) {
      await exportCover(key);
      await new Promise((r) => setTimeout(r, 400));
    }
  });

  let dragging = null;
  canvas.addEventListener('pointerdown', (e) => {
    const hit = panelAt(e.clientX, e.clientY);
    if (hit >= 0 && hit !== state.activePanel) {
      state.activePanel = hit;
      buildPanelPick();
    }
    dragging = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const slot = state.slots[state.activePanel];
    slot.dx += (e.clientX - dragging.x) / rect.width;
    slot.dy += (e.clientY - dragging.y) / rect.height;
    slot.dx = Math.max(-0.6, Math.min(0.6, slot.dx));
    slot.dy = Math.max(-0.6, Math.min(0.6, slot.dy));
    dragging = { x: e.clientX, y: e.clientY };
    redraw();
  });
  canvas.addEventListener('pointerup', () => { dragging = null; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const slot = state.slots[state.activePanel];
    slot.zoom = Math.max(1, Math.min(3, slot.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
    redraw();
  }, { passive: false });
}

/** Applies a screenshot scene: loads its photos, sets the state, redraws. */
export async function setupShot(patch) {
  if (patch.size) state.size = patch.size;
  if (patch.layout) state.layout = patch.layout;
  if (patch.grade) state.grade = patch.grade;
  if (patch.title !== undefined) state.title = patch.title;
  if (patch.subtitle !== undefined) state.subtitle = patch.subtitle;
  if (patch.titleColor) state.titleColor = patch.titleColor;
  if (patch.titlePos) state.titlePos = patch.titlePos;
  if (patch.photos) {
    for (let i = 0; i < patch.photos.length; i++) {
      const index = SAMPLES.findIndex((s) => s.name === patch.photos[i]);
      if (index >= 0) {
        await loadSample(index);
        state.slots[i].photo = index;
      }
    }
  }
  state.activePanel = 0;
  buildPanelPick();
  await Promise.all([
    document.fonts.load('100px Anton'),
    document.fonts.load('40px Pacifico'),
    document.fonts.ready,
  ]);
  redraw();
}

buildChoices();
buildSamples();
buildPanelPick();
wireControls();

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), setupShot);
} else {
  Promise.all([loadSample(0), loadSample(1), loadSample(2), loadSample(3)]).then(() => {
    document.fonts.ready.then(redraw);
    redraw();
  });
}
