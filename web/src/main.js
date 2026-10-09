import './style.css';
import { framingAdvice, shotTips } from './coaching.js';

/** @template {HTMLElement} T @param {string} id @returns {T} */
function el(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element: ${id}`);
  return /** @type {T} */ (node);
}
const video = /** @type {HTMLVideoElement} */ (el('camera'));
const overlay = /** @type {HTMLCanvasElement} */ (el('overlay'));
const shot = /** @type {HTMLSelectElement} */ (el('shot'));
const start = /** @type {HTMLButtonElement} */ (el('start'));
const capture = /** @type {HTMLButtonElement} */ (el('capture'));
/** @type {MediaStream | undefined} */ let stream;
/** @type {import('@tensorflow-models/coco-ssd').ObjectDetection | undefined} */ let model;
/** @type {Promise<import('@tensorflow-models/coco-ssd').ObjectDetection> | undefined} */ let loadingModel;
/** @type {Blob | null} */ let photoBlob = null;
let photoUrl = '';
let session = 0;
let timer = 0;
let active = false;

/** @param {string} message */
function showError(message) { el('error').textContent = message; el('error').hidden = !message; }
function stopCamera() {
  active = false;
  session++;
  clearTimeout(timer);
  stream?.getTracks().forEach(track => track.stop());
  stream = undefined;
  video.srcObject = null;
  capture.disabled = true;
}
async function loadModel() {
  if (!loadingModel) loadingModel = (async () => {
    const tf = await import('@tensorflow/tfjs');
    await tf.ready();
    const coco = await import('@tensorflow-models/coco-ssd');
    return coco.load({ base: 'lite_mobilenet_v2' });
  })().catch(error => { loadingModel = undefined; throw error; });
  return loadingModel;
}

/** @param {number} token */
async function detect(token) {
  if (!active || token !== session || !model) return;
  try {
    if (video.readyState >= 2 && video.videoWidth) {
      const predictions = await model.detect(video, 10, 0.5);
      if (!active || token !== session) return;
      overlay.width = video.videoWidth;
      overlay.height = video.videoHeight;
      const ctx = overlay.getContext('2d');
      ctx?.clearRect(0, 0, overlay.width, overlay.height);
      const car = predictions.filter(p => p.class === 'car' || p.class === 'truck').sort((a, b) => b.score - a.score)[0];
      el('status').textContent = car ? `Vehicle detected · ${Math.round(car.score * 100)}%` : 'Looking for a vehicle';
      el('guidance').textContent = car ? framingAdvice(car.bbox, overlay.width, overlay.height) : 'Keep the whole car in view';
      if (car && ctx) {
        ctx.strokeStyle = '#c5f277';
        ctx.lineWidth = Math.max(3, overlay.width / 240);
        ctx.strokeRect(...car.bbox);
      }
    }
  } catch {
    if (token !== session) return;
    el('status').textContent = 'AI unavailable · manual guidance';
    el('guidance').textContent = 'Use the grid and shot tips below';
    return;
  }
  if (active && token === session) timer = window.setTimeout(() => void detect(token), 600);
}

start.addEventListener('click', async () => {
  showError('');
  stopCamera();
  const token = session;
  start.disabled = true;
  start.textContent = 'Opening camera…';
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access needs HTTPS. Open the deployed site in Safari.');
    const nextStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } });
    if (token !== session) { nextStream.getTracks().forEach(track => track.stop()); return; }
    stream = nextStream;
    video.srcObject = stream;
    el('intro').hidden = true;
    el('studio').hidden = false;
    el('review').hidden = true;
    el('angle').textContent = shot.value;
    el('tip').textContent = shotTips[shot.value];
    await video.play();
    if (token !== session) return;
    active = true;
    capture.disabled = false;
    overlay.getContext('2d')?.clearRect(0, 0, overlay.width, overlay.height);
    el('guidance').textContent = 'Use the grid to find your frame';
    if (shot.value === 'Interior') {
      el('status').textContent = 'Interior · manual guidance';
      return;
    }
    el('status').textContent = 'Loading on-device AI…';
    try {
      model = await loadModel();
      if (token === session) void detect(token);
    } catch {
      if (token === session) el('status').textContent = 'AI could not load · camera still available';
    }
  } catch (error) {
    if (token !== session) return;
    stopCamera();
    el('intro').hidden = false;
    el('studio').hidden = true;
    const name = error instanceof Error ? error.name : '';
    showError(name === 'NotAllowedError' ? 'Camera access was declined. Allow camera access for this site in Safari settings, then try again.' : name === 'NotFoundError' ? 'No camera was found. Open this site on your iPhone.' : error instanceof Error ? error.message : 'The camera could not start. Please try again.');
  } finally {
    start.disabled = false;
    start.textContent = 'Open camera ↗';
  }
});

el('back').addEventListener('click', () => {
  stopCamera();
  el('studio').hidden = true;
  el('review').hidden = true;
  el('intro').hidden = false;
  showError('');
});
capture.addEventListener('click', () => {
  if (!active || video.readyState < 2 || !video.videoWidth) return;
  capture.disabled = true;
  const token = session;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d')?.drawImage(video, 0, 0);
  canvas.toBlob(blob => {
    if (token !== session) return;
    if (!blob) { capture.disabled = false; showError('Could not create a photo. Try again.'); return; }
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoBlob = blob;
    photoUrl = URL.createObjectURL(blob);
    /** @type {HTMLImageElement} */ (el('photo')).src = photoUrl;
    /** @type {HTMLAnchorElement} */ (el('download')).href = photoUrl;
    stopCamera();
    el('studio').hidden = true;
    el('review').hidden = false;
  }, 'image/jpeg', 0.94);
});
el('share').addEventListener('click', async () => {
  if (!photoBlob) return;
  const file = new File([photoBlob], 'carshot.jpg', { type: 'image/jpeg' });
  try {
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'CarShot Coach' });
    else el('download').click();
  } catch (error) {
    if (!(error instanceof Error && error.name === 'AbortError')) showError('Sharing is unavailable. Use Download photo instead.');
  }
});
el('retake').addEventListener('click', () => start.click());
document.addEventListener('visibilitychange', () => {
  if (document.hidden && stream) {
    stopCamera();
    el('studio').hidden = true;
    el('intro').hidden = false;
    showError('Camera paused while the app was in the background. Tap Open camera to resume.');
  }
});
window.addEventListener('pagehide', stopCamera);
