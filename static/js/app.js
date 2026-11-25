// ─────────────────────────────────────────────────────────────
//  UTILITIES
// ─────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

// Cached site settings (loaded once at boot)
let _site = null;

function escapeHtml(str = '') {
  return str.replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m]);
}

// ─────────────────────────────────────────────────────────────
//  SITE SETTINGS — load data/site.json and apply to DOM
// ─────────────────────────────────────────────────────────────
async function loadSiteSettings() {
  try {
    _site = await fetch('data/site.json').then(r => r.json());
  } catch(e) {
    _site = {};
    return;
  }

  const s = _site;

  // Navigation topbar
  const topbarLoc = $('topbar-location');
  if (topbarLoc && s.nav?.topbar_text) topbarLoc.textContent = s.nav.topbar_text;

  // Contact — update LinkedIn links from site.json
  if (s.social?.linkedin) {
    document.querySelectorAll('a[href*="linkedin.com"]').forEach(a => { a.href = s.social.linkedin; });
  }

  // Hero
  const heroVol = $('hero-vol');
  if (heroVol && s.hero?.vol_label) heroVol.textContent = s.hero.vol_label;

  const heroTagline = $('hero-tagline');
  if (heroTagline && s.hero?.tagline) heroTagline.innerHTML = s.hero.tagline;

  const heroCaption = $('hero-caption');
  if (heroCaption && s.hero?.caption_title) {
    heroCaption.innerHTML = `<strong>${s.hero.caption_title}</strong> ${s.hero.caption_sub || ''}`;
  }

  // Footer
  const footerCta = $('footer-cta');
  if (footerCta && s.footer?.cta) footerCta.textContent = s.footer.cta;
  const footerSub = $('footer-sub');
  if (footerSub && s.footer?.sub) footerSub.textContent = s.footer.sub;

  // Social links
  if (s.social?.youtube) {
    document.querySelectorAll('a[href*="youtube.com"]').forEach(a => { a.href = s.social.youtube; });
  }

  // Section visibility — driven generically by homepage_sections. Any section
  // with visible:false is hidden. SEC_SLUG_TO_ID maps publisher slugs to the
  // DOM section ids (kept in sync with SEC_ID in reorderSections).
  const secs = s.homepage_sections || [];
  const SEC_SLUG_TO_ID = { 'home': 'work', 'client-work': 'clients', 'photography': 'photography', 'bts': 'bts', 'electra-film': 'electra', 'about': 'about' };
  secs.forEach(sec => {
    if (sec && sec.visible === false) {
      const id = SEC_SLUG_TO_ID[sec.slug] || sec.slug;
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
      // A hidden section must not leave a nav link pointing at nothing.
      document.querySelectorAll(`.nav-group a[href="#${id}"]`).forEach(a => {
        const li = a.closest('li');
        if (li) li.style.display = 'none';
      });
    }
  });
}

// ─────────────────────────────────────────────────────────────
//  SMOOTH SCROLL — eased cubic bezier, offset for sticky header
// ─────────────────────────────────────────────────────────────
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function smoothScrollTo(targetEl, duration = 780) {
  const header = document.getElementById('site-header');
  const headerH = header ? header.offsetHeight : 0;
  const targetY = targetEl.getBoundingClientRect().top + window.scrollY - headerH - 12;
  const startY  = window.scrollY;
  const dist    = targetY - startY;
  let   start   = null;

  function tick(now) {
    if (!start) start = now;
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);
    window.scrollTo(0, startY + dist * easeInOutCubic(progress));
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// Wire up all anchor links
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const id  = link.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      // Close mobile nav if open
      const navMain = document.querySelector('.nav-main');
      if (navMain) { navMain.classList.remove('open'); }
      const toggle = $('navToggle');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
      smoothScrollTo(target, 820);
    });
  });
}

// ─────────────────────────────────────────────────────────────
//  NAV — sticky condense + scroll-spy + mobile hamburger
// ─────────────────────────────────────────────────────────────
function initNav() {
  const header  = document.getElementById('site-header');
  const toggle  = $('navToggle');
  const navMain = document.querySelector('.nav-main');

  // Condense topbar on scroll
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 30);
    }, { passive: true });
  }

  // Mobile hamburger
  if (toggle && navMain) {
    toggle.addEventListener('click', () => {
      const open = navMain.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Scroll-spy — updates active nav link as sections scroll past
  const spySections = ['work', 'clients', 'photography', 'bts', 'electra', 'about'].map(id => ({
    id,
    el: document.getElementById(id),
    link: document.querySelector(`.nav-group a[href="#${id}"]`),
  })).filter(s => s.el && s.link);

  if (spySections.length) {
    function updateSpy() {
      const headerH  = header ? header.offsetHeight : 0;
      const viewMid  = window.scrollY + headerH + 60;
      let   active   = null;

      spySections.forEach(s => {
        if (s.el.getBoundingClientRect().top + window.scrollY <= viewMid) active = s.id;
      });

      spySections.forEach(s => s.link.classList.toggle('active', s.id === active));
    }
    window.addEventListener('scroll', updateSpy, { passive: true });
    updateSpy();
  }
}

// ─────────────────────────────────────────────────────────────
//  INTERSECTION OBSERVER — section fade-in-up
// ─────────────────────────────────────────────────────────────
function initReveal() {
  const targets = document.querySelectorAll(
    '.section-work, .section-clients, .section-photography, .section-about, .section-electra'
  );
  if (!targets.length || !('IntersectionObserver' in window)) {
    targets.forEach(el => el.classList.add('visible'));
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  targets.forEach(el => obs.observe(el));
}

// ─────────────────────────────────────────────────────────────
//  WORK SECTION — large persistent player + highlight bank
// ─────────────────────────────────────────────────────────────
async function loadWork() {
  const data   = await fetch('data/videos.json').then(r => r.json()).catch(() => ({ videos: [] }));
  const videos = data.videos || [];
  const projMeta = {};
  (data.projects || []).forEach(p => { if (p && p.id) projMeta[p.id] = p; });

  // Group the flat list into items: a single film, or a project of films.
  // A project sits where its first film sits.
  const items = [];
  const projItem = {};
  videos.forEach((v, i) => {
    const pid = v.project && projMeta[v.project] ? v.project : '';
    if (!pid) { items.push({ kind: 'film', idx: i }); return; }
    if (!projItem[pid]) { projItem[pid] = { kind: 'project', id: pid, meta: projMeta[pid], films: [] }; items.push(projItem[pid]); }
    projItem[pid].films.push(i);
  });
  const filmProject = {};
  items.filter(it => it.kind === 'project').forEach(p => p.films.forEach((i, n) => { filmProject[i] = { p, n }; }));
  const nProjects = items.filter(it => it.kind === 'project').length;

  const countEl = $('work-count');
  if (countEl) countEl.textContent = videos.length + ' film' + (videos.length !== 1 ? 's' : '') +
    (nProjects ? ' · ' + nProjects + ' project' + (nProjects !== 1 ? 's' : '') : '');

  if (!videos.length) return;

  const stageEl  = $('work-stage');
  const annoEl   = $('work-anno');
  const bankEl   = $('work-sidebar');
  if (!stageEl || !annoEl || !bankEl) return;

  let activeTile = null;
  const ytThumb = (v, q) => v.thumb || `https://img.youtube.com/vi/${v.youtubeId}/${q}.jpg`;

  // ── Annotation: title, sub, and where you are in a project
  function setAnno(v, i) {
    const fp = filmProject[i];
    annoEl.innerHTML =
      `<span class="work-anno-title">${escapeHtml(v.title)}</span>` +
      (v.sub ? `<span class="work-anno-sep"> · </span><span class="work-anno-sub">${escapeHtml(v.sub)}</span>` : '') +
      (fp ? `<span class="work-anno-sep"> · </span><span class="work-anno-sub">` +
            ((v.sub || '').toLowerCase().includes((fp.p.meta.name || '').toLowerCase()) ? '' : escapeHtml(fp.p.meta.name || 'Project') + ' · ') +
            `${fp.n + 1} of ${fp.p.films.length}</span>` +
            (fp.p.films.length > 1 ? `<button class="work-anno-next" type="button">Next in project →</button>` : '') : '');
    const nx = annoEl.querySelector('.work-anno-next');
    if (nx) nx.addEventListener('click', () => {
      const next = fp.p.films[(fp.n + 1) % fp.p.films.length];
      const tile = bankEl.querySelector(`.work-tile[data-idx="${next}"]`);
      if (tile) activateTile(tile, next, false);
    });
  }

  function loadPlayer(v, i) {
    stageEl.innerHTML =
      `<iframe src="https://www.youtube-nocookie.com/embed/${escapeHtml(v.youtubeId)}?autoplay=1&rel=0"` +
      ` title="${escapeHtml(v.title)}" frameborder="0"` +
      ` allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"` +
      ` allowfullscreen></iframe>`;
    setAnno(v, i);
  }

  function showPoster(v, i) {
    const hq  = ytThumb(v, 'hqdefault');
    const max = v.thumb || `https://img.youtube.com/vi/${v.youtubeId}/maxresdefault.jpg`;
    stageEl.innerHTML =
      `<img class="work-poster" src="${max}" width="1280" height="720" alt="${escapeHtml(v.title)}" loading="eager"` +
      ` onerror="this.src='${hq}'" onload="if(this.naturalWidth<320&&this.src!=='${hq}')this.src='${hq}'">` +
      `<button class="work-poster-play" aria-label="Play ${escapeHtml(v.title)}">` +
        `<span class="work-play-icon" aria-hidden="true">&#9654;</span>` +
      `</button>`;
    stageEl.querySelector('.work-poster-play').addEventListener('click', () => loadPlayer(v, i));
    setAnno(v, i);
  }

  function maybeScrollToPlayer() {
    const rect = stageEl.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) smoothScrollTo(stageEl, 600);
  }

  function activateTile(tile, i, scroll = true) {
    if (activeTile) activeTile.classList.remove('work-tile--active');
    tile.classList.add('work-tile--active');
    activeTile = tile;
    loadPlayer(videos[i], i);
    if (scroll) maybeScrollToPlayer();
  }

  showPoster(videos[0], 0);

  // ── A single film tile (unchanged look)
  function filmTile(i) {
    const v = videos[i];
    return `<div class="work-tile" data-idx="${i}" role="button" tabindex="0" aria-label="${escapeHtml(v.title)}">` +
      `<div class="work-tile-img-wrap">` +
        `<img class="work-tile-img" src="${ytThumb(v, 'hqdefault')}" width="320" height="180" alt="${escapeHtml(v.title)}" loading="lazy">` +
      `</div>` +
      `<div class="work-tile-meta">` +
        `<div class="work-tile-title">${escapeHtml(v.title)}</div>` +
        (v.sub ? `<div class="work-tile-sub">${escapeHtml(v.sub)}</div>` : '') +
      `</div>` +
    `</div>`;
  }

  // ── Project layout: bands on a 3-column grid, always a clean rectangle.
  //   Large → 2×2 with up to two films stacked beside it (one goes tall,
  //   none and it goes full width). Wide → a full-width strip. Smalls run
  //   three to a row; a lone one goes wide, a pair splits 2 + 1.
  function projectCells(films) {
    const size = i => ({ l: 'l', w: 'w' }[videos[i].size] || 's');
    const cells = []; let row = 1, k = 0;
    const put = (i, c, r, cs, rs) => cells.push({ i, c, r, cs, rs });
    while (k < films.length) {
      const i = films[k], s = size(i);
      if (s === 'l') {
        const side = [];
        while (side.length < 2 && k + 1 + side.length < films.length && size(films[k + 1 + side.length]) !== 'l') side.push(films[k + 1 + side.length]);
        if (!side.length) put(i, 1, row, 3, 2);
        else {
          put(i, 1, row, 2, 2);
          if (side.length === 1) put(side[0], 3, row, 1, 2);
          else { put(side[0], 3, row, 1, 1); put(side[1], 3, row + 1, 1, 1); }
        }
        row += 2; k += 1 + side.length;
      } else if (s === 'w') {
        put(i, 1, row, 3, 1); row += 1; k += 1;
      } else {
        const run = [];
        while (run.length < 3 && k + run.length < films.length && size(films[k + run.length]) === 's') run.push(films[k + run.length]);
        if (run.length === 1) put(run[0], 1, row, 3, 1);
        else if (run.length === 2) { put(run[0], 1, row, 2, 1); put(run[1], 3, row, 1, 1); }
        else run.forEach((j, n) => put(j, n + 1, row, 1, 1));
        row += 1; k += run.length;
      }
    }
    return cells;
  }

  function projectBlock(p, nth) {
    const m = p.meta;
    const cells = projectCells(p.films).map(c => {
      const v = videos[c.i];
      const big = c.cs > 1 || c.rs > 1;
      const hq = ytThumb(v, 'hqdefault');
      const src = big && !v.thumb ? `https://img.youtube.com/vi/${v.youtubeId}/maxresdefault.jpg` : hq;
      return `<div class="work-tile work-ptile" data-idx="${c.i}" role="button" tabindex="0" aria-label="${escapeHtml(v.title)}"` +
        ` style="grid-column:${c.c} / span ${c.cs};grid-row:${c.r} / span ${c.rs}">` +
        `<div class="work-tile-img-wrap">` +
          `<img class="work-tile-img" src="${src}" alt="${escapeHtml(v.title)}" loading="lazy"` +
          (big ? ` onload="if(this.naturalWidth<200&&this.src!=='${hq}')this.src='${hq}'" onerror="this.src='${hq}'"` : '') + `>` +
          `<span class="work-ptile-title">${escapeHtml(v.title)}</span>` +
        `</div>` +
      `</div>`;
    }).join('');
    return `<div class="work-project${nth % 2 ? ' work-project--right' : ''}" data-project="${escapeHtml(p.id)}">` +
      `<div class="work-project-head">` +
        `<div class="work-project-kicker">Project · ${p.films.length} film${p.films.length !== 1 ? 's' : ''}</div>` +
        `<h3 class="work-project-name">${escapeHtml(m.name || 'Project')}</h3>` +
        (m.desc ? `<p class="work-project-desc">${escapeHtml(m.desc)}</p>` : '') +
      `</div>` +
      `<div class="work-project-films"><div class="work-project-grid">${cells}</div></div>` +
    `</div>`;
  }

  let nth = 0;
  bankEl.innerHTML = items.map(it => it.kind === 'film' ? filmTile(it.idx) : projectBlock(it, nth++)).join('');

  // Projects span as many grid rows as they need (measured, so it holds at any width)
  const projects = [...bankEl.querySelectorAll('.work-project')];
  function sizeProjects() {
    if (!projects.length) return;
    const one = bankEl.querySelector(':scope > .work-tile');
    const gap = parseFloat(getComputedStyle(bankEl).rowGap) || 0;
    const unit = one ? one.getBoundingClientRect().height : 200;
    const cols = getComputedStyle(bankEl).gridTemplateColumns.split(' ').length;
    projects.forEach(p => {
      // Full-width (phones): nothing sits beside it, so it just takes its natural height
      p.classList.toggle('is-natural', cols <= 2);
      if (cols <= 2) { p.style.gridRow = ''; return; }
      // natural height = header + films at true 16:9, measured unstretched
      p.style.gridRow = ''; p.classList.add('is-measuring');
      const h = p.getBoundingClientRect().height;
      p.classList.remove('is-measuring');
      p.style.gridRow = 'span ' + Math.max(2, Math.ceil((h + gap) / (unit + gap) - 0.15));
    });
  }
  sizeProjects();
  let rt = null;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(sizeProjects, 120); });

  // Fold at two and a half rows, but never through the middle of a project
  setupFold(bankEl, $('work-more-btn'), () => {
    sizeProjects();
    let h = rowsHeight(bankEl, 2.55);
    if (!h) return h;
    const top0 = bankEl.getBoundingClientRect().top;
    const one = bankEl.querySelector(':scope > .work-tile');
    const step = one ? one.getBoundingClientRect().height : 200;
    for (let moved = true; moved;) {
      moved = false;
      projects.forEach(p => {
        const r = p.getBoundingClientRect();
        const t = r.top - top0, b = r.bottom - top0;
        const want = b + Math.max(step * 0.55, 200);
        if (t < h && b > h - 60 && want > h + 1) { h = want; moved = true; }
      });
    }
    return h;
  });

  const tiles = bankEl.querySelectorAll('.work-tile');
  activeTile = bankEl.querySelector('.work-tile[data-idx="0"]');
  if (activeTile) activeTile.classList.add('work-tile--active');

  // ── Living thumbnails + activation
  const YT_FRAMES = ['mq1.jpg', 'mq2.jpg', 'mq3.jpg'];
  tiles.forEach(tile => {
    const i   = +tile.dataset.idx;
    const v   = videos[i];
    const img = tile.querySelector('.work-tile-img');
    let rest = img.src;
    let cycleTimer = null;

    tile.addEventListener('mouseenter', () => {
      if (v.thumb) return;
      rest = img.src;
      let frame = 0;
      cycleTimer = setInterval(() => {
        frame = (frame + 1) % YT_FRAMES.length;
        img.src = `https://img.youtube.com/vi/${v.youtubeId}/${YT_FRAMES[frame]}`;
      }, 600);
    });
    tile.addEventListener('mouseleave', () => {
      clearInterval(cycleTimer);
      cycleTimer = null;
      if (!v.thumb) img.src = rest;
    });

    function handleActivate() {
      if (tile.classList.contains('work-tile--active')) return;
      activateTile(tile, i);
    }
    tile.addEventListener('click', handleActivate);
    tile.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleActivate(); } });
  });
}

// ─────────────────────────────────────────────────────────────
//  FOLD — one tidy ending for every long section
//  Collapsed: the section is clipped to a set height and fades into the
//  page, with View more sitting in the fade. Expanded: it eases open.
// ─────────────────────────────────────────────────────────────
function rowsHeight(el, rows) {
  const top0 = el.getBoundingClientRect().top;
  const tops = [...new Set([...el.children].filter(c => c.offsetParent)
    .map(c => Math.round(c.getBoundingClientRect().top - top0)))].sort((a, b) => a - b);
  if (tops.length < 2 || tops.length <= Math.ceil(rows)) return 0;
  const whole = Math.floor(rows);
  return tops[whole] + (tops[1] - tops[0]) * (rows - whole);
}

function setupFold(el, btn, collapsedPx) {
  if (!el || !btn) return null;
  const wrap = btn.closest('.photo-more-wrap');
  let expanded = false;
  el.classList.add('fold');
  const fold = () => {
    const h = collapsedPx();
    const worth = h && el.scrollHeight > h + 120;
    btn.hidden = !worth;
    if (wrap) wrap.classList.toggle('is-empty', !worth);
    if (!worth) {
      el.classList.remove('is-folded'); el.style.maxHeight = '';
      if (wrap) wrap.classList.remove('over-fold');
      return;
    }
    if (expanded) return;
    el.style.maxHeight = h + 'px';
    el.classList.add('is-folded');
    if (wrap) wrap.classList.add('over-fold');
    btn.textContent = 'View more';
  };
  btn.addEventListener('click', () => {
    expanded = !expanded;
    if (expanded) {
      el.style.maxHeight = el.scrollHeight + 'px';
      el.classList.remove('is-folded');
      if (wrap) wrap.classList.remove('over-fold');
      btn.textContent = 'View fewer';
      const done = e => { if (e.target === el && expanded) el.style.maxHeight = 'none'; el.removeEventListener('transitionend', done); };
      el.addEventListener('transitionend', done);
    } else {
      el.style.maxHeight = el.scrollHeight + 'px';
      void el.offsetHeight;
      fold();
      const top = el.getBoundingClientRect().top;
      if (top < 0) smoothScrollTo(el.closest('section') || el, 500);
    }
  });
  let t = null;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(fold, 150); });
  fold();
  return { refold: fold };
}

// ─────────────────────────────────────────────────────────────
//  THE ARCHIVE — index table with accordion player
// ─────────────────────────────────────────────────────────────
async function loadClients() {
  const listEl = $('archive-list');
  if (!listEl) return;
  const data    = await fetch('data/clients.json').then(r => r.json()).catch(() => ({ clients: [] }));
  const clients = data.clients || [];

  if (!clients.length) {
    const sec = listEl.closest('.section-clients');
    if (sec) sec.style.display = 'none';
    return;
  }

  // Count badge
  const totalVideos = clients.reduce((n, c) => n + (c.videos || []).length, 0);
  const countEl = $('archive-count');
  if (countEl) countEl.textContent = clients.length + ' clients · ' + totalVideos + ' films';

  let openIdx = -1;

  clients.forEach((client, idx) => {
    const videos  = client.videos || [];
    const nFilms  = videos.length;
    const firstId = videos[0]?.youtubeId || '';

    // ── Row
    const row = document.createElement('div');
    row.className = 'archive-row';
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '0');
    row.setAttribute('aria-expanded', 'false');
    row.innerHTML =
      `<span class="archive-row-name">${escapeHtml(client.name)}</span>` +
      `<span class="archive-row-leader" aria-hidden="true"></span>` +
      `<span class="archive-row-meta">${nFilms} film${nFilms !== 1 ? 's' : ''}<span class="archive-chevron" aria-hidden="true"></span></span>`;

    // ── Panel (accordion)
    const panel = document.createElement('div');
    panel.className = 'archive-panel';
    const inner = document.createElement('div');
    inner.className = 'archive-panel-inner';

    // Player frame
    const playerWrap = document.createElement('div');
    playerWrap.className = 'archive-player';

    // If there's a cover, use it as poster src
    const coverUrl = client.cover || (firstId ? `https://img.youtube.com/vi/${firstId}/maxresdefault.jpg` : '');

    if (firstId) {
      playerWrap.innerHTML =
        `<div class="archive-player-stage" data-first="${escapeHtml(firstId)}">` +
          `<img class="archive-poster" src="${escapeHtml(coverUrl)}" alt="${escapeHtml(client.name)}" loading="lazy"` +
          ` onerror="this.src='https://img.youtube.com/vi/${escapeHtml(firstId)}/hqdefault.jpg'">` +
        `</div>`;
    }

    // Thumb grid
    const thumbGrid = document.createElement('div');
    thumbGrid.className = 'archive-thumbs';

    videos.forEach((v, vi) => {
      const thumb = document.createElement('div');
      thumb.className = 'archive-thumb';
      thumb.setAttribute('role', 'button');
      thumb.setAttribute('tabindex', '-1');
      thumb.setAttribute('aria-label', v.title);
      thumb.style.transitionDelay = (vi * 40) + 'ms';
      const thumbUrl = `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`;
      thumb.innerHTML =
        `<div class="archive-thumb-img-wrap">` +
          `<img src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(v.title)}" loading="lazy">` +
        `</div>` +
        `<span class="archive-thumb-title">${escapeHtml(v.title)}</span>`;

      // Click thumb: swap player src with autoplay
      thumb.addEventListener('click', () => {
        const stage = panel.querySelector('.archive-player-stage');
        if (!stage) return;
        // Mark active
        panel.querySelectorAll('.archive-thumb').forEach(t => t.classList.remove('archive-thumb--active'));
        thumb.classList.add('archive-thumb--active');
        // Load iframe with autoplay
        stage.innerHTML =
          `<iframe src="https://www.youtube-nocookie.com/embed/${escapeHtml(v.youtubeId)}?autoplay=1&rel=0"` +
          ` title="${escapeHtml(v.title)}" frameborder="0"` +
          ` allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"` +
          ` allowfullscreen></iframe>`;
      });
      thumb.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); thumb.click(); } });
      thumbGrid.appendChild(thumb);
    });

    inner.appendChild(playerWrap);
    inner.appendChild(thumbGrid);
    panel.appendChild(inner);

    // ── Toggle logic
    function closePanel(animate) {
      row.setAttribute('aria-expanded', 'false');
      row.classList.remove('archive-row--open');
      panel.style.gridTemplateRows = '0fr';
      if (animate) {
        // Clear iframe src after transition to stop audio
        panel.addEventListener('transitionend', () => {
          const stage = panel.querySelector('.archive-player-stage');
          if (stage) {
            stage.innerHTML = firstId
              ? `<img class="archive-poster" src="${escapeHtml(coverUrl)}" alt="${escapeHtml(client.name)}" loading="lazy"` +
                ` onerror="this.src='https://img.youtube.com/vi/${escapeHtml(firstId)}/hqdefault.jpg'">`
              : '';
          }
          // Reset thumb active states
          panel.querySelectorAll('.archive-thumb').forEach(t => t.classList.remove('archive-thumb--active'));
        }, { once: true });
      }
    }

    function openPanel() {
      row.setAttribute('aria-expanded', 'true');
      row.classList.add('archive-row--open');
      panel.style.gridTemplateRows = '1fr';
      // Enable thumb tabindex
      panel.querySelectorAll('.archive-thumb').forEach(t => t.setAttribute('tabindex', '0'));
    }

    function toggleRow() {
      if (openIdx === idx) {
        // Close current
        closePanel(true);
        openIdx = -1;
      } else {
        // Close previous if open
        if (openIdx !== -1) {
          const prevRow   = listEl.querySelectorAll('.archive-row')[openIdx];
          const prevPanel = listEl.querySelectorAll('.archive-panel')[openIdx];
          if (prevRow)   { prevRow.setAttribute('aria-expanded', 'false'); prevRow.classList.remove('archive-row--open'); }
          if (prevPanel) {
            prevPanel.style.gridTemplateRows = '0fr';
            prevPanel.addEventListener('transitionend', () => {
              const stage = prevPanel.querySelector('.archive-player-stage');
              if (stage) {
                const pid = clients[openIdx]?.videos?.[0]?.youtubeId || '';
                const pcv = clients[openIdx]?.cover || (pid ? `https://img.youtube.com/vi/${pid}/maxresdefault.jpg` : '');
                stage.innerHTML = pid
                  ? `<img class="archive-poster" src="${escapeHtml(pcv)}" alt="" loading="lazy"` +
                    ` onerror="this.src='https://img.youtube.com/vi/${escapeHtml(pid)}/hqdefault.jpg'">`
                  : '';
              }
              prevPanel.querySelectorAll('.archive-thumb').forEach(t => t.classList.remove('archive-thumb--active'));
            }, { once: true });
          }
        }
        openIdx = idx;
        openPanel();
      }
    }

    row.addEventListener('click', toggleRow);
    row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRow(); } });

    listEl.appendChild(row);
    listEl.appendChild(panel);
  });
}

// ─────────────────────────────────────────────────────────────
//  ELECTRA SECTION
// ─────────────────────────────────────────────────────────────
async function loadElectra() {
  const el = $('electra-content');
  if (!el) return;

  const [pagesData, stillsData] = await Promise.all([
    fetch('data/pages.json').then(r => r.json()).catch(() => null),
    fetch('data/electra-stills.json').then(r => r.json()).catch(() => ({ images: [] })),
  ]);

  const page   = pagesData?.pages?.find(p => p.slug === 'electra-film');
  const blocks = page?.blocks || [];

  // The full film plays from the poster; the teaser is offered alongside it.
  const vids   = blocks.filter(b => b.type === 'video_embed' && b.youtubeId);
  const film   = vids.find(b => b.id === 'electra-main') || vids[vids.length - 1] || null;
  const teaser = vids.find(b => b.id === 'electra-trailer' && b !== film) || null;

  const info      = blocks.find(b => b.type === 'info_box') || {};
  const posterSrc = info.image || '';
  const bodyText  = (info.body || '').split('\n\n')[0];
  const year      = info.year || '';
  const awards    = Array.isArray(info.awards) ? info.awards.filter(Boolean) : [];

  // Stills are stored as plain paths; tolerate {src} objects as well.
  const stills = (stillsData.images || [])
    .map(s => (typeof s === 'string' ? s : s && s.src))
    .filter(Boolean);
  const lightboxItems = stills.map((src, i) => ({ src, alt: `Electra, still ${i + 1}`, caption: '', exif: '' }));

  el.innerHTML = '';

  // LEFT: poster tile that turns into the player
  const posterDiv = document.createElement('div');
  posterDiv.className = 'electra-poster-tile';
  posterDiv.setAttribute('role', 'button');
  posterDiv.setAttribute('tabindex', '0');
  posterDiv.setAttribute('aria-label', 'Play Electra');
  if (posterSrc) {
    posterDiv.innerHTML = `<img src="${escapeHtml(posterSrc)}" alt="Electra, film poster" loading="lazy">` +
      (film ? `<span class="electra-play-badge" aria-hidden="true"><span class="work-play-icon">&#9654;</span></span>` : '');
  }

  function play(block) {
    if (!block) return;
    posterDiv.innerHTML =
      `<iframe src="https://www.youtube-nocookie.com/embed/${escapeHtml(block.youtubeId)}?autoplay=1&rel=0"` +
      ` title="${escapeHtml(block.label || 'Electra')}" frameborder="0"` +
      ` allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"` +
      ` allowfullscreen></iframe>`;
    posterDiv.classList.add('electra-poster-tile--playing');
    const r = posterDiv.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) smoothScrollTo(posterDiv, 600);
  }

  function activatePoster() {
    if (posterDiv.classList.contains('electra-poster-tile--playing')) return;
    if (film) play(film);
    else if (lightboxItems.length && typeof openLightboxAt === 'function') openLightboxAt(lightboxItems, 0);
  }
  posterDiv.addEventListener('click', activatePoster);
  posterDiv.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activatePoster(); } });

  // RIGHT: copy, awards, watch links, stills
  const copyDiv = document.createElement('div');
  copyDiv.className = 'electra-copy';
  const blurb = bodyText || 'Written, shot and cut as personal work.';
  copyDiv.innerHTML =
    `<p class="electra-meta">Short film${year ? ' &middot; ' + escapeHtml(year) : ''}</p>` +
    `<h2 class="electra-heading">A short film.</h2>` +
    `<p class="electra-body">${escapeHtml(blurb)}</p>` +
    (awards.length ? `<ul class="electra-awards">${awards.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul>` : '');

  if (film || teaser) {
    const actions = document.createElement('div');
    actions.className = 'electra-actions';
    [[film, 'Watch the film'], [teaser, 'Teaser']].forEach(([block, label]) => {
      if (!block) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'electra-watch';
      b.textContent = label;
      b.addEventListener('click', () => play(block));
      actions.appendChild(b);
    });
    copyDiv.appendChild(actions);
  }

  if (stills.length) {
    const strip = document.createElement('div');
    strip.className = 'electra-stills-strip';
    const shown = stills.slice(0, 4);
    shown.forEach((src, si) => {
      const tile = document.createElement('div');
      tile.className = 'electra-still-tile';
      tile.setAttribute('role', 'button');
      tile.setAttribute('tabindex', '0');
      tile.setAttribute('aria-label', `Open Electra still ${si + 1}`);
      tile.innerHTML = `<img src="${escapeHtml(src)}" alt="Electra, still ${si + 1}" loading="lazy">`;
      const extra = stills.length - shown.length;
      if (si === shown.length - 1 && extra > 0) {
        tile.insertAdjacentHTML('beforeend', `<span class="electra-more">+${extra}</span>`);
      }
      const open = () => { if (typeof openLightboxAt === 'function') openLightboxAt(lightboxItems, si); };
      tile.addEventListener('click', open);
      tile.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      strip.appendChild(tile);
    });
    copyDiv.appendChild(strip);
  }

  el.appendChild(posterDiv);
  el.appendChild(copyDiv);
}

// ─────────────────────────────────────────────────────────────
//  PHOTOGRAPHY — masonry grid + lightbox nav
// ─────────────────────────────────────────────────────────────

// Active lightbox collection for prev/next navigation
let _lbItems  = [];   // array of {src, alt, caption, exif} objects
let _lbIndex  = 0;

/**
 * Normalise a photos.json item into {src, alt, caption, exif, srcset, w, h}.
 */
function normalisePhotoItem(item) {
  if (typeof item === 'string') return { src: item, alt: '', caption: '', exif: '', full: '' };
  const src     = item.src || '';
  const alt     = item.alt || item.title || '';
  const caption = item.caption || item.title || '';
  // Collect EXIF-ish fields if present
  const exifParts = [];
  ['camera', 'lens', 'iso', 'shutter', 'aperture', 'settings', 'exif'].forEach(k => {
    if (item[k]) exifParts.push(String(item[k]));
  });
  const exif    = exifParts.join('  ');
  return { src, alt, caption, exif, full: item.full || '', srcset: item.srcset || '', w: item.w || 0, h: item.h || 0 };
}

/**
 * Build a photo tile element. Returned as a DOM element so we can
 * attach a data-index and the view-transition name.
 */
function buildPhotoTile(norm, index, collection) {
  const tile = document.createElement('div');
  tile.className = 'photo-tile';
  if (norm.w && norm.h) tile.style.aspectRatio = `${norm.w}/${norm.h}`;

  const srcset = norm.srcset
    ? ` srcset="${norm.srcset}" sizes="(max-width:600px) 90vw, (max-width:900px) 33vw, 25vw"`
    : '';
  const width  = norm.w ? ` width="${norm.w}"` : '';
  const height = norm.h ? ` height="${norm.h}"` : '';

  tile.innerHTML =
    `<img src="${escapeHtml(norm.src)}"${srcset}${width}${height} alt="${escapeHtml(norm.alt)}" loading="lazy">` +
    (norm.caption ? `<span class="photo-tile-caption">${escapeHtml(norm.caption)}</span>` : '');

  tile.addEventListener('click', () => {
    openLightboxAt(collection, index);
  });
  return tile;
}

async function loadPhotography() {
  const masonry = $('photo-masonry');
  if (!masonry) return;

  const data      = await fetch('data/photos.json').then(r => r.json()).catch(() => ({ images: [] }));
  const allImages = (data.images || []).map(normalisePhotoItem);
  const photoCount = _site?.sections?.photography_count || 16;

  if (!allImages.length) {
    masonry.closest('.section-photography').style.display = 'none';
    return;
  }

  // Update count badge
  const countEl = $('photo-count');
  if (countEl) countEl.textContent = allImages.length + ' stills';

  // Balanced masonry: each tile goes in the currently shortest column (by
  // aspect ratio), so the columns end level instead of ragged.
  const tiles = allImages.map((norm, i) => buildPhotoTile(norm, i, allImages));
  const ratio = n => (n.w && n.h ? n.h / n.w : 1) + (n.caption ? 0.06 : 0) + 0.02;
  const narrow = window.matchMedia('(max-width: 760px)');
  let fold = null;
  function layout() {
    const n = narrow.matches ? 2 : 3;
    masonry.innerHTML = '';
    masonry.style.gridTemplateColumns = `repeat(${n}, minmax(0, 1fr))`;
    const cols = Array.from({ length: n }, (_, k) => {
      const c = document.createElement('div');
      c.className = 'photo-col'; c.id = 'photo-col-' + k;
      masonry.appendChild(c);
      return c;
    });
    const heights = new Array(n).fill(0);
    allImages.forEach((norm, i) => {
      const k = heights.indexOf(Math.min(...heights));
      cols[k].appendChild(tiles[i]);
      heights[k] += ratio(norm);
    });
    if (fold) fold.refold();
  }
  // Collapsed height: where the first `photoCount` stills reach in the
  // shortest column, so every column is full right down to the fade.
  function collapsed() {
    const top0 = masonry.getBoundingClientRect().top;
    const reach = [...masonry.querySelectorAll('.photo-col')].map(col => {
      const firsts = [...col.children].filter(t => +t.dataset.index < photoCount);
      const last = firsts[firsts.length - 1];
      return last ? last.getBoundingClientRect().bottom - top0 : 0;
    }).filter(Boolean);
    return reach.length ? Math.max(420, Math.min(...reach)) : 0;
  }
  tiles.forEach((t, i) => { t.dataset.index = i; });
  layout();
  fold = setupFold(masonry, $('photo-more-btn'), collapsed);
  narrow.addEventListener('change', layout);
}

// ─────────────────────────────────────────────────────────────
//  BTS SECTION
// ─────────────────────────────────────────────────────────────

/**
 * Normalise a bts.json item. Items may be plain URL strings or objects.
 * Objects may have youtubeId or a src ending in .mp4/.webm (video).
 */
function normaliseBTSItem(item) {
  if (typeof item === 'string') return { src: item, alt: '', caption: '', full: '', isVideo: false, youtubeId: '', title: '' };
  const src       = item.src || '';
  const isVideo   = !!(item.youtubeId || /\.(mp4|webm)$/i.test(src));
  return {
    src,
    alt:       item.alt || item.title || '',
    caption:   item.caption || item.title || '',
    isVideo,
    youtubeId: item.youtubeId || '',
    title:     item.title || item.alt || '',
    full:      item.full || '',
    thumb:     item.thumb || (item.youtubeId ? `https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg` : src),
  };
}

async function loadBTS() {
  const grid = $('bts-grid');
  if (!grid) return;

  const raw  = await fetch('data/bts.json').then(r => r.json()).catch(() => []);
  const items = (Array.isArray(raw) ? raw : []).map(normaliseBTSItem);

  if (!items.length) {
    const sec = document.getElementById('bts');
    if (sec) sec.style.display = 'none';
    return;
  }

  // Count badge
  const countEl = $('bts-count');
  if (countEl) countEl.textContent = items.length + ' frames';

  // Build image-only list for lightbox navigation
  const btsImageItems = items.filter(it => !it.isVideo).map(it => ({
    src:     it.thumb || it.src,
    alt:     it.alt,
    caption: it.caption,
    exif:    '',
  }));
  // Index offset: bts items start after photo items in lightbox collections
  // They use their own collection — we pass btsImageItems separately

  items.forEach((item) => {
    const tile = document.createElement('div');
    tile.className = 'bts-tile';

    if (item.isVideo) {
      const thumbSrc = item.thumb || item.src;
      tile.innerHTML =
        `<img src="${escapeHtml(thumbSrc)}" alt="${escapeHtml(item.alt)}" loading="lazy">` +
        `<span class="bts-play-icon" aria-hidden="true">&#9654;</span>`;
      tile.setAttribute('role', 'button');
      tile.setAttribute('tabindex', '0');
      tile.setAttribute('aria-label', 'Play ' + escapeHtml(item.title || 'video'));
      const play = () => {
        if (item.youtubeId) {
          openVideoModal(item.youtubeId, item.title);
        } else if (item.src) {
          // Direct video file — open in lightbox as video
          openLightboxVideo(item.src, item.caption);
        }
      };
      tile.addEventListener('click', play);
      tile.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); } });
    } else {
      // Image — find its index within btsImageItems for lightbox nav
      const imgIdx = btsImageItems.findIndex(x => x.src === (item.thumb || item.src));
      tile.innerHTML = `<img src="${escapeHtml(item.thumb || item.src)}" alt="${escapeHtml(item.alt)}" loading="lazy">`;
      tile.addEventListener('click', () => openLightboxAt(btsImageItems, imgIdx >= 0 ? imgIdx : 0));
    }

    grid.appendChild(tile);
  });

  setupFold(grid, $('bts-more-btn'), () => rowsHeight(grid, window.innerWidth <= 760 ? 4.55 : 2.55));
}

// ─────────────────────────────────────────────────────────────
//  ABOUT SECTION
// ─────────────────────────────────────────────────────────────
async function loadAbout() {
  const el = $('about-content');
  if (!el) return;
  const pages = await fetch('data/pages.json').then(r => r.json()).catch(() => null);
  if (!pages) return;

  const aboutPage = pages.pages.find(p => p.slug === 'about');
  if (!aboutPage) return;
  const block = (aboutPage.blocks || []).find(b => b.type === 'info_box');
  if (!block) return;

  const paragraphs = (block.body || '').split('\n\n').map(p => p.trim()).filter(Boolean);
  const linkedin   = _site?.social?.linkedin || 'https://www.linkedin.com/in/ash-marshall-b7725bb9';

  // Read the bio's shape: intro paragraphs, a "…:" lead-in followed by short
  // lines (a list of services), then the rest. The last of the rest becomes a
  // pull quote. Plain bios without a list still lay out cleanly.
  const leadIdx = paragraphs.findIndex(p => p.endsWith(':'));
  let intro = paragraphs, listLead = '', list = [], rest = [];
  if (leadIdx > 0) {
    let j = leadIdx + 1;
    while (j < paragraphs.length && paragraphs[j].length <= 100 && !/[.!?]$/.test(paragraphs[j])) j++;
    if (j - leadIdx - 1 >= 2) {
      intro = paragraphs.slice(0, leadIdx);
      listLead = paragraphs[leadIdx].replace(/:$/, '');
      list = paragraphs.slice(leadIdx + 1, j);
      rest = paragraphs.slice(j);
    }
  }
  const quote = rest.length >= 2 ? rest[rest.length - 1] : '';
  if (quote) rest = rest.slice(0, -1);
  const [lede, ...introRest] = intro;
  const P = t => `<p>${escapeHtml(t)}</p>`;

  el.className = 'about-v2';
  // A landscape photo gets the editorial treatment: the intro sits over the
  // image's open space (right side). Portrait photos sit beside the text.
  if (block.image) {
    const probe = new Image();
    probe.onload = () => {
      const wide = probe.naturalWidth > probe.naturalHeight * 1.2;
      el.classList.toggle('about-v2--overlay', wide);
    };
    probe.src = block.image;
  }
  el.innerHTML = `
    <div class="about-hero">
      ${block.image ? `<figure class="about-photo"><img src="${escapeHtml(block.image)}" alt="Ash Marshall" loading="lazy"></figure>` : ''}
      <div class="about-intro">
        <p class="about-kicker">Producer · Director · London</p>
        <h3 class="about-heading">Ash Marshall</h3>
        ${lede ? `<p class="about-lede">${escapeHtml(lede)}</p>` : ''}
        <div class="about-copy">${introRest.map(P).join('')}</div>
        <a class="about-hello" href="${escapeHtml(linkedin)}" target="_blank" rel="noreferrer noopener">Say hello on LinkedIn <span aria-hidden="true">↗</span></a>
      </div>
    </div>
    ${list.length ? `
    <div class="about-services">
      <p class="about-label">${escapeHtml(listLead)}</p>
      <ol class="about-service-list">
        ${list.map((t, i) => `<li><span class="about-num">${String(i + 1).padStart(2, '0')}</span><span>${escapeHtml(t)}</span></li>`).join('')}
      </ol>
    </div>` : ''}
    ${(rest.length || quote) ? `
    <div class="about-more">
      <div class="about-copy about-copy-cols">${rest.map(P).join('')}</div>
      ${quote ? `<blockquote class="about-quote">${escapeHtml(quote)}</blockquote>` : ''}
    </div>` : ''}`;
}

// ─────────────────────────────────────────────────────────────
//  SECTION ORDERING — reorder DOM to match homepage_sections
// ─────────────────────────────────────────────────────────────
function reorderSections() {
  if (!_site?.homepage_sections) return;
  const SEC_ID = { 'home': 'work', 'client-work': 'clients', 'photography': 'photography', 'bts': 'bts', 'electra-film': 'electra', 'about': 'about' };
  const footer = document.querySelector('footer.site-footer');
  if (!footer) return;
  const parent = footer.parentElement;
  // Move custom sections out of their container so they can be freely ordered
  const customContainer = document.getElementById('custom-sections');
  [...(customContainer?.children || [])].forEach(el => parent.insertBefore(el, footer));
  // Insert all sections in homepage_sections order, just before the footer
  _site.homepage_sections
    .filter(s => s.visible !== false)
    .map(s => document.getElementById(SEC_ID[s.slug] || s.slug))
    .filter(Boolean)
    .forEach(el => parent.insertBefore(el, footer));
  if (customContainer) parent.insertBefore(customContainer, footer);
}

// ─────────────────────────────────────────────────────────────
//  CUSTOM SECTIONS — non-builtin homepage_sections
// ─────────────────────────────────────────────────────────────
async function loadCustomSections() {
  const site = _site;
  if (!site?.homepage_sections) return;
  const BUILTIN = new Set(['home', 'client-work', 'photography', 'bts', 'about', 'electra-film']);
  const custom = site.homepage_sections.filter(s => !BUILTIN.has(s.slug) && s.visible !== false);
  if (!custom.length) return;
  const container = document.getElementById('custom-sections');
  if (!container) return;
  const pagesData = await fetch('data/pages.json').then(r => r.json()).catch(() => null);
  if (!pagesData) return;
  for (const sec of custom) {
    const page = pagesData.pages.find(p => p.slug === sec.slug);
    if (!page) continue;
    const sectionEl = document.createElement('section');
    sectionEl.id = sec.slug;
    sectionEl.className = 'section section-custom';
    sectionEl.style.cssText = 'opacity:0;transform:translateY(24px);transition:opacity 0.65s,transform 0.65s';
    const wrap = document.createElement('div');
    wrap.className = 'wrap';
    // Use the first info_box body as a subtitle in the masthead
    const infoBlock = (page.blocks || []).find(b => b.type === 'info_box');
    const subtitle = infoBlock?.body?.split('\n\n')[0] || '';
    wrap.innerHTML = `<div class="section-masthead" style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:24px">
      <div style="display:flex;align-items:baseline;gap:16px;margin-bottom:${subtitle ? '8px' : '0'}">
        <span class="section-name">${escapeHtml(sec.label || page.title)}</span>
      </div>
      ${subtitle ? `<p style="font-size:14px;color:var(--muted);line-height:1.6;max-width:640px">${escapeHtml(subtitle)}</p>` : ''}
    </div>`;
    for (const block of page.blocks || []) {
      const src = block.dataFile ? `data/${block.dataFile}.json` : `data/block-${block.id}.json`;
      if (block.type === 'info_box') {
        // Already used in masthead — skip standalone rendering
        continue;
      } else if (block.type === 'video_embed') {
        const div = document.createElement('div');
        div.className = 'video-embed';
        div.innerHTML = `<iframe src="https://www.youtube.com/embed/${block.youtubeId}" frameborder="0" allowfullscreen></iframe>`;
        wrap.appendChild(div);
      } else {
        const grid = document.createElement('div');
        grid.id = `custom-${block.id}`;
        grid.dataset.source = src;
        if (block.type === 'video_grid') { grid.className = 'video-grid'; wrap.appendChild(grid); renderVideoGrid(grid.id); }
        else if (block.type === 'photo_gallery') { grid.className = 'image-grid'; wrap.appendChild(grid); renderImageGrid(grid.id); }
        else if (block.type === 'client_grid') { grid.className = 'album-grid'; wrap.appendChild(grid); renderClientAlbums(grid.id); }
        else if (block.type === 'bts_gallery') { grid.className = 'masonry-gallery'; wrap.appendChild(grid); renderBTSGallery(grid.id, src); }
        else if (block.type === 'carousel') { grid.className = 'carousel'; wrap.appendChild(grid); renderCarousel(grid.id, src); }
      }
    }
    sectionEl.appendChild(wrap);
    container.appendChild(sectionEl);
    // Fade in
    requestAnimationFrame(() => { sectionEl.style.opacity = '1'; sectionEl.style.transform = 'translateY(0)'; });
  }
}

// ─────────────────────────────────────────────────────────────
//  VIDEO MODAL
// ─────────────────────────────────────────────────────────────
function loadPlayer(container, youtubeId, title = '') {
  container.innerHTML = `<iframe
    src="https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&autoplay=1"
    title="${escapeHtml(title)}" frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen></iframe>`;
}

function openVideoModal(youtubeId, title = '') {
  const modal = $('modal'); if (!modal) return;
  loadPlayer($('playerContainer'), youtubeId, title);
  const pl = $('playlist'); if (pl) pl.innerHTML = '';
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function openClientPlaylist(client) {
  const modal  = $('modal');      if (!modal) return;
  const player = $('playerContainer');
  const pl     = $('playlist');

  // Play first video
  const playable = (client.videos || []).filter(v => v.type !== 'category');
  const first    = playable[0];
  if (first) loadPlayer(player, first.youtubeId, first.title);
  else       player.innerHTML = '';

  // Render playlist
  if (pl && client.videos) {
    pl.innerHTML = client.videos.map(v => {
      if (v.type === 'category') return `<div class="playlist-category">${escapeHtml(v.label || '')}</div>`;
      return `<div class="playlist-card" data-yt="${v.youtubeId}" data-title="${escapeHtml(v.title)}">
        <div class="playlist-thumb">
          <img src="${v.thumb || `https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg`}" alt="${escapeHtml(v.title)}" loading="lazy">
          <span class="play">▶</span>
        </div>
        <div class="playlist-meta"><p class="playlist-title">${escapeHtml(v.title)}</p></div>
      </div>`;
    }).join('');

    pl.addEventListener('click', e => {
      const card = e.target.closest('.playlist-card'); if (!card) return;
      loadPlayer(player, card.dataset.yt, card.dataset.title);
      pl.querySelectorAll('.playlist-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
    pl.querySelector('.playlist-card')?.classList.add('active');
  }

  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

// Close modal / lightbox
document.addEventListener('DOMContentLoaded', () => {
  const modal = $('modal');
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target.dataset.close === 'modal' || e.target.classList.contains('modal-close')) {
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        const pc = $('playerContainer'); if (pc) pc.innerHTML = '';
      }
    });
  }

  const lb = $('lightbox');
  if (lb) {
    lb.addEventListener('click', e => {
      if (e.target.dataset.close === 'lightbox' || e.target.classList.contains('lightbox-close')) {
        closeLightbox();
      }
    });
  }
});

// Close on Escape, arrow keys for lightbox
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const modal = $('modal');
    if (modal && modal.getAttribute('aria-hidden') === 'false') {
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      const pc = $('playerContainer'); if (pc) pc.innerHTML = '';
    }
    const lb = $('lightbox');
    if (lb && lb.getAttribute('aria-hidden') === 'false') {
      closeLightbox();
    }
  }
  if ($('lightbox')?.getAttribute('aria-hidden') === 'false') {
    if (e.key === 'ArrowLeft')  lbNavigate(-1);
    if (e.key === 'ArrowRight') lbNavigate(1);
  }
});

// ─────────────────────────────────────────────────────────────
//  LIGHTBOX — navigable, view-transition grow-from-tile
// ─────────────────────────────────────────────────────────────

/**
 * Open the lightbox with a collection and starting index.
 * collection: array of {src, alt, caption, exif}
 * fromTileImg: optional <img> element to grow from (view-transition)
 */
function openLightboxAt(collection, index, fromTileImg) {
  const lb  = $('lightbox');
  const img = $('lightboxImg');
  const cap = $('lightboxCaption');
  if (!lb || !img) return;

  _lbItems = collection;
  _lbIndex = Math.max(0, Math.min(index, collection.length - 1));

  function applyFrame() {
    const item = _lbItems[_lbIndex];
    img.src = item.full || item.src || '';
    img.alt = item.alt || '';

    // Caption + EXIF
    const parts = [];
    if (item.caption) parts.push(`<span class="lb-caption-text">${escapeHtml(item.caption)}</span>`);
    if (item.exif)    parts.push(`<span class="lb-caption-exif">${escapeHtml(item.exif)}</span>`);
    if (cap) cap.innerHTML = parts.join('');

    // Arrow visibility
    const prev = $('lbPrev');
    const next = $('lbNext');
    if (prev) prev.style.visibility = _lbIndex > 0 ? 'visible' : 'hidden';
    if (next) next.style.visibility = _lbIndex < _lbItems.length - 1 ? 'visible' : 'hidden';
  }

  function doOpen() {
    applyFrame();
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  if (fromTileImg && document.startViewTransition) {
    fromTileImg.style.viewTransitionName = 'lb';
    img.style.viewTransitionName = '';
    const t = document.startViewTransition(() => {
      fromTileImg.style.viewTransitionName = '';
      img.style.viewTransitionName = 'lb';
      doOpen();
    });
    t.finished.then(() => { img.style.viewTransitionName = ''; });
  } else {
    doOpen();
  }
}

/** Legacy single-src open (used by renderImageGrid etc.) */
function openLightbox(src, alt) {
  openLightboxAt([{ src, alt: alt || '', caption: '', exif: '' }], 0);
}

/** Open a direct video file in a lightbox-like overlay */
function openLightboxVideo(src, caption) {
  const lb  = $('lightbox');
  const img = $('lightboxImg');
  const cap = $('lightboxCaption');
  if (!lb) return;
  _lbItems = [];
  // Swap img for video temporarily
  if (img) {
    img.src = '';
    img.style.display = 'none';
  }
  let vid = lb.querySelector('.lb-video');
  if (!vid) {
    vid = document.createElement('video');
    vid.className = 'lb-video';
    vid.controls = true;
    vid.autoplay = true;
    lb.querySelector('.lightbox-figure').insertBefore(vid, cap);
  }
  vid.src = src;
  vid.style.display = 'block';
  if (cap) cap.textContent = caption || '';
  lb.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lb  = $('lightbox');
  const img = $('lightboxImg');
  if (!lb) return;
  lb.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  // Clean up any video
  const vid = lb.querySelector('.lb-video');
  if (vid) { vid.pause(); vid.src = ''; vid.style.display = 'none'; }
  if (img) img.style.display = '';
  _lbItems = [];
  _lbIndex = 0;
}

function lbNavigate(delta) {
  if (!_lbItems.length) return;
  _lbIndex = Math.max(0, Math.min(_lbIndex + delta, _lbItems.length - 1));
  const item = _lbItems[_lbIndex];
  const img  = $('lightboxImg');
  const cap  = $('lightboxCaption');
  if (img) { img.src = item.full || item.src || ''; img.alt = item.alt || ''; }
  const parts = [];
  if (item.caption) parts.push(`<span class="lb-caption-text">${escapeHtml(item.caption)}</span>`);
  if (item.exif)    parts.push(`<span class="lb-caption-exif">${escapeHtml(item.exif)}</span>`);
  if (cap) cap.innerHTML = parts.join('');
  const prev = $('lbPrev');
  const next = $('lbNext');
  if (prev) prev.style.visibility = _lbIndex > 0 ? 'visible' : 'hidden';
  if (next) next.style.visibility = _lbIndex < _lbItems.length - 1 ? 'visible' : 'hidden';
}

// Wire up lightbox arrows + keyboard nav
document.addEventListener('DOMContentLoaded', () => {
  const lbPrev = $('lbPrev');
  const lbNext = $('lbNext');
  if (lbPrev) lbPrev.addEventListener('click', () => lbNavigate(-1));
  if (lbNext) lbNext.addEventListener('click', () => lbNavigate(1));
});

// ─────────────────────────────────────────────────────────────
//  IMAGE / BTS / CAROUSEL (sub-pages)
// ─────────────────────────────────────────────────────────────
async function renderVideoGrid(containerId) {
  const el = $(containerId); if (!el) return;
  const path = el.getAttribute('data-source');
  const data = await fetch(path).then(r => r.json()).catch(() => ({ videos: [] }));
  const tpl = (v, i) => `
    <article class="card${v.layout === 'full' ? ' card--full' : v.layout === 'half' ? ' card--half' : ''}" data-yt="${v.youtubeId}" style="animation-delay:${i * 60}ms">
      <div class="thumb">
        <img src="${v.thumb || `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`}" alt="${escapeHtml(v.title)}" loading="lazy">
        <span class="play" aria-hidden="true">▶</span>
      </div>
      <div class="meta"><h3 class="title">${escapeHtml(v.title)}</h3>${v.sub ? `<p class="sub">${escapeHtml(v.sub)}</p>` : ''}</div>
    </article>`;
  el.innerHTML = data.videos.map(tpl).join('');
  el.addEventListener('click', e => {
    const card = e.target.closest('.card'); if (!card) return;
    openVideoModal(card.dataset.yt, card.querySelector('.title')?.textContent || '');
  });
}

async function renderClientAlbums(containerId) {
  const el = $(containerId); if (!el) return;
  const path = el.getAttribute('data-source');
  const data = await fetch(path).then(r => r.json()).catch(() => ({ clients: [] }));
  const tpl = (c, i) => `
    <article class="card album" data-client='${JSON.stringify(c).replaceAll("'", "&apos;")}' style="animation-delay:${i * 60}ms">
      <div class="thumb">
        ${c.cover ? `<img src="${c.cover}" alt="${escapeHtml(c.name)}" loading="lazy">` : ''}
        ${c.logo ? `<img class="album-logo" src="${c.logo}" alt="${escapeHtml(c.name)} logo" onerror="this.style.display='none'">` : ''}
        <span class="play" aria-hidden="true">▶</span>
      </div>
      <div class="meta"><h3 class="title">${escapeHtml(c.name)}</h3>${c.blurb ? `<p class="sub">${escapeHtml(c.blurb)}</p>` : ''}</div>
    </article>`;
  el.innerHTML = data.clients.map(tpl).join('');
  el.addEventListener('click', e => {
    const card = e.target.closest('.album'); if (!card) return;
    openClientPlaylist(JSON.parse(card.dataset.client.replaceAll('&apos;', "'")));
  });
}

async function renderImageGrid(containerId) {
  const el = $(containerId); if (!el) return;
  const path = el.getAttribute('data-source');
  const data = await fetch(path).then(r => r.json()).catch(() => ({ images: [] }));
  el.innerHTML = data.images.map((item, i) => {
    // Handle both legacy string paths and optimised {src, srcset, w, h} objects
    const src    = typeof item === 'string' ? item : item.src;
    const alt    = typeof item === 'object' && item.alt ? escapeHtml(item.alt) : '';
    const ratio  = item?.w && item?.h ? ` style="aspect-ratio:${item.w}/${item.h}"` : '';
    const srcset = item?.srcset
      ? ` srcset="${item.srcset}" sizes="(max-width:600px) 50vw, (max-width:900px) 33vw, 25vw"`
      : '';
    return `<figure class="card" style="animation-delay:${i * 40}ms">
      <div class="thumb"${ratio}><img src="${escapeHtml(src)}"${srcset} alt="${alt}" loading="lazy"></div>
    </figure>`;
  }).join('');
  el.addEventListener('click', e => {
    const img = e.target.closest('img'); if (!img) return;
    openLightbox(img.src);
  });
}

async function renderBTSGallery(containerId, srcPath) {
  const el  = $(containerId); if (!el) return;
  const src = srcPath || el.getAttribute('data-source');
  const items = await fetch(src).then(r => r.json()).catch(() => []);
  el.innerHTML = items.map((item, i) => `
    <figure class="masonry-item" style="animation-delay:${i * 70}ms">
      <img src="${item.src}" alt="${escapeHtml(item.alt || '')}" loading="lazy">
      ${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ''}
    </figure>`).join('');
  el.querySelectorAll('img').forEach(img => {
    img.addEventListener('click', () => openLightbox(img.src));
  });
}

async function renderCarousel(containerId, srcPath) {
  const el  = $(containerId); if (!el) return;
  const src = srcPath || el.getAttribute('data-source');
  const raw    = await fetch(src).then(r => r.json()).catch(() => ({}));
  const images = raw.images || (Array.isArray(raw) ? raw : []);
  if (!images.length) { el.innerHTML = '<p style="color:var(--muted);padding:1em">No images yet</p>'; return; }
  el.innerHTML = `
    <button class="carousel-btn prev" aria-label="Previous">‹</button>
    <div class="carousel-track">${images.map(s => `<img src="${s}" alt="" loading="lazy">`).join('')}</div>
    <button class="carousel-btn next" aria-label="Next">›</button>`;
  let idx = 0;
  const track = el.querySelector('.carousel-track');
  const total = images.length;
  function goTo(n) { idx = ((n % total) + total) % total; track.style.transform = `translateX(-${idx * 100}%)`; }
  el.querySelector('.prev').addEventListener('click', () => goTo(idx - 1));
  el.querySelector('.next').addEventListener('click', () => goTo(idx + 1));
}

// ─────────────────────────────────────────────────────────────
//  SUB-PAGE GENERIC INIT (about.html, photography.html, etc.)
// ─────────────────────────────────────────────────────────────
async function initPage() {
  const container = $('page-content');
  if (!container) return;
  const slug      = container.dataset.slug;
  const pagesData = await fetch('data/pages.json').then(r => r.json()).catch(() => null);
  if (!pagesData) return;
  const page = pagesData.pages.find(p => p.slug === slug);
  if (!page) return;

  for (const block of (page.blocks || [])) {
    const src = block.dataFile ? `data/${block.dataFile}.json` : `data/block-${block.id}.json`;
    const sec = document.createElement('section');
    sec.id = `block-${block.id}`;

    if (block.type === 'info_box') {
      if (block.image) {
        sec.className = 'about';
        const mediaDiv = document.createElement('div'); mediaDiv.className = 'about-media';
        const portrait = document.createElement('img'); portrait.src = block.image; portrait.alt = block.heading || '';
        mediaDiv.appendChild(portrait); sec.appendChild(mediaDiv);
        const copyDiv = document.createElement('div'); copyDiv.className = 'about-copy';
        if (block.heading) { const h1 = document.createElement('h1'); h1.textContent = block.heading; copyDiv.appendChild(h1); }
        (block.body || '').split('\n\n').filter(Boolean).forEach(para => { const p = document.createElement('p'); p.textContent = para; copyDiv.appendChild(p); });
        if (block.skills && block.skills.length) {
          const h2 = document.createElement('h2'); h2.textContent = 'Skills & Tools'; copyDiv.appendChild(h2);
          const ul = document.createElement('ul'); ul.className = 'badge-list';
          block.skills.forEach(s => { const li = document.createElement('li'); li.textContent = s; ul.appendChild(li); });
          copyDiv.appendChild(ul);
        }
        sec.appendChild(copyDiv);
      } else {
        sec.className = 'section-sp';
        if (block.heading) { const h1 = document.createElement('h1'); h1.className = 'section-title'; h1.textContent = block.heading; sec.appendChild(h1); }
        (block.body || '').split('\n\n').filter(Boolean).forEach(para => { const p = document.createElement('p'); p.textContent = para; sec.appendChild(p); });
      }
      container.appendChild(sec); continue;
    }

    if (block.type === 'video_embed') {
      sec.className = 'section-sp';
      if (block.label) { const h2 = document.createElement('h2'); h2.className = 'section-title'; h2.textContent = block.label; sec.appendChild(h2); }
      const wrap = document.createElement('div'); wrap.className = 'video-embed';
      wrap.innerHTML = `<iframe src="https://www.youtube.com/embed/${block.youtubeId}" title="${escapeHtml(block.label || '')}" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe>`;
      sec.appendChild(wrap); container.appendChild(sec); continue;
    }

    sec.className = 'section-sp';
    if (block.label) { const h2 = document.createElement('h2'); h2.className = 'section-title'; h2.textContent = block.label; sec.appendChild(h2); }
    const grid = document.createElement('div');
    grid.id = `grid-${block.id}`;
    grid.dataset.source = src;

    if (block.type === 'video_grid') {
      grid.className = 'video-grid'; sec.appendChild(grid); container.appendChild(sec); renderVideoGrid(grid.id);
    } else if (block.type === 'client_grid') {
      grid.className = 'album-grid'; sec.appendChild(grid); container.appendChild(sec); renderClientAlbums(grid.id);
    } else if (block.type === 'photo_gallery') {
      grid.className = 'image-grid'; sec.appendChild(grid); container.appendChild(sec); renderImageGrid(grid.id);
    } else if (block.type === 'bts_gallery') {
      grid.className = 'masonry-gallery'; sec.appendChild(grid); container.appendChild(sec); renderBTSGallery(grid.id, src);
    } else if (block.type === 'carousel') {
      grid.className = 'carousel'; sec.appendChild(grid); container.appendChild(sec); renderCarousel(grid.id, src);
    }
  }
}

// ─────────────────────────────────────────────────────────────
//  BOOT
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Year
  const yr = $('year'); if (yr) yr.textContent = new Date().getFullYear();

  // Smooth scroll (all pages)
  initSmoothScroll();

  // Detect which page we're on
  const isSinglePage = !!document.getElementById('work-feature');
  const isSubPage    = !!document.getElementById('page-content');

  if (isSinglePage) {
    // Home — single page
    initNav();
    initReveal();
    await loadSiteSettings();
    await Promise.all([loadWork(), loadClients(), loadElectra(), loadPhotography(), loadBTS(), loadAbout(), loadCustomSections()]);
    reorderSections();
  } else if (isSubPage) {
    // Sub-page (about.html, photography.html, etc.)
    initPage();
    // Sub-page mobile nav
    const toggle  = $('navToggle');
    const siteNav = $('siteNav');
    if (toggle && siteNav) {
      toggle.addEventListener('click', () => {
        const open = siteNav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
  }
});

// ─────────────────────────────────────────────────────────────
//  COLOUR TORCH — cursor-following colour reveal inside tiles.
//  A colour clone of the tile image is masked to a circle that
//  tracks the pointer; the greyscale base stays put beneath it.
// ─────────────────────────────────────────────────────────────
const TORCH_SEL = '.work-tile, .work-player-stage, .photo-tile, .bts-tile, .electra-still-tile, .electra-poster-tile, .archive-thumb';

function initTorch() {
  if (window.matchMedia('(hover: none)').matches) return;

  document.addEventListener('pointerover', (e) => {
    const tile = e.target.closest(TORCH_SEL);
    if (!tile || tile.dataset.torch) return;
    const img = tile.querySelector('img');
    if (!img || !img.src || img.classList.contains('torch-layer')) return;
    tile.dataset.torch = '1';
    const layer = img.cloneNode();
    layer.classList.add('torch-layer');
    layer.removeAttribute('id');
    layer.setAttribute('alt', '');
    layer.setAttribute('aria-hidden', 'true');
    layer.loading = 'eager';
    // pin the layer to the source image's box within the tile
    const place = () => {
      layer.style.left   = img.offsetLeft + 'px';
      layer.style.top    = img.offsetTop + 'px';
      layer.style.width  = img.offsetWidth + 'px';
      layer.style.height = img.offsetHeight + 'px';
    };
    place();
    tile.appendChild(layer);
    tile._torchPlace = place;
  }, { passive: true });

  document.addEventListener('pointermove', (e) => {
    const tile = e.target.closest(TORCH_SEL);
    if (!tile || !tile.dataset.torch) return;
    const r = tile.getBoundingClientRect();
    tile.style.setProperty('--tx', (e.clientX - r.left) + 'px');
    tile.style.setProperty('--ty', (e.clientY - r.top) + 'px');
  }, { passive: true });
}

// ─────────────────────────────────────────────────────────────
//  WORDMARK SCRAMBLE — one-shot resolve on load
// ─────────────────────────────────────────────────────────────
function initScramble() {
  const el = document.querySelector('.nav-logo');
  if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const FINAL = el.textContent;
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#/\\|=+*';
  const start = performance.now(), DUR = 750;
  function tick(now) {
    const p = Math.min(1, (now - start) / DUR);
    const settled = Math.floor(p * FINAL.length);
    let out = FINAL.slice(0, settled);
    for (let i = settled; i < FINAL.length; i++) {
      out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    if (p < 1) requestAnimationFrame(tick); else el.textContent = FINAL;
  }
  requestAnimationFrame(tick);
}

initTorch();
// initScramble() retired: the nav no longer carries a wordmark
