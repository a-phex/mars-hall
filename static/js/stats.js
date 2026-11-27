/* Visitor stats for mars-hall.uk.
 *
 * Reports to a small collector hosted by Picture Lock (lock.mars-hall.uk);
 * Ash reads the results in Rig → Website → Visitors.
 *
 * Cookieless: nothing is stored in the visitor's browser, a visit is one page
 * load, and every number sent is a running total for that visit (the server
 * keeps the max), so a beacon that arrives twice changes nothing.
 *
 * Only runs on the live site. Opening the site with ?notrack=1 marks this
 * browser as Ash's own and switches stats off for it (?notrack=0 undoes it).
 */
(() => {
  'use strict';
  const ENDPOINT = 'https://lock.mars-hall.uk/api/site/collect';
  const LIVE = /(^|\.)mars-hall\.uk$|^a-phex\.github\.io$/;
  const q = new URLSearchParams(location.search);
  const TEST = q.has('statstest');            // local testing: payloads go to window.__mhStats

  let store = null;
  try { store = window.localStorage; } catch (e) { /* blocked storage */ }
  try {
    if (q.get('notrack') === '1') store && store.setItem('mh-notrack', '1');
    if (q.get('notrack') === '0') store && store.removeItem('mh-notrack');
  } catch (e) { /* ignore */ }
  if (q.has('notrack')) {
    q.delete('notrack');
    const qs = q.toString();
    try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash); } catch (e) { /* ignore */ }
  }
  let mine = false;
  try { mine = !!store && store.getItem('mh-notrack') === '1'; } catch (e) { /* ignore */ }

  if (!TEST && (!LIVE.test(location.hostname) || mine || navigator.webdriver ||
                navigator.globalPrivacyControl === true)) return;

  const rand = new Uint8Array(16);
  crypto.getRandomValues(rand);
  const visit = Array.from(rand, b => b.toString(16).padStart(2, '0')).join('');
  const t0 = Date.now();
  const since = () => Date.now() - t0;
  const MAX_MS = 6 * 3600 * 1000;
  const isGallery = location.pathname.startsWith('/c') && /\/c\/?(index\.html)?$/.test(location.pathname);

  // ── State ────────────────────────────────────────────────────────────────
  let active = 0, scroll = 0, lastInput = Date.now(), dirty = true, evN = 0;
  const sec = {};          // section id -> {f: first ms, s: seconds}
  const films = {};        // film id -> {k, at, s, f, d, p, c}
  let pending = [];        // events not yet sent

  const clean = (s, n = 80) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
  const push = (k, l, s, h) => { pending.push({ n: evN++, at: since(), k, l: clean(l, 120), s: s || '', h: h || '' }); dirty = true; };

  // ── Sending ──────────────────────────────────────────────────────────────
  let started = false;
  function send() {
    if (since() > MAX_MS || (!dirty && started)) return;
    const snap = {};
    for (const [k, f] of Object.entries(films)) snap[k] = { k: f.k, at: f.at, s: f.s, f: f.f, d: f.d, p: f.p, c: f.c };
    const body = { v: visit, active, scroll, sec, films: snap, ev: pending.slice(0, 60) };
    if (!started) {
      const utm = {};
      ['source', 'medium', 'campaign'].forEach(k => { const v = q.get('utm_' + k); if (v) utm[k] = v.slice(0, 80); });
      body.start = {
        path: location.pathname + (isGallery ? location.hash : ''),
        ref: document.referrer || '', utm,
        sw: window.screen ? screen.width : 0,
        lang: navigator.language || '',
        tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || '')
      };
    }
    const json = JSON.stringify(body);
    let ok = false;
    if (TEST) { (window.__mhStats = window.__mhStats || []).push(JSON.parse(json)); ok = true; }
    else {
      try { ok = navigator.sendBeacon(ENDPOINT, new Blob([json], { type: 'text/plain' })); } catch (e) { ok = false; }
      if (!ok) {
        try { fetch(ENDPOINT, { method: 'POST', body: json, mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain' } }); ok = true; } catch (e) { /* offline */ }
      }
    }
    if (ok) { started = true; pending = pending.slice(60); dirty = pending.length > 0; }
  }

  // ── Time on page, sections, scroll ───────────────────────────────────────
  const sections = () => Array.from(document.querySelectorAll('section[id], footer'));
  function currentSection() {
    const mid = innerHeight * 0.5;
    for (const el of sections()) {
      const r = el.getBoundingClientRect();
      if (r.height > 0 && r.top <= mid && r.bottom > mid) return el.id || el.tagName.toLowerCase();
    }
    return '';
  }
  const anyPlaying = () => Object.values(films).some(f => f._playing);
  setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    if (Date.now() - lastInput > 90000 && !anyPlaying()) return;   // walked away
    active += 1000; dirty = true;
    const id = currentSection();
    if (id) {
      const s = sec[id] || (sec[id] = { f: since(), s: 0 });
      s.s += 1;
    }
  }, 1000);
  function onScroll() {
    const h = document.documentElement.scrollHeight;
    if (h > 0) {
      const p = Math.min(100, Math.round((scrollY + innerHeight) / h * 100));
      if (p > scroll) { scroll = p; dirty = true; }
    }
  }
  ['scroll', 'pointerdown', 'keydown', 'touchstart', 'mousemove', 'wheel'].forEach(t =>
    addEventListener(t, () => { lastInput = Date.now(); if (t === 'scroll') onScroll(); }, { passive: true, capture: true }));

  // ── Clicks ───────────────────────────────────────────────────────────────
  const SKIP = '.lightbox-arrow, .lightbox-close, .modal-close, .nav-toggle, [data-close]';
  const PLATFORM = [[/linkedin\.com$/, 'LinkedIn'], [/(youtube\.com|youtu\.be)$/, 'YouTube'],
    [/instagram\.com$/, 'Instagram'], [/vimeo\.com$/, 'Vimeo'], [/(twitter|x)\.com$/, 'X'],
    [/facebook\.com$/, 'Facebook'], [/tiktok\.com$/, 'TikTok']];
  function labelOf(el) {
    const img = el.querySelector && el.querySelector('img[alt]');
    return clean(el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText || (img && img.alt) || '');
  }
  document.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('a[href], button, [role=button], .archive-row, figure, [data-idx]');
    if (!el || el.closest(SKIP)) return;
    const box = el.closest('section[id], footer, header, nav, .modal, .lightbox');
    const where = box ? (box.id || box.classList[0] || box.tagName.toLowerCase()) : '';
    if (el.tagName === 'A' && el.hasAttribute('download')) {
      const film = el.closest('.g-film');
      const t = film && film.querySelector('.g-film-title');
      return push('click', 'Download' + (t ? ': ' + t.textContent : ''), where);
    }
    if (el.tagName === 'A') {
      const raw = el.getAttribute('href') || '';
      if (raw.startsWith('#')) return push('nav', labelOf(el) || raw, where, raw);
      let url;
      try { url = new URL(el.href, location.href); } catch (err) { return; }
      if (url.protocol === 'mailto:') return push('link', 'Email', where, 'mailto:' + url.pathname);
      if (url.protocol === 'tel:') return push('link', 'Phone', where, 'tel:');
      if (url.origin !== location.origin) {
        const host = url.hostname.replace(/^www\./, '');
        const hit = PLATFORM.find(([re]) => re.test(host));
        return push('link', hit ? hit[1] : host, where, url.origin + url.pathname);
      }
      return push('click', labelOf(el), where, url.pathname);
    }
    if (/-more-btn$/.test(el.id || '')) return push('more', 'View more', where);
    const tile = el.matches('[data-idx], figure, .archive-row, [class*="tile"]');
    push(tile ? 'open' : 'click', labelOf(el), where);
  }, true);

  // Galleries: note when the password works (the page retitles itself).
  if (isGallery) {
    const t = document.querySelector('title');
    const first = document.title;
    if (t) new MutationObserver(() => {
      if (document.title && document.title !== first) push('open', 'Gallery unlocked: ' + document.title.replace(/\s+—\s+Marshall$/, ''), 'gallery');
    }).observe(t, { childList: true, characterData: true, subtree: true });
  }

  // ── Films: YouTube embeds (via the player's postMessage API) ──────────────
  const frames = new Map();   // iframe contentWindow -> state
  const ytId = src => { const m = /\/embed\/([A-Za-z0-9_-]{11})/.exec(src || ''); return m ? m[1] : ''; };
  function film(id, kind) {
    return films[id] || (films[id] = { k: kind, at: since(), s: 0, f: 0, d: 0, p: 0, c: 0 });
  }
  function watchFrame(ifr) {
    const id = ytId(ifr.src);
    if (!id || !/enablejsapi=1/.test(ifr.src) || ifr._mhStats) return;
    ifr._mhStats = true;
    const st = { id, state: -1, t: null, heard: false };
    const hello = () => {
      try {
        frames.set(ifr.contentWindow, st);
        ifr.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: visit.slice(0, 8), channel: 'widget' }), '*');
      } catch (e) { /* frame gone */ }
    };
    ifr.addEventListener('load', hello);
    let tries = 0;
    const iv = setInterval(() => { if (st.heard || ++tries > 20 || !ifr.isConnected) return clearInterval(iv); hello(); }, 500);
    hello();
  }
  function ytUpdate(st, info) {
    const f = film(st.id, 'youtube');
    if (typeof info.duration === 'number' && info.duration > 0) f.d = Math.round(info.duration);
    if (typeof info.playerState === 'number') {
      if (info.playerState === 1 && st.state !== 1) f.p += 1;
      if (info.playerState === 0) f.c = 1;
      st.state = info.playerState;
      f._playing = st.state === 1;
    }
    if (typeof info.currentTime === 'number') {
      const t = info.currentTime;
      if (st.t !== null && st.state === 1) {
        const d = t - st.t;
        if (d > 0 && d < 3) f._exact = (f._exact || 0) + d;
      }
      st.t = t;
      f.s = Math.round(f._exact || 0);
      f.f = Math.max(f.f, Math.round(t));
    }
    if (f.d && f.s >= f.d * 0.9) f.c = 1;
    dirty = true;
  }
  addEventListener('message', e => {
    if (!/youtube(-nocookie)?\.com$/.test((() => { try { return new URL(e.origin).hostname; } catch (x) { return ''; } })())) return;
    const st = frames.get(e.source);
    if (!st) return;
    let data = e.data;
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch (x) { return; } }
    if (!data || typeof data !== 'object') return;
    st.heard = true;
    if (data.event === 'infoDelivery' && data.info) ytUpdate(st, data.info);
    else if (data.event === 'onStateChange' && typeof data.info === 'number') ytUpdate(st, { playerState: data.info });
  });
  new MutationObserver(muts => {
    for (const m of muts) for (const n of m.addedNodes) {
      if (n.nodeType !== 1) continue;
      if (n.tagName === 'IFRAME') watchFrame(n);
      else if (n.querySelectorAll) n.querySelectorAll('iframe').forEach(watchFrame);
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
  document.querySelectorAll('iframe').forEach(watchFrame);

  // ── Films: <video> elements (gallery films, BTS clips) ────────────────────
  const vidName = v => {
    const src = v.currentSrc || v.src || '';
    return clean(v.dataset.film || v.getAttribute('aria-label') || v.title ||
                 (src && !src.startsWith('blob:') ? src.split('/').pop().split('?')[0] : '') || 'video', 120)
      .replace(/[^A-Za-z0-9_\-./:]/g, '_');
  };
  const counts = v => v.controls || !v.muted || !v.loop;   // skip silent background loops
  document.addEventListener('play', e => {
    const v = e.target;
    if (v.tagName !== 'VIDEO' || !counts(v)) return;
    const f = film(vidName(v), 'video');
    f.p += 1; f._playing = true; v._mhT = v.currentTime; dirty = true;
  }, true);
  ['pause', 'ended'].forEach(t => document.addEventListener(t, e => {
    const v = e.target;
    if (v.tagName !== 'VIDEO' || !counts(v)) return;
    const f = film(vidName(v), 'video');
    f._playing = false;
    if (t === 'ended') f.c = 1;
    dirty = true;
  }, true));
  document.addEventListener('timeupdate', e => {
    const v = e.target;
    if (v.tagName !== 'VIDEO' || !counts(v) || v.paused) return;
    const f = film(vidName(v), 'video');
    const d = v.currentTime - (v._mhT == null ? v.currentTime : v._mhT);
    if (d > 0 && d < 3) f._exact = (f._exact || 0) + d;
    v._mhT = v.currentTime;
    if (isFinite(v.duration)) f.d = Math.round(v.duration);
    f.s = Math.round(f._exact || 0);
    f.f = Math.max(f.f, Math.round(v.currentTime));
    if (f.d && f.s >= f.d * 0.9) f.c = 1;
    dirty = true;
  }, true);

  // ── Schedule ─────────────────────────────────────────────────────────────
  const flush = send;
  onScroll();
  flush();
  setInterval(() => { if (document.visibilityState === 'visible') flush(); }, 15000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  addEventListener('pagehide', flush);
})();
