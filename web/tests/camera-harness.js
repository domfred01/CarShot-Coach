// Development-only integration fixture. Not included in the Vite production entry.
const frame = document.querySelector('#fixture');
const results = document.querySelector('#results');
const run = document.querySelector('#run');
const size = new URLSearchParams(location.search);
if (size.get('landscape') === '1') { frame.style.width = '844px'; frame.style.height = '390px'; }
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (predicate()) return;
    await sleep(100);
  }
  throw new Error('Timed out waiting for camera state');
}
const assert = (condition, message) => { if (!condition) throw new Error(message); results.textContent += `\nPASS ${message}`; };
run.addEventListener('click', async () => {
  run.disabled = true;
  results.textContent = 'Starting synthetic camera…';
  try {
    const html = await (await fetch('/index.html')).text();
    const fixtureScript = `<script type="module">
      // Isolate this synthetic fixture from switching between test tabs.
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      const image = new Image(); image.src = '/examples/interior-v3.jpg'; await image.decode();
      navigator.mediaDevices.getUserMedia = async () => {
        const source = document.createElement('canvas'); source.width = 960; source.height = 720;
        const ctx = source.getContext('2d'); ctx.drawImage(image, 0, 0, 960, 720);
        ctx.fillStyle = '#e84722'; ctx.fillRect(0, 0, 960, 100);
        const stream = source.captureStream(10);
        const repaint = setInterval(() => {
          if (stream.getTracks().every(track => track.readyState === 'ended')) { clearInterval(repaint); return; }
          ctx.fillStyle = '#e84722'; ctx.fillRect(0, 0, 960, 100);
        }, 100);
        return stream;
      };
      await import('/src/main.js');
      document.querySelector('#shot').value = 'Interior';
      document.querySelector('#shot').dispatchEvent(new Event('change'));
      document.body.dataset.fixtureReady = 'true';
    </script>`;
    frame.srcdoc = html.replace('<head>', '<head><base href="/" />')
      .replace(/<script\b[^>]*src="\/@vite\/client"[^>]*><\/script>/, '')
      .replace(/<script\b[^>]*src="\/src\/main\.js[^"\s]*"[^>]*><\/script>/, fixtureScript);
    await until(() => frame.contentDocument?.body.dataset.fixtureReady === 'true');
    const doc = frame.contentDocument;
    const get = id => doc.getElementById(id);
    assert(get('example').closest('#studio') && get('studio').hidden, 'References live only inside the camera studio');
    get('start').click();
    await until(() => !get('capture').disabled);
    const studio = get('studio').getBoundingClientRect();
    assert(studio.x === 0 && studio.y === 0 && studio.width === frame.clientWidth && studio.height === frame.clientHeight, 'Camera fills the mobile viewport');
    assert(!get('example').open, 'Example starts minimized');
    get('example').querySelector('summary').click();
    assert(get('example').open, 'Example expands inside camera');
    get('example').querySelector('summary').click();
    for (const id of ['original', 'midnight', 'golden', 'street', 'silver']) {
      const button = doc.querySelector(`[data-look="${id}"]`);
      button.click();
      assert(button.getAttribute('aria-pressed') === 'true', `${id} filter selects`);
    }
    assert(get('camera').style.filter.includes('saturate(0)'), 'Silver applies to live preview');
    get('toggle-grid').click();
    assert(doc.querySelector('.grid').hidden, 'Grid can be hidden');
    const shutter = get('capture').getBoundingClientRect();
    assert(shutter.top > 0 && shutter.bottom <= studio.height, 'Shutter stays in reach');
    const liveStream = get('camera').srcObject;
    get('capture').click();
    await until(() => !get('review').hidden && get('photo').complete && get('photo').naturalWidth > 0);
    const photo = get('photo');
    assert(Math.abs(photo.naturalWidth / photo.naturalHeight - studio.width / studio.height) < 0.002, 'Saved photo matches the visible crop');
    const sample = doc.createElement('canvas'); sample.width = sample.height = 1;
    const ctx = sample.getContext('2d'); ctx.drawImage(photo, 0, 0, 30, 30, 0, 0, 1, 1);
    const pixel = ctx.getImageData(0, 0, 1, 1).data;
    assert(Math.abs(pixel[0] - pixel[1]) <= 2 && Math.abs(pixel[1] - pixel[2]) <= 2 && pixel[0] > 20, 'Saved JPEG contains monochrome filter, not the original red fixture');
    assert(liveStream.getTracks().every(track => track.readyState === 'ended'), 'Capture stops camera tracks');
    assert(!doc.body.classList.contains('shooting'), 'Review restores normal page scrolling');
    await until(() => !get('view-enhanced').disabled);
    assert(get('post-tips').children.length >= 2, 'Post-shot tips appear');
    const enhancedUrl = get('download').href;
    get('view-original').click();
    assert(get('view-original').getAttribute('aria-pressed') === 'true' && get('download').href !== enhancedUrl, 'Original toggle updates saved version');
    get('view-enhanced').click();
    assert(get('view-enhanced').getAttribute('aria-pressed') === 'true', 'Auto Pop can be restored');
    get('retake').click(); await until(() => !get('capture').disabled);
    get('back').click();
    assert(get('studio').hidden && !get('intro').hidden, 'Back returns to shot selection');
    assert(get('camera').srcObject === null && !doc.body.classList.contains('shooting'), 'Back releases camera and viewport');
    get('start').click(); await until(() => !get('capture').disabled);
    const backgroundStream = get('camera').srcObject;
    Object.defineProperty(doc, 'hidden', { configurable: true, value: true });
    doc.dispatchEvent(new Event('visibilitychange'));
    assert(backgroundStream.getTracks().every(track => track.readyState === 'ended') && get('studio').hidden && !get('intro').hidden, 'Backgrounding pauses camera and restores selection');
    get('post-photo').click();
    await until(() => !get('composer').hidden);
    const name = `Fixture ${crypto.randomUUID()}`;
    get('post-car').value = name;
    get('post-caption').value = '<b>Local test only</b>';
    get('post-submit').click();
    await until(() => get('feed-cards').textContent.includes(name));
    assert(!get('feed-cards').querySelector('b'), 'Captions render as text, never HTML');
    const { listPosts, deletePost } = await import('/src/feed-store.js');
    const stored = (await listPosts()).find(post => post.car === name);
    assert(stored?.photo instanceof Blob && stored.photo.size > 0, 'Local post persists in IndexedDB with its photo');
    if (stored) await deletePost(stored.id);
    delete doc.hidden;
    results.textContent += '\nALL CAMERA CHECKS PASSED';
  } catch (error) { results.textContent += `\nFAIL ${error.message}`; }
  finally { run.disabled = false; }
});
