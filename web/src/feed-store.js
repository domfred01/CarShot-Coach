/** @typedef {{id: string, car: string, author: string, caption: string, category: string, photo: Blob, createdAt: number}} LocalPost */
/** @returns {Promise<IDBDatabase>} */
function openFeed() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('carshot-local-feed', 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('posts', { keyPath: 'id' }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other CarShot tabs and try again.'));
  });
}
/** @param {'readonly' | 'readwrite'} mode @param {(store: IDBObjectStore) => IDBRequest} action */
async function transaction(mode, action) {
  const db = await openFeed();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('posts', mode);
      const request = action(tx.objectStore('posts'));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error || request.error);
      tx.onabort = () => reject(tx.error || new Error('Local storage is unavailable'));
    });
  } finally { db.close(); }
}
/** @returns {Promise<LocalPost[]>} */
export async function listPosts() { return /** @type {LocalPost[]} */ (await transaction('readonly', store => store.getAll())); }
/** @param {LocalPost} post */
export async function savePost(post) { await transaction('readwrite', store => store.put(post)); }
/** @param {string} id */
export async function deletePost(id) { await transaction('readwrite', store => store.delete(id)); }
