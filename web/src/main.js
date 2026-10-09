import './style.css';
import './experience.css';
import { bestVehicle, framingAdvice, shotExamples, shotTips } from './coaching.js';
import { applyLook, coverCrop, cssFilter, looks } from './photography.js';
import { setupReview } from './review.js';
import { setupFeed } from './feed.js';

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
let analyzedFrames = 0;
let selectedLook = 'original';
let savedLook = 'original';

for (const [id, look] of Object.entries(looks)) {
  const button = document.createElement('button');
  button.textContent = look.name;
  button.dataset.look = id;
  button.setAttribute('aria-pressed', String(id === selectedLook));
  button.addEventListener('click', () => {
    selectedLook = id;
    video.style.filter = cssFilter(look);
    el('look-mood').textContent = look.mood;
    el('looks').querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.look === id)));
  });
  el('looks').append(button);
}
el('toggle-grid').addEventListener('click', () => {
  const button = el('toggle-grid');
  const enabled = button.getAttribute('aria-pressed') !== 'true';
  button.setAttribute('aria-pressed', String(enabled));
  el('viewfinder').querySelector('.grid')?.toggleAttribute('hidden', !enabled);
});

/** @param {HTMLCanvasElement} canvas @param {number} maxEdge */
function drawCameraFrame(canvas, maxEdge = Infinity) {
  const view = el('viewfinder').getBoundingClientRect();
  const crop = coverCrop(video.videoWidth, video.videoHeight, view.width, view.height);
  const scale = Math.min(1, maxEdge / Math.max(crop.width, crop.height));
  canvas.width = Math.max(1, Math.round(crop.width * scale));
  canvas.height = Math.max(1, Math.round(crop.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Photo processing is unavailable. Please try again.');
  context.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
  return context;
}
// Serialize inference even when a camera session ends while detection is pending.
let inferenceQueue = Promise.resolve();
/** @param {HTMLCanvasElement | HTMLImageElement} source */
function analyze(source) {
  const result = inferenceQueue.then(async () => (await loadModel()).detect(source, 10, 0.5));
  inferenceQueue = result.then(() => {}, () => {});
  return result;
}
const review = setupReview({ analyze, onExport(blob) {
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoBlob = blob; photoUrl = URL.createObjectURL(blob);
  /** @type {HTMLImageElement} */ (el('photo')).src = photoUrl;
  /** @type {HTMLAnchorElement} */ (el('download')).href = photoUrl;
} });
function showHome() {
  review.cancel();
  stopCamera(); el('studio').hidden = true; el('review').hidden = true; el('intro').hidden = false; showError('');
}
setupFeed({ getPhoto: () => photoBlob, home: showHome });
el('review-home').addEventListener('click', showHome);

function updateExample() {
  const example = shotExamples[shot.value];
  for (const id of ['example-thumb', 'example-photo']) {
    const image = /** @type {HTMLImageElement} */ (el(id));
    image.src = example.src;
    image.alt = id === 'example-photo' ? example.alt : '';
  }
  el('example-angle').textContent = shot.value;
  el('example-caption').textContent = `${shotTips[shot.value]} AI-generated reference.`;
}
updateExample();
shot.addEventListener('change', updateExample);

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
  document.body.classList.remove('shooting');
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
      const frame = document.createElement('canvas');
      drawCameraFrame(frame, 640);
      const predictions = await analyze(frame);
      if (!active || token !== session) return;
      overlay.width = frame.width;
      overlay.height = frame.height;
      const ctx = overlay.getContext('2d');
      ctx?.clearRect(0, 0, overlay.width, overlay.height);
      const car = bestVehicle(predictions);
      analyzedFrames++;
      el('status').textContent = car ? `Vehicle detected · ${Math.round(car.score * 100)}%` : `AI scanning · ${analyzedFrames} frames checked · no vehicle yet`;
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
    overlay.getContext('2d')?.clearRect(0, 0, overlay.width, overlay.height);
    el('retry-ai').hidden = false;
    return;
  }
  if (active && token === session) timer = window.setTimeout(() => void detect(token), 600);
}

start.addEventListener('click', async () => {
  review.cancel();
  showError('');
  stopCamera();
  const token = session;
  start.disabled = true;
  start.textContent = 'Opening camera…';
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access needs HTTPS. Open the deployed site in Safari.');
    const nextStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 }, height: { ideal: 1920 },
        aspectRatio: { ideal: window.innerWidth / window.innerHeight },
        frameRate: { ideal: 24, max: 30 },
      },
    });
    if (token !== session) { nextStream.getTracks().forEach(track => track.stop()); return; }
    stream = nextStream;
    video.srcObject = stream;
    el('intro').hidden = true;
    el('studio').hidden = false;
    document.body.classList.add('shooting');
    /** @type {HTMLDetailsElement} */ (el('example')).open = false;
    el('review').hidden = true;
    el('angle').textContent = shot.value;
    el('tip').textContent = shotTips[shot.value];
    updateExample();
    analyzedFrames = 0;
    el('retry-ai').hidden = true;
    await video.play();
    if (token !== session) return;
    active = true;
    capture.disabled = false;
    overlay.getContext('2d')?.clearRect(0, 0, overlay.width, overlay.height);
    el('guidance').textContent = 'Find the lines. Frame your build.';
    if (shot.value === 'Interior') {
      el('status').textContent = 'Interior · manual guidance';
      return;
    }
    void startDetection(token);
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

el('test-ai').addEventListener('click', async () => {
  const button = /** @type {HTMLButtonElement} */ (el('test-ai'));
  button.disabled = true;
  el('ai-check').textContent = 'Loading AI and checking the front 3/4 example…';
  try {
    const image = new Image();
    image.src = shotExamples['Front 3/4'].src;
    await image.decode();
    const vehicle = bestVehicle(await analyze(image));
    el('ai-check').textContent = vehicle
      ? `AI check passed · vehicle detected at ${Math.round(vehicle.score * 100)}%. Open the camera to check live framing.`
      : 'AI ran, but did not recognize the example. Try live detection in good light with the entire car in view.';
  } catch {
    el('ai-check').textContent = 'AI check failed. Check your internet connection and tap Check AI to retry. Camera and manual tips remain available.';
  } finally { button.disabled = false; }
});

async function startDetection(token = session) {
  el('retry-ai').hidden = true;
  el('status').textContent = 'Loading on-device AI…';
  try {
    model = await loadModel();
    if (active && token === session) void detect(token);
  } catch {
    if (active && token === session) {
      el('status').textContent = 'AI could not load · camera still available';
      el('retry-ai').hidden = false;
    }
  }
}
el('retry-ai').addEventListener('click', () => void startDetection());

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
  const lookAtCapture = selectedLook;
  showError('');
  try {
    const context = drawCameraFrame(canvas);
    if (lookAtCapture !== 'original') {
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      applyLook(image.data, looks[lookAtCapture]);
      context.putImageData(image, 0, 0);
    }
  } catch {
    capture.disabled = false;
    showError('Could not process this photo. Try again or select Original.');
    return;
  }
  canvas.toBlob(blob => {
    if (token !== session) return;
    if (!blob) { capture.disabled = false; showError('Could not create a photo. Try again.'); return; }
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoBlob = blob;
    savedLook = lookAtCapture;
    photoUrl = URL.createObjectURL(blob);
    /** @type {HTMLImageElement} */ (el('photo')).src = photoUrl;
    /** @type {HTMLAnchorElement} */ (el('download')).href = photoUrl;
    stopCamera();
    el('studio').hidden = true;
    el('review').hidden = false;
    el('photo-look').textContent = `${shot.value} · ${looks[savedLook].name} · Ready to share with your crew`;
    void review.present(canvas, shot.value, blob);
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
