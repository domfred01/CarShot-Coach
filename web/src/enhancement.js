import { framingAdvice, shotTips } from './coaching.js';

/** @typedef {{mean: number, shadows: number, highlights: number}} PhotoStats */
/** @param {Uint8ClampedArray} pixels @returns {PhotoStats} */
export function photoStats(pixels) {
  let sum = 0, shadows = 0, highlights = 0, count = 0;
  const step = Math.max(1, Math.floor(pixels.length / 4 / 16000)) * 4;
  for (let i = 0; i < pixels.length; i += step) {
    if (!pixels[i + 3]) continue;
    const light = (pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722) / 255;
    sum += light; shadows += Number(light < 0.12); highlights += Number(light > 0.96); count++;
  }
  return { mean: count ? sum / count : 0.5, shadows: count ? shadows / count : 0, highlights: count ? highlights / count : 0 };
}

/** A bounded, non-generative tone adjustment. AI supplies an optional vehicle box.
 * @param {Uint8ClampedArray} pixels @param {number} width @param {number} height
 * @param {PhotoStats} stats @param {number[] | undefined} box
 */
export function enhancePixels(pixels, width, height, stats, box) {
  if (pixels.length !== width * height * 4) throw new Error('Photo dimensions do not match pixel data');
  const lift = Math.max(-0.02, Math.min(0.06, (0.5 - stats.mean) * 0.13 + 0.015));
  const contrast = stats.highlights > 0.08 ? 0.08 : 0.16;
  const feather = box ? Math.max(1, Math.min(box[2], box[3]) * 0.18) : 1;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;
    const light = luminance / 255;
    let weight = 1;
    if (box) {
      const x = (i / 4) % width, y = Math.floor(i / 4 / width);
      const distance = Math.max(box[0] - x, x - box[0] - box[2], box[1] - y, y - box[1] - box[3], 0);
      weight = 0.4 + 0.6 * Math.max(0, 1 - distance / feather);
    }
    // The curve leaves pure black/white intact and gently lifts midtone detail.
    const curve = 4 * light * (1 - light);
    const target = light + weight * curve * (lift + contrast * (light - 0.5));
    const gain = (target * 255 + 1) / (luminance + 1);
    // Prefer vibrance: already vivid paint gets less boost than muted colors.
    const chroma = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    const saturation = 1 + weight * (0.24 - 0.12 * chroma);
    const gray = luminance * gain;
    pixels[i] = gray + (r * gain - gray) * saturation;
    pixels[i + 1] = gray + (g * gain - gray) * saturation;
    pixels[i + 2] = gray + (b * gain - gray) * saturation;
  }
  sharpenDetail(pixels, width, height);
}

/** Thresholded luminance sharpening improves slight softness without inventing detail.
 * Three rolling rows keep additional memory proportional to width, not photo size.
 * @param {Uint8ClampedArray} pixels @param {number} width @param {number} height
 */
export function sharpenDetail(pixels, width, height) {
  if (pixels.length !== width * height * 4) throw new Error('Photo dimensions do not match pixel data');
  if (width < 3 || height < 3) return;
  const rows = [new Float32Array(width), new Float32Array(width), new Float32Array(width)];
  /** @param {Float32Array} row @param {number} y */
  const read = (row, y) => {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      row[x] = pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722;
    }
  };
  read(rows[0], 0); read(rows[1], 1);
  for (let y = 1; y < height - 1; y++) {
    read(rows[2], y + 1);
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      // Ignore transparency boundaries rather than adding dark fringes.
      if (pixels[i + 3] !== 255 || pixels[i - 1] !== 255 || pixels[i + 7] !== 255 || pixels[i - width * 4 + 3] !== 255 || pixels[i + width * 4 + 3] !== 255) continue;
      const blurred = (rows[0][x-1] + 2*rows[0][x] + rows[0][x+1] + 2*rows[1][x-1] + 4*rows[1][x] + 2*rows[1][x+1] + rows[2][x-1] + 2*rows[2][x] + rows[2][x+1]) / 16;
      const detail = rows[1][x] - blurred;
      // Suppress tiny noise, cap halos and leave pure black/white untouched.
      const strength = Math.min(1, Math.max(0, (Math.abs(detail) - 2) / 6));
      const protection = Math.min(1, rows[1][x] / 20, (255 - rows[1][x]) / 20);
      const adjustment = Math.max(-12, Math.min(12, detail * 0.9)) * strength * protection;
      for (let c = 0; c < 3; c++) pixels[i + c] += adjustment;
    }
    const previous = rows.shift();
    if (previous) rows.push(previous);
  }
}

/** @param {PhotoStats} stats @param {string} shot @param {number[] | undefined} box
 * @param {number} width @param {number} height
 */
export function postShotTips(stats, shot, box, width, height) {
  const tips = [];
  if (box) tips.push(framingAdvice(box, width, height).replace('take your shot', 'try another angle'));
  else if (shot !== 'Interior') tips.push('No clear vehicle was recognized in this photo. Keep the full build visible and try a cleaner background.');
  if (stats.highlights > 0.08) tips.push('Bright areas dominate parts of this frame. Try open shade or turn away from harsh reflections to keep paint detail.');
  else if (stats.shadows > 0.45 || stats.mean < 0.25) tips.push('This frame runs dark. Move toward softer light and tap a headlight or body panel to set focus and exposure.');
  else tips.push('The overall light is balanced. For the next frame, watch reflections along the body and leave breathing room around the wheels.');
  tips.push(shotTips[shot] || 'Try a lower camera position and a simple background.');
  return tips;
}
