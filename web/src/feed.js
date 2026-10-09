import { deletePost, listPosts, savePost } from './feed-store.js';

/** @template {HTMLElement} T @param {string} id @returns {T} */
const el = id => /** @type {T} */ (document.getElementById(id));
const examples = [
  { car: '488. No bad angles.', category: 'Exotics', src: '/examples/front-three-quarter-white-v3.jpg', caption: 'Low camera. Warm light. Let the lines do the talking.' },
  { car: 'The skyline after hours.', category: 'JDM', src: '/examples/rear-three-quarter-v2.jpg', caption: 'Four round lights. An entire culture.' },
  { car: 'Built for the long way home.', category: 'JDM', src: '/examples/side-v3.jpg', caption: 'Bronze wheels and a clean profile. Less is more.' },
];

/** @param {{getPhoto: () => Blob | null, home: () => void}} options */
export function setupFeed({ getPhoto, home }) {
  let category = 'All';
  let renderVersion = 0;
  let composeVersion = 0;
  /** @type {Blob | null} */ let draft = null;
  let draftUrl = '';
  /** @type {string[]} */ let cardUrls = [];
  const form = /** @type {HTMLFormElement} */ (el('post-form'));
  const submit = /** @type {HTMLButtonElement} */ (el('post-submit'));
  const fileInput = /** @type {HTMLInputElement} */ (el('feed-file'));
  /** @param {string} message */
  const status = message => { el('feed-status').textContent = message; };
  /** @param {string} tag @param {string} text */
  const node = (tag, text) => { const item = document.createElement(tag); item.textContent = text; return item; };
  async function render() {
    const token = ++renderVersion;
    /** @type {import('./feed-store.js').LocalPost[]} */ let posts = [];
    try { posts = (await listPosts()).sort((a, b) => b.createdAt - a.createdAt); }
    catch { status('Local storage is unavailable. You can browse inspiration and save photos using Share.'); }
    if (token !== renderVersion) return;
    cardUrls.forEach(url => URL.revokeObjectURL(url)); cardUrls = [];
    const cards = document.createDocumentFragment();
    for (const post of posts.filter(post => category === 'All' || category === 'Yours' || post.category === category)) {
      const article = document.createElement('article'); article.className = 'feed-card own-post';
      const url = URL.createObjectURL(post.photo); cardUrls.push(url);
      const image = document.createElement('img'); image.src = url; image.alt = post.car; image.loading = 'lazy';
      const body = document.createElement('div'); body.className = 'feed-card-body';
      body.append(node('small', `${post.category} / YOUR LOCAL POST`), node('h3', post.car), node('p', post.caption));
      const meta = node('div', `@${post.author} · Saved on this device`); meta.className = 'post-meta';
      const remove = node('button', 'Remove'); remove.className = 'quiet'; remove.setAttribute('aria-label', `Remove local post: ${post.car}`);
      remove.addEventListener('click', async () => {
        /** @type {HTMLButtonElement} */ (remove).disabled = true;
        try { await deletePost(post.id); status('Local post removed.'); await render(); }
        catch { status('Could not remove this post. Please try again.'); /** @type {HTMLButtonElement} */ (remove).disabled = false; }
      });
      body.append(meta, remove); article.append(image, body); cards.append(article);
    }
    if (category !== 'Yours') for (const example of examples.filter(item => category === 'All' || item.category === category)) {
      const article = document.createElement('article'); article.className = 'feed-card';
      const image = document.createElement('img'); image.src = example.src; image.alt = example.car; image.loading = 'lazy';
      const body = document.createElement('div'); body.className = 'feed-card-body';
      body.append(node('small', `${example.category} / INSPIRATION`), node('h3', example.car), node('p', example.caption), node('div', 'CarShot collection · AI-generated example'));
      article.append(image, body); cards.append(article);
    }
    el('feed-cards').replaceChildren(cards);
    el('feed-empty').hidden = category !== 'Yours' || posts.length > 0;
  }
  /** @param {Blob} blob */
  async function compose(blob) {
    const token = ++composeVersion;
    status('');
    // Decode locally and resize before persistence. No upload or image metadata is retained.
    const image = new Image(); const url = URL.createObjectURL(blob);
    try {
      image.src = url; await image.decode();
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d'); if (!context) throw new Error('Image unavailable');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const resized = await new Promise((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('Image unavailable')), 'image/jpeg', 0.88));
      if (token !== composeVersion) return;
      draft = /** @type {Blob} */ (resized);
      if (draftUrl) URL.revokeObjectURL(draftUrl);
      draftUrl = URL.createObjectURL(draft);
      /** @type {HTMLImageElement} */ (el('post-preview')).src = draftUrl;
      form.reset(); home(); el('composer').hidden = false;
      el('composer').scrollIntoView({ behavior: 'smooth', block: 'start' });
      el('post-car').focus({ preventScroll: true });
    } catch { status('This photo could not be opened. Choose a JPEG, PNG or another photo your browser can display.'); }
    finally { URL.revokeObjectURL(url); }
  }
  el('post-photo').addEventListener('click', () => { const photo = getPhoto(); if (photo) void compose(photo); });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0]; fileInput.value = '';
    if (file && file.type.startsWith('image/')) void compose(file);
    else if (file) status('Please choose an image.');
  });
  el('post-cancel').addEventListener('click', () => {
    composeVersion++; draft = null; el('composer').hidden = true;
    if (draftUrl) { URL.revokeObjectURL(draftUrl); draftUrl = ''; }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (!draft || submit.disabled) return;
    const photo = draft;
    const token = composeVersion;
    const data = new FormData(form);
    const car = String(data.get('car') || '').trim().slice(0, 60);
    if (!car) { status('Give your build a name.'); return; }
    submit.disabled = true;
    try {
      const posts = await listPosts();
      if (token !== composeVersion) return;
      if (posts.length >= 30) throw new Error('Your preview holds 30 photos. Remove a local post to make room.');
      const author = String(data.get('author') || 'yourbuild').trim().replace(/^@/, '').slice(0, 24) || 'yourbuild';
      await savePost({ id: crypto.randomUUID(), car, author, caption: String(data.get('caption') || '').trim().slice(0, 240), category: String(data.get('category')), photo, createdAt: Date.now() });
      if (token !== composeVersion) { await render(); return; }
      draft = null; el('composer').hidden = true;
      if (draftUrl) { URL.revokeObjectURL(draftUrl); draftUrl = ''; }
      status('Added to your local preview. Only visible on this device.');
      category = 'Yours'; updateTabs(); await render(); el('meet').scrollIntoView({ behavior: 'smooth' });
    } catch (error) { status(error instanceof Error && error.message.startsWith('Your preview') ? error.message : 'Could not save this post. Storage may be full or disabled. Your photo is still available to save or share.'); }
    finally { submit.disabled = false; }
  });
  function updateTabs() {
    el('feed-tabs').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === category)));
  }
  for (const label of ['All', 'Exotics', 'JDM', 'Yours']) {
    const button = document.createElement('button'); button.textContent = label; button.dataset.category = label;
    button.addEventListener('click', () => { category = label; updateTabs(); void render(); }); el('feed-tabs').append(button);
  }
  updateTabs(); void render();
}
