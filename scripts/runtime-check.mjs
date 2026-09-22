import fs from 'node:fs';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';

class ClassList {
  values = new Set();
  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
  toggle(value, force) {
    const next = force ?? !this.values.has(value);
    next ? this.values.add(value) : this.values.delete(value);
    return next;
  }
}

class Element {
  constructor(dataset = {}) {
    this.dataset = dataset;
    this.classList = new ClassList();
    this.style = {};
    this.value = '';
    this.textContent = '';
    this.innerHTML = '';
    this.hidden = false;
    this.paused = true;
    this.currentTime = 0;
    this.duration = 60;
  }
  setAttribute() {}
  removeAttribute(name) { if (name === 'src') this.src = ''; }
  load() {}
  showModal() { this.open = true; }
  close() { this.open = false; }
  play() { this.paused = false; this.onplay?.(); return Promise.resolve(); }
  pause() { this.paused = true; this.onpause?.(); }
}

const databases = new Map();
function requestWith(action) {
  const request = {};
  setTimeout(() => {
    try { request.result = action(); request.onsuccess?.({ target: request }); }
    catch (error) { request.error = error; request.onerror?.({ target: request }); }
  }, 0);
  return request;
}
function openDatabase(name) {
  const request = {};
  setTimeout(() => {
    let database = databases.get(name);
    if (!database) {
      const stores = new Map();
      database = {
        objectStoreNames: { contains: store => stores.has(store) },
        createObjectStore: store => stores.set(store, new Map()),
        transaction: store => ({ objectStore: () => ({
          getAll: () => requestWith(() => [...stores.get(store).values()]),
          get: key => requestWith(() => stores.get(store).get(key)),
          put: value => requestWith(() => stores.get(store).set(value.id, value)),
          delete: key => requestWith(() => stores.get(store).delete(key))
        }) })
      };
      databases.set(name, database);
      request.result = database;
      request.onupgradeneeded?.({ target: request });
    }
    request.result = database;
    request.onsuccess?.({ target: request });
  }, 0);
  return request;
}

const elements = new Map();
const element = selector => {
  if (!elements.has(selector)) elements.set(selector, new Element());
  return elements.get(selector);
};
const nav = ['search', 'library', 'playlists', 'downloads', 'settings'].map(name => new Element({ nav: name }));
const views = nav.map(item => new Element({ view: item.dataset.nav }));
element('#audio').src = '';
element('#sort').value = 'newest';

const html = fs.readFileSync('index.html', 'utf8');
const source = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0]?.[1];
if (!source) throw new Error('App script missing');

const context = {
  console,
  Blob,
  URL,
  TextDecoder,
  Uint8Array,
  ArrayBuffer,
  DataView,
  Object,
  String,
  Number,
  Math,
  Promise,
  setTimeout,
  clearTimeout,
  encodeURIComponent,
  confirm: () => true,
  crypto: { randomUUID },
  indexedDB: { open: openDatabase },
  location: { hash: '' },
  MediaMetadata: class { constructor(value) { Object.assign(this, value); } },
  navigator: {
    serviceWorker: { register: () => Promise.resolve() },
    storage: { estimate: async () => ({ quota: 1_000_000_000 }), persist: async () => true }
  },
  window: { addEventListener() {} },
  document: {
    querySelector: element,
    querySelectorAll(selector) {
      if (selector === '[data-nav]') return nav;
      if (selector === '.view') return views;
      return [];
    }
  }
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(source + '\n;globalThis.__soundSyncTest={put,putPlaylist,createPlaylist,renderPlaylists,playTrack,nextTrack,metadataForFile};', context);
await new Promise(resolve => setTimeout(resolve, 30));
const app = context.__soundSyncTest;

if (!element('#results').innerHTML.includes('Midnight Drive')) throw new Error('Catalog did not render');
if (!element('#playlists').innerHTML.includes('Create a playlist')) throw new Error('Playlist empty state did not render');

const first = { id: 't1', title: 'First', artist: 'Artist', album: 'Album', art: 'FA', blob: new Blob(['a']), downloadedAt: 1 };
const second = { id: 't2', title: 'Second', artist: 'Artist', album: 'Album', art: 'SA', blob: new Blob(['b']), downloadedAt: 2 };
await app.put(first);
await app.put(second);
const playlist = await app.createPlaylist('Road Trip');
playlist.trackIds = ['t1', 't2'];
await app.putPlaylist(playlist);
await app.renderPlaylists();
if (!element('#playlists').innerHTML.includes('Road Trip')) throw new Error('Playlist did not render');

await app.playTrack('t1', ['t1', 't2']);
await app.nextTrack();
if (element('#miniTitle').textContent !== 'Second') throw new Error('Next-track queue failed');
if (element('#mini').hidden) throw new Error('Player did not open');

function id3Frame(id, text) {
  const body = Buffer.concat([Buffer.from([3]), Buffer.from(text)]);
  const header = Buffer.alloc(10);
  header.write(id, 0);
  header.writeUInt32BE(body.length, 4);
  return Buffer.concat([header, body]);
}
const frames = Buffer.concat([id3Frame('TIT2', 'Tagged Song'), id3Frame('TPE1', 'Tagged Artist'), id3Frame('TALB', 'Tagged Album')]);
const header = Buffer.alloc(10);
header.write('ID3', 0);
header[3] = 3;
header[9] = frames.length & 127;
header[8] = (frames.length >> 7) & 127;
header[7] = (frames.length >> 14) & 127;
header[6] = (frames.length >> 21) & 127;
const taggedFile = new Blob([header, frames], { type: 'audio/mpeg' });
taggedFile.name = 'Wrong Name.mp3';
taggedFile.webkitRelativePath = '';
const metadata = await app.metadataForFile(taggedFile);
if (metadata.title !== 'Tagged Song' || metadata.artist !== 'Tagged Artist' || metadata.album !== 'Tagged Album') throw new Error('MP3 tag parsing failed');

console.log('Sound Sync runtime validation passed');
