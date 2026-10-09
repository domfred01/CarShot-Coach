import { bestVehicle } from './coaching.js';
import { enhancePixels, photoStats, postShotTips } from './enhancement.js';

/** @template {HTMLElement} T @param {string} id @returns {T} */
const el = id => /** @type {T} */ (document.getElementById(id));
/** @param {HTMLCanvasElement} canvas @returns {Promise<Blob>} */
const jpeg = canvas => new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Photo export failed')), 'image/jpeg', 0.94));

/** Post-capture only; the live camera and detector do not depend on this module.
 * @param {{analyze: (image: HTMLCanvasElement) => Promise<import('@tensorflow-models/coco-ssd').DetectedObject[]>, onExport: (blob: Blob) => void}} options
 */
export function setupReview({ analyze, onExport }) {
  let version = 0;
  /** @type {Blob | null} */ let original = null;
  /** @type {Blob | null} */ let enhanced = null;
  let choice = 'enhanced';
  function updateChoice() {
    el('view-original').setAttribute('aria-pressed', String(choice === 'original'));
    el('view-enhanced').setAttribute('aria-pressed', String(choice === 'enhanced'));
    const blob = choice === 'enhanced' ? enhanced || original : original;
    if (blob) onExport(blob);
    el('enhancement-view').textContent = choice === 'enhanced' && enhanced ? 'Auto Pop applied · this version will be saved' : 'Original capture · this version will be saved';
  }
  el('view-original').addEventListener('click', () => { choice = 'original'; updateChoice(); });
  el('view-enhanced').addEventListener('click', () => { choice = 'enhanced'; updateChoice(); });
  return {
    cancel() { version++; original = null; enhanced = null; },
    /** @param {HTMLCanvasElement} source @param {string} shot @param {Blob} blob */
    async present(source, shot, blob) {
      const token = ++version;
      original = blob; enhanced = null; choice = 'enhanced';
      el('enhancement-status').textContent = 'Finding a little extra in your shot…';
      el('enhancement-view').textContent = 'Showing original while Auto Pop gets ready';
      /** @type {HTMLButtonElement} */ (el('view-enhanced')).disabled = true;
      el('view-original').setAttribute('aria-pressed', 'false');
      el('view-enhanced').setAttribute('aria-pressed', 'true');
      el('post-tips').replaceChildren();
      try {
        const sample = document.createElement('canvas');
        const scale = Math.min(1, 640 / Math.max(source.width, source.height));
        sample.width = Math.max(1, Math.round(source.width * scale));
        sample.height = Math.max(1, Math.round(source.height * scale));
        const sampleContext = sample.getContext('2d');
        if (!sampleContext) throw new Error('Image analysis unavailable');
        sampleContext.drawImage(source, 0, 0, sample.width, sample.height);
        const stats = photoStats(sampleContext.getImageData(0, 0, sample.width, sample.height).data);
        /** @type {number[] | undefined} */ let box;
        let aiUnavailable = false;
        if (shot !== 'Interior') {
          // Bound the wait; a slow/offline model never prevents saving a photo.
          let timeout = 0;
          try {
            const predictions = await Promise.race([
              analyze(sample),
              new Promise((_, reject) => { timeout = window.setTimeout(() => reject(new Error('AI timed out')), 8000); }),
            ]);
            box = bestVehicle(/** @type {import('@tensorflow-models/coco-ssd').DetectedObject[]} */ (predictions))?.bbox;
          } catch { aiUnavailable = true; }
          finally { clearTimeout(timeout); }
        }
        if (token !== version) return;
        const output = document.createElement('canvas'); output.width = source.width; output.height = source.height;
        const context = output.getContext('2d');
        if (!context) throw new Error('Image processing unavailable');
        context.drawImage(source, 0, 0);
        const pixels = context.getImageData(0, 0, output.width, output.height);
        const fullBox = box?.map(value => value / scale);
        enhancePixels(pixels.data, output.width, output.height, stats, fullBox);
        context.putImageData(pixels, 0, 0);
        const result = await jpeg(output);
        if (token !== version) return;
        enhanced = result;
        el('enhancement-status').textContent = box ? 'AI-assisted Auto Pop · car-aware color & light' : 'Auto Pop · subtle color & light';
        const tips = postShotTips(stats, shot, box, sample.width, sample.height);
        if (aiUnavailable) tips[0] = 'AI framing review is unavailable for this shot. Check the crop and space around the wheels before sharing.';
        for (const tip of tips) { const item = document.createElement('li'); item.textContent = tip; el('post-tips').append(item); }
        /** @type {HTMLButtonElement} */ (el('view-enhanced')).disabled = false;
        updateChoice();
      } catch {
        if (token !== version) return;
        el('enhancement-status').textContent = 'Auto Pop unavailable · your original is ready to save';
        choice = 'original'; updateChoice();
        const item = document.createElement('li'); item.textContent = 'Check focus on the headlights, reflections on the paint, and space around all four corners before sharing.'; el('post-tips').append(item);
      }
    },
  };
}
