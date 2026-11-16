/* Private client galleries.
   Everything a visitor downloads is AES-256-GCM ciphertext; the key is derived
   here from the password (PBKDF2-SHA256), so photos only exist decrypted on the
   client's own device. Format: each blob is iv(12) || ciphertext+tag. */
(() => {
const $ = id => document.getElementById(id);
const SITE = window.GALLERY_SITE || '/';
const slug = decodeURIComponent(location.hash.slice(1)).replace(/[^a-z0-9-]/gi, '');
let BASE = '', key = null, meta = null, files = [], thumbs = {}, fulls = {}, current = -1;

// Site links: in Rig's preview they point at the local copy of the site.
document.querySelectorAll('[data-site]').forEach(a => { a.href = SITE + a.dataset.site; });

const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const fmtDate = iso => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

function show(id) {
  ['gate', 'message', 'gallery'].forEach(s => { $(s).hidden = s !== id; });
}

function message(kicker, title, body) {
  $('msgKicker').textContent = kicker;
  $('msgTitle').textContent = title;
  $('msgBody').textContent = body;
  show('message');
  loadMore();
}

async function deriveKey(password) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: meta.kdf.hash, iterations: meta.kdf.iter, salt: b64(meta.kdf.salt) },
    base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
}

async function decrypt(buf) {
  const u = new Uint8Array(buf);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, key, u.slice(12));
}

async function fetchBlob(path) {
  const r = await fetch(`${BASE}/g/${slug}/${path}`);
  if (!r.ok) throw new Error('fetch ' + r.status);
  return decrypt(await r.arrayBuffer());
}

const isExpired = () => meta.expired || (meta.expires && new Date(meta.expires) <= new Date());

// ── Boot ────────────────────────────────────────────────────────────────
async function boot() {
  if (!slug) return message('Private gallery', 'Looking for your photos?', 'Open the link you were sent; it takes you straight to your gallery.');
  if (!window.crypto || !crypto.subtle) return message('Private gallery', 'This browser can’t open it', 'Try a current version of Safari, Chrome, Edge or Firefox.');
  try {
    BASE = window.GALLERY_BASE || (await fetch('config.json', { cache: 'no-cache' }).then(r => r.json())).base || '';
    const r = await fetch(`${BASE}/g/${slug}/meta.json`, { cache: 'no-cache' });
    if (!r.ok) throw new Error('missing');
    meta = await r.json();
  } catch (e) {
    return message('Private gallery', 'This gallery isn’t here', 'It may have been taken down, or the link is incomplete. Get in touch and I’ll send a fresh one.');
  }
  document.title = `${meta.client} — Marshall`;
  if (isExpired()) {
    return message(meta.client, 'This gallery has expired', `It was available until ${fmtDate(meta.expires)}. Get in touch if you need the photos again — I can reopen it.`);
  }
  $('gateClient').textContent = meta.client;
  const bits = ['From Ash Marshall'];
  if (meta.count) bits.push(plural(meta.count, 'photo'));
  if (meta.expires) bits.push('Until ' + fmtDate(meta.expires));
  $('gateMeta').textContent = bits.join('  ·  ');
  show('gate');

  let saved = '';
  try { saved = sessionStorage.getItem('g:' + slug) || ''; } catch (e) { /* private mode */ }
  if (saved) { $('pw').value = saved; unlock(saved, true); } else { $('pw').focus({ preventScroll: true }); }
}

async function unlock(password, quiet) {
  const btn = $('gateBtn');
  btn.disabled = true; btn.textContent = 'Opening…'; $('gateError').textContent = '';
  try {
    key = await deriveKey(password);
    const manifest = JSON.parse(new TextDecoder().decode(await decrypt(b64(meta.manifest))));
    try { sessionStorage.setItem('g:' + slug, password); } catch (e) { /* fine */ }
    files = manifest.files || [];
    renderGallery(manifest);
  } catch (e) {
    key = null;
    if (!quiet) {
      $('gateError').textContent = 'That password doesn’t match. Check for typos.';
      const f = $('gateForm'); f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
    }
    try { sessionStorage.removeItem('g:' + slug); } catch (err) { /* fine */ }
    btn.disabled = false; btn.textContent = 'Open';
  }
}

$('gateForm').addEventListener('submit', e => {
  e.preventDefault();
  const pw = $('pw').value.trim();
  if (pw) unlock(pw);
});

// ── Gallery ─────────────────────────────────────────────────────────────
function renderGallery(manifest) {
  $('galTitle').textContent = meta.client;
  $('galCount').textContent = plural(files.length, 'photo');
  $('galNote').textContent = manifest.note || '';
  $('galExpiry').textContent = meta.expires ? 'Available until ' + fmtDate(meta.expires) : '';
  const grid = $('grid');
  grid.innerHTML = '';
  const tiles = files.map((f, i) => {
    const tile = document.createElement('figure');
    tile.className = 'g-tile';
    tile.tabIndex = 0;
    tile.style.aspectRatio = `${f.w} / ${f.h}`;
    tile.innerHTML = `<img alt=""><figcaption class="g-tile-bar"><span class="g-cap"></span><button class="g-tile-dl" type="button">Download</button></figcaption>`;
    tile.querySelector('.g-cap').textContent = f.name;
    tile.querySelector('img').alt = f.name;
    tile.addEventListener('click', e => { if (!e.target.closest('.g-tile-dl')) openLb(i); });
    tile.addEventListener('keydown', e => { if (e.key === 'Enter') openLb(i); });
    tile.querySelector('.g-tile-dl').addEventListener('click', e => downloadOne(i, e.currentTarget));
    grid.appendChild(tile);
    setTimeout(() => tile.classList.add('in'), 40 * Math.min(i, 12));
    return tile;
  });
  show('gallery');
  if (files.length < 2) $('dlAll').hidden = true;
  loadMore();

  // Thumbnails, a few at a time, in order.
  let next = 0;
  const worker = async () => {
    while (next < files.length) {
      const i = next++;
      try {
        const url = URL.createObjectURL(new Blob([await fetchBlob(`t/${files[i].id}.bin`)], { type: 'image/jpeg' }));
        thumbs[i] = url;
        const img = tiles[i].querySelector('img');
        img.onload = () => { img.classList.add('ready'); tiles[i].style.aspectRatio = ''; };
        img.src = url;
      } catch (e) { /* leave the placeholder */ }
    }
  };
  for (let w = 0; w < 6; w++) worker();
}

async function getFull(i) {
  if (!fulls[i]) fulls[i] = fetchBlob(`f/${files[i].id}.bin`);
  try { return await fulls[i]; } catch (e) { delete fulls[i]; throw e; }
}

function save(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function downloadOne(i, btn) {
  const label = btn.textContent;
  btn.disabled = true; btn.textContent = 'Preparing…';
  try {
    save(new Blob([await getFull(i)], { type: files[i].type }), files[i].name);
    btn.textContent = 'Saved';
  } catch (e) { btn.textContent = 'Try again'; }
  setTimeout(() => { btn.disabled = false; btn.textContent = label; }, 1800);
}

// ── Zip (stored, no compression: photos are already compressed) ─────────
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(u) { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

function makeZip(entries) {
  const enc = new TextEncoder(), parts = [], central = [];
  const now = new Date();
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  let offset = 0;
  for (const { name, data } of entries) {
    const n = enc.encode(name), crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);
    h.setUint16(8, 0, true); h.setUint16(10, time, true); h.setUint16(12, date, true);
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
    h.setUint16(26, n.length, true); h.setUint16(28, 0, true);
    parts.push(h, n, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true); c.setUint16(12, time, true); c.setUint16(14, date, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
    c.setUint16(28, n.length, true); c.setUint32(42, offset, true);
    central.push(c, n);
    offset += 30 + n.length + data.length;
  }
  const size = central.reduce((s, p) => s + p.byteLength, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true);
  end.setUint32(12, size, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end], { type: 'application/zip' });
}

$('dlAll').addEventListener('click', async () => {
  const btn = $('dlAll');
  btn.disabled = true;
  try {
    const entries = [];
    for (let i = 0; i < files.length; i++) {
      btn.textContent = `Preparing ${i + 1} of ${files.length}`;
      entries.push({ name: files[i].name, data: new Uint8Array(await getFull(i)) });
      delete fulls[i]; // don't keep two copies of everything in memory
    }
    btn.textContent = 'Zipping…';
    const name = meta.client.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'photos';
    save(makeZip(entries), `${name}-Marshall.zip`);
    btn.textContent = 'Downloaded';
  } catch (e) {
    btn.textContent = 'Something went wrong — try again';
  }
  setTimeout(() => { btn.disabled = false; btn.textContent = 'Download all'; }, 2500);
});

// ── Lightbox ────────────────────────────────────────────────────────────
const VIEWABLE = /^image\/(jpeg|png|webp)$/;
async function openLb(i) {
  current = (i + files.length) % files.length;
  const f = files[current], img = $('lbImg');
  $('lb').hidden = false;
  document.body.style.overflow = 'hidden';
  $('lbName').textContent = `${current + 1} / ${files.length}  ·  ${f.name}`;
  img.src = thumbs[current] || '';
  if (!VIEWABLE.test(f.type)) return;
  const want = current;
  try {
    const url = URL.createObjectURL(new Blob([await getFull(want)], { type: f.type }));
    if (current === want && !$('lb').hidden) img.src = url;
    else URL.revokeObjectURL(url);
  } catch (e) { /* the thumbnail stays */ }
}
function closeLb() { $('lb').hidden = true; document.body.style.overflow = ''; $('lbImg').removeAttribute('src'); }
$('lbClose').onclick = closeLb;
$('lbPrev').onclick = () => openLb(current - 1);
$('lbNext').onclick = () => openLb(current + 1);
$('lbDl').onclick = e => downloadOne(current, e.currentTarget);
$('lb').addEventListener('click', e => { if (e.target.id === 'lb') closeLb(); });
document.addEventListener('keydown', e => {
  if ($('lb').hidden) return;
  if (e.key === 'Escape') closeLb();
  if (e.key === 'ArrowLeft') openLb(current - 1);
  if (e.key === 'ArrowRight') openLb(current + 1);
});
let touchX = null;
$('lb').addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
$('lb').addEventListener('touchend', e => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 50) openLb(current + (dx < 0 ? 1 : -1));
  touchX = null;
});

// ── More from Marshall ──────────────────────────────────────────────────
let moreLoaded = false;
async function loadMore() {
  if (moreLoaded) return;
  moreLoaded = true;
  try {
    const d = await fetch(SITE + 'data/videos.json').then(r => r.json());
    // Skip working titles that are really file names (all caps with digits).
    const picks = (d.videos || []).filter(v => v.youtubeId && v.title && !/^[A-Z0-9 _\-]+$/.test(v.title)).slice(0, 3);
    if (!picks.length) return;
    const row = $('moreRow');
    picks.forEach(v => {
      const a = document.createElement('a');
      a.className = 'g-work';
      a.href = SITE + '#work';
      a.innerHTML = `<div class="g-work-thumb"><img loading="lazy" alt=""></div><div class="g-work-title"></div>`;
      a.querySelector('img').src = `https://i.ytimg.com/vi/${encodeURIComponent(v.youtubeId)}/hqdefault.jpg`;
      a.querySelector('.g-work-title').textContent = v.title;
      row.appendChild(a);
    });
    $('more').hidden = false;
  } catch (e) { /* the footer still links back */ }
}

window.addEventListener('hashchange', () => location.reload());
boot();
})();
