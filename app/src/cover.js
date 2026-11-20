// Vice Cover Studio's cover engine: multi-panel poster layouts, neon-sunset grades,
// bold Anton lettering with a Pacifico script subtitle, grain and vignette.
// Everything is drawn on a 2D canvas from local photos only; the output is fully
// deterministic (the grain uses a seeded generator, never Math.random or the clock).

/** Post sizes the app exports, in pixels. */
export const SIZES = {
  square: { width: 1080, height: 1080, label: 'Square 1080 × 1080' },
  portrait: { width: 1080, height: 1350, label: 'Portrait 1080 × 1350' },
  wide: { width: 1920, height: 1080, label: 'Wide 1920 × 1080' },
};

/** The five cover layouts. Each returns its panels as fractions of the canvas. */
export const LAYOUTS = {
  hero3: { name: 'Hero + Three', panels: 4 },
  grid4: { name: 'Four Corners', panels: 4 },
  fullbleed: { name: 'Full Bleed', panels: 1 },
  tilted: { name: 'Tilted Snap', panels: 2 },
  nine: { name: 'Nine Panel', panels: 9 },
};

/** The five sunset grades: a dusk gradient, a soft-light wash and a photo filter. */
export const GRADES = {
  sunset: { name: 'Sunset', top: 'rgba(255,122,69,0)', bottom: 'rgba(214,48,120,0.60)', wash: '#ff7a45', washAlpha: 0.28, filter: 'saturate(1.25) contrast(1.05)' },
  neon: { name: 'Neon Night', top: 'rgba(0,229,255,0)', bottom: 'rgba(255,46,160,0.55)', wash: '#19c8e8', washAlpha: 0.30, filter: 'saturate(1.35) contrast(1.08)' },
  vice: { name: 'Vice', top: 'rgba(168,85,247,0)', bottom: 'rgba(236,72,153,0.62)', wash: '#a855f7', washAlpha: 0.30, filter: 'saturate(1.3) contrast(1.05)' },
  noir: { name: 'Noir', top: 'rgba(255,255,255,0)', bottom: 'rgba(10,10,20,0.55)', wash: '#8a8fa8', washAlpha: 0.22, filter: 'grayscale(1) contrast(1.18) brightness(1.04)' },
  golden: { name: 'Golden Hour', top: 'rgba(255,214,64,0)', bottom: 'rgba(255,120,40,0.55)', wash: '#ffb347', washAlpha: 0.30, filter: 'saturate(1.3) contrast(1.04) brightness(1.03)' },
};

/** A tiny seeded generator, so the film grain is identical on every export. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Panels for a layout, as fractions of the canvas: {x, y, w, h, slot, tilt, border}. */
export function layoutPanels(layout, w, h) {
  const g = 0.012; // white gutter between panels, as a fraction of the width
  const gx = g;
  const gy = g * (w / h);
  switch (layout) {
    case 'hero3': {
      const heroW = 0.62 - gx / 2;
      const sideX = 0.62 + gx / 2;
      const sideW = 1 - sideX;
      const ph = (1 - 2 * gy) / 3;
      return [
        { x: 0, y: 0, w: heroW, h: 1, slot: 0 },
        { x: sideX, y: 0, w: sideW, h: ph, slot: 1 },
        { x: sideX, y: ph + gy, w: sideW, h: ph, slot: 2 },
        { x: sideX, y: 2 * (ph + gy), w: sideW, h: ph, slot: 3 },
      ];
    }
    case 'grid4': {
      const cw = (1 - gx) / 2;
      const ch = (1 - gy) / 2;
      return [
        { x: 0, y: 0, w: cw, h: ch, slot: 0 },
        { x: cw + gx, y: 0, w: cw, h: ch, slot: 1 },
        { x: 0, y: ch + gy, w: cw, h: ch, slot: 2 },
        { x: cw + gx, y: ch + gy, w: cw, h: ch, slot: 3 },
      ];
    }
    case 'fullbleed':
      return [{ x: 0, y: 0, w: 1, h: 1, slot: 0 }];
    case 'tilted':
      return [
        { x: 0, y: 0, w: 1, h: 1, slot: 0 },
        { x: 0.44, y: 0.34, w: 0.5, h: 0.58, slot: 1, tilt: -0.07, border: 0.012 },
      ];
    case 'nine': {
      const cw = (1 - 2 * gx) / 3;
      const ch = (1 - 2 * gy) / 3;
      const panels = [];
      let slot = 0;
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          panels.push({
            x: col * (cw + gx), y: row * (ch + gy), w: cw, h: ch,
            slot: row === 1 && col === 1 ? -1 : slot++,
            titleCell: row === 1 && col === 1,
          });
        }
      }
      return panels;
    }
    default:
      return layoutPanels('hero3', w, h);
  }
}

/** Where the title block goes for a layout: {x, y, w, h} fractions, or a title cell. */
export function titleZone(layout, w, h) {
  if (layout === 'tilted') return { x: 0.04, y: 0.05, w: 0.62, h: 0.3 };
  if (layout === 'nine') return { x: 1 / 3 + 0.012, y: 1 / 3 + 0.012 * (w / h), w: 1 / 3 - 0.024, h: 1 / 3 - 0.024 * (w / h), cell: true };
  return { x: 0.04, y: 0.72, w: 0.92, h: 0.24 };
}

/** The draw rectangle that cover-fits `img` into a panel, with zoom and pan. */
export function fitPhoto(img, pw, ph, zoom, dx, dy) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(pw / iw, ph / ih) * zoom;
  const dw = iw * base;
  const dh = ih * base;
  return { x: (pw - dw) / 2 + dx * pw, y: (ph - dh) / 2 + dy * ph, w: dw, h: dh };
}

/** Draws one photo panel: the photo, clipped, then its sunset grade. */
export function drawPanelPhoto(ctx, panel, img, slot, grade) {
  const { x, y, w, h } = panel;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (!img) {
    const empty = ctx.createLinearGradient(x, y, x, y + h);
    empty.addColorStop(0, '#3b2340');
    empty.addColorStop(1, '#160f22');
    ctx.fillStyle = empty;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `${Math.max(14, h * 0.05)}px Anton, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('YOUR PHOTO HERE', x + w / 2, y + h / 2);
    ctx.restore();
    return;
  }
  ctx.filter = grade.filter;
  const r = fitPhoto(img, w, h, slot.zoom, slot.dx, slot.dy);
  ctx.drawImage(img, x + r.x, y + r.y, r.w, r.h);
  ctx.filter = 'none';
  drawGrade(ctx, x, y, w, h, grade);
  ctx.restore();
}

/** A grade over one panel: a dusk gradient rising from the bottom plus a wash. */
export function drawGrade(ctx, x, y, w, h, grade) {
  const tint = ctx.createLinearGradient(x, y + h * 0.3, x, y + h);
  tint.addColorStop(0, grade.top);
  tint.addColorStop(1, grade.bottom);
  ctx.fillStyle = tint;
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = grade.washAlpha;
  ctx.fillStyle = grade.wash;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/** Wraps a caption to at most two lines that fit `maxWidth`. */
export function wrapTitle(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [''];
  for (const word of words) {
    const trial = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${word}` : word;
    if (ctx.measureText(trial).width <= maxWidth || !lines[lines.length - 1]) {
      lines[lines.length - 1] = trial;
    } else if (lines.length < 2) {
      lines.push(word);
    } else {
      lines[1] = `${lines[1]} ${word}`.trim();
    }
  }
  return lines.filter(Boolean);
}

/** The title block: a dark scrim, the Anton title with an outline, Pacifico subtitle. */
export function drawTitleBlock(ctx, zone, title, subtitle, color, position, w, h) {
  const zx = zone.x * w;
  const zy = zone.y * h;
  const zw = zone.w * w;
  const zh = zone.h * h;
  if (!zone.cell) {
    const scrim = ctx.createLinearGradient(0, position === 'top' ? zy : zy + zh, 0, position === 'top' ? zy + zh : zy);
    scrim.addColorStop(0, 'rgba(12,6,22,0)');
    scrim.addColorStop(1, 'rgba(12,6,22,0.78)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, zy, w, zh);
  } else {
    const cell = ctx.createLinearGradient(zx, zy, zx, zy + zh);
    cell.addColorStop(0, '#ff7a45');
    cell.addColorStop(0.55, '#e83e8c');
    cell.addColorStop(1, '#7b2ff7');
    ctx.fillStyle = cell;
    ctx.fillRect(zx, zy, zw, zh);
  }
  const text = title.trim().toUpperCase();
  const sub = subtitle.trim();
  const pad = zw * 0.06;
  const maxW = zw - pad * 2;
  // A title cell is narrow but tall: let the title wrap to two lines at a big size.
  let size = zone.cell
    ? Math.min(zh * 0.26, zw * 0.30)
    : Math.min(zh * 0.42, zw * 0.16);
  ctx.font = `${size}px Anton, sans-serif`;
  let lines = wrapTitle(ctx, text, maxW);
  // wrapTitle can push overflow onto the second line (it appends words to it
  // without a width check), so shrink on the widest line, not just the first:
  // measuring only lines[0] let a long second line spill out of its cell.
  const widestLine = () => Math.max(...lines.map((line) => ctx.measureText(line).width));
  while ((widestLine() > maxW || lines.length > 2) && size > 12) {
    size -= 2;
    ctx.font = `${size}px Anton, sans-serif`;
    lines = wrapTitle(ctx, text, maxW);
  }
  const lineH = size * 1.02;
  const subSize = Math.max(14, size * 0.34);
  const blockH = lines.length * lineH + (sub ? subSize * 1.6 : 0);
  let ty;
  if (zone.cell) ty = zy + (zh - blockH) / 2 + lineH * 0.8;
  else if (position === 'top') ty = zy + pad + lineH * 0.8;
  else ty = zy + zh - pad - (sub ? subSize * 1.6 : 0) - (lines.length - 1) * lineH;
  ctx.textAlign = zone.cell ? 'center' : 'left';
  const tx = zone.cell ? zx + zw / 2 : zx + pad;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, size / 12);
  ctx.strokeStyle = 'rgba(18,8,28,0.92)';
  ctx.fillStyle = color;
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.03;
  for (const line of lines) {
    ctx.strokeText(line, tx, ty);
    ctx.fillText(line, tx, ty);
    ty += lineH;
  }
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  if (sub) {
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = '#ffd23e';
    ctx.strokeStyle = 'rgba(18,8,28,0.85)';
    ctx.lineWidth = Math.max(1.5, subSize / 10);
    const sy = ty + subSize * 0.5;
    ctx.strokeText(sub, tx, sy);
    ctx.fillText(sub, tx, sy);
  }
}

/** Seeded film grain, tiled over the whole cover. */
export function drawGrain(ctx, w, h) {
  const s = 140;
  const noise = document.createElement('canvas');
  noise.width = s;
  noise.height = s;
  const nctx = noise.getContext('2d');
  const data = nctx.createImageData(s, s);
  const rand = mulberry32(20261119);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 110 + Math.floor(rand() * 90);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  nctx.putImageData(data, 0, 0);
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(noise, 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** A soft darkening at the corners, the poster finish. */
export function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Draws the whole cover onto `canvas` at its own size.
 * `state`: { layout, grade, title, subtitle, titleColor, titlePos, grain, vignette, slots }
 * `photos`: an array of images (or null) by photo index.
 * `slots`: per-panel framing { photo, zoom, dx, dy } by slot index.
 */
export function drawCover(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const gutter = Math.max(3, Math.round(w * 0.008));
  ctx.fillStyle = '#f5efe4';
  ctx.fillRect(0, 0, w, h);
  const panels = layoutPanels(state.layout, w, h);
  for (const panel of panels) {
    if (panel.titleCell) continue;
    const px = panel.x * w + (panel.x > 0 ? gutter / 2 : 0);
    const py = panel.y * h + (panel.y > 0 ? gutter / 2 : 0);
    const pw = panel.w * w - (panel.x > 0 ? gutter / 2 : 0) - (panel.x + panel.w < 1 ? gutter / 2 : 0);
    const ph = panel.h * h - (panel.y > 0 ? gutter / 2 : 0) - (panel.y + panel.h < 1 ? gutter / 2 : 0);
    const slot = state.slots[panel.slot] || { photo: panel.slot, zoom: 1, dx: 0, dy: 0 };
    const img = photos[slot.photo] ?? null;
    if (panel.tilt) {
      ctx.save();
      ctx.translate(px + pw / 2, py + ph / 2);
      ctx.rotate(panel.tilt);
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = pw * 0.04;
      ctx.shadowOffsetY = pw * 0.02;
      const bw = pw + gutter * 2;
      const bh = ph + gutter * 2;
      ctx.fillStyle = '#f5efe4';
      ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
      ctx.restore();
      ctx.save();
      ctx.translate(px + pw / 2, py + ph / 2);
      ctx.rotate(panel.tilt);
      ctx.beginPath();
      ctx.rect(-pw / 2, -ph / 2, pw, ph);
      ctx.clip();
      if (img) {
        ctx.filter = grade.filter;
        const r = fitPhoto(img, pw, ph, slot.zoom, slot.dx, slot.dy);
        ctx.drawImage(img, -pw / 2 + r.x, -ph / 2 + r.y, r.w, r.h);
        ctx.filter = 'none';
        drawGrade(ctx, -pw / 2, -ph / 2, pw, ph, grade);
      }
      ctx.restore();
    } else {
      drawPanelPhoto(ctx, { x: px, y: py, w: pw, h: ph }, img, slot, grade);
    }
  }
  const zone = titleZone(state.layout, w, h);
  drawTitleBlock(ctx, zone, state.title, state.subtitle, state.titleColor, state.titlePos, w, h);
  if (state.grain) drawGrain(ctx, w, h);
  if (state.vignette) drawVignette(ctx, w, h);
}
