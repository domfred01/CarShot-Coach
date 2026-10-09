/** @typedef {{name: string, mood: string, brightness: number, contrast: number, saturation: number, sepia: number}} Look */
/** @type {Record<string, Look>} */
export const looks = {
  original: { name: 'Original', mood: 'True paint, clean detail', brightness: 1, contrast: 1, saturation: 1, sepia: 0 },
  midnight: { name: 'Midnight', mood: 'Deep shadows · city nights', brightness: 0.85, contrast: 1.16, saturation: 0.75, sepia: 0 },
  golden: { name: 'Golden', mood: 'Warm tones · sunset runs', brightness: 1.04, contrast: 1.06, saturation: 1.1, sepia: 0.24 },
  street: { name: 'Street', mood: 'Punchy color · meet energy', brightness: 0.98, contrast: 1.2, saturation: 1.2, sepia: 0 },
  silver: { name: 'Silver', mood: 'Black & white · body lines', brightness: 1, contrast: 1.15, saturation: 0, sepia: 0 },
};

/** @param {Look} look */
export function cssFilter(look) {
  return `brightness(${look.brightness}) contrast(${look.contrast}) saturate(${look.saturation}) sepia(${look.sepia})`;
}

/** Center crop shared by the object-fit: cover preview, AI and exported photo.
 * @param {number} sourceWidth @param {number} sourceHeight
 * @param {number} viewWidth @param {number} viewHeight
 */
export function coverCrop(sourceWidth, sourceHeight, viewWidth, viewHeight) {
  const scale = Math.max(viewWidth / sourceWidth, viewHeight / sourceHeight);
  const width = viewWidth / scale;
  const height = viewHeight / scale;
  return { x: (sourceWidth - width) / 2, y: (sourceHeight - height) / 2, width, height };
}

/** Apply the preview's color transforms on export, including Safari without canvas.filter.
 * Alpha is preserved. No image data leaves the device.
 * @param {Uint8ClampedArray} pixels @param {Look} look
 */
export function applyLook(pixels, look) {
  if (look === looks.original) return;
  const { brightness, contrast, saturation, sepia } = look;
  const clamp = (/** @type {number} */ value) => Math.max(0, Math.min(255, value));
  for (let i = 0; i < pixels.length; i += 4) {
    let r = clamp((clamp(pixels[i] * brightness) - 127.5) * contrast + 127.5);
    let g = clamp((clamp(pixels[i + 1] * brightness) - 127.5) * contrast + 127.5);
    let b = clamp((clamp(pixels[i + 2] * brightness) - 127.5) * contrast + 127.5);
    // CSS saturate uses the luminance coefficients 0.213, 0.715, 0.072.
    const gray = r * 0.213 + g * 0.715 + b * 0.072;
    r = clamp(gray + (r - gray) * saturation);
    g = clamp(gray + (g - gray) * saturation);
    b = clamp(gray + (b - gray) * saturation);
    pixels[i] = r * (1 - sepia) + (r * 0.393 + g * 0.769 + b * 0.189) * sepia;
    pixels[i + 1] = g * (1 - sepia) + (r * 0.349 + g * 0.686 + b * 0.168) * sepia;
    pixels[i + 2] = b * (1 - sepia) + (r * 0.272 + g * 0.534 + b * 0.131) * sepia;
  }
}
