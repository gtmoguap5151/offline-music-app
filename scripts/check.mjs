import fs from 'node:fs';
import vm from 'node:vm';

const required = ['index.html','manifest.webmanifest','sw.js','icon.svg','README.md'];
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error('Missing required file: ' + file);
}
JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));

const html = fs.readFileSync('index.html','utf8');
if (!html.includes('navigator.serviceWorker.register')) throw new Error('Service worker registration missing');
if (!html.includes("indexedDB.open('sound-sync'")) throw new Error('IndexedDB storage missing');
if (!html.includes('makeDemoWav')) throw new Error('Self-contained demo audio generator missing');
if (!html.includes('readId3')) throw new Error('MP3 metadata organizer missing');
if (!html.includes('webkitdirectory')) throw new Error('Folder import missing');
if (!html.includes('editDelete')) throw new Error('Individual track removal missing');
if (!html.includes("indexedDB.open('sound-sync',3)")) throw new Error('Current database schema missing');
if (!html.includes("createObjectStore('playlists'")) throw new Error('Playlist storage missing');
if (!html.includes('miniPrev') || !html.includes('miniNext') || !html.includes('seek')) throw new Error('Player controls missing');
if (!html.includes('renderPlaylists')) throw new Error('Playlist interface missing');

const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
if (!scripts.length) throw new Error('Inline app script missing');
for (const source of scripts) new vm.Script(source);

const sw=fs.readFileSync('sw.js','utf8');
new vm.Script(sw);
console.log('Sound Sync validation passed');
