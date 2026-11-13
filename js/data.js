// Loads the data bundle written by scripts/export_app.py (app/data/). The app reads nothing else.
// Each file is fetched once and kept in memory; the service worker (step 6) adds offline caching.

const cache = new Map();

export async function getJSON(path) {
  if (!cache.has(path)) {
    const request = fetch(`data/${path}`).then((response) => {
      if (!response.ok) throw new Error(`${path}: ${response.status}`);
      return response.json();
    });
    cache.set(path, request);
    request.catch(() => cache.delete(path));
  }
  return cache.get(path);
}

export const manifest = () => getJSON('manifest.json');
export const vocab = () => getJSON('vocab.json');
export const redirects = () => getJSON('redirects.json');

const FOLDERS = {
  PER: 'people', BAT: 'battles', WAR: 'wars', SRC: 'sources',
  POL: 'polities', PLC: 'places', CIV: 'civilisations', WRK: 'works',
};

// Tombstoned IDs point to their replacement, so old links keep working.
export async function resolveId(id) {
  const map = await redirects();
  return map[id] || id;
}

export async function record(id) {
  const folder = FOLDERS[id.slice(0, 3)];
  if (!folder) throw new Error(`Unknown record type: ${id}`);
  return getJSON(`${folder}/${id}.json`);
}
