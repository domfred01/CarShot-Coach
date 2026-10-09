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
  const contrast = stats.highlights > 0.08 ? 0.015 : 0.04;
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
    const saturation = 1 + weight * 0.045;
    const gray = luminance * gain;
    pixels[i] = gray + (r * gain - gray) * saturation;
    pixels[i + 1] = gray + (g * gain - gray) * saturation;
    pixels[i + 2] = gray + (b * gain - gray) * saturation;
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
