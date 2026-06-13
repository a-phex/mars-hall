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
      const el = document.getElementById(SEC_SLUG_TO_ID[sec.slug] || sec.slug);
      if (el) el.style.display = 'none';
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

  // Count badge
  const countEl = $('work-count');
  if (countEl) countEl.textContent = videos.length + ' film' + (videos.length !== 1 ? 's' : '');

  if (!videos.length) return;

  const stageEl  = $('work-stage');
  const annoEl   = $('work-anno');
  const bankEl   = $('work-sidebar');
  if (!stageEl || !annoEl || !bankEl) return;

  let activeIdx = 0;
  let activeTile = null;

  // ── Annotation updater
  function setAnno(v) {
    annoEl.innerHTML =
      `<span class="work-anno-title">${escapeHtml(v.title)}</span>` +
      (v.sub ? `<span class="work-anno-sep"> · </span><span class="work-anno-sub">${escapeHtml(v.sub)}</span>` : '');
  }

  // ── Load player (iframe autoplay) into stage
  function loadPlayer(v) {
    stageEl.innerHTML =
      `<iframe src="https://www.youtube-nocookie.com/embed/${escapeHtml(v.youtubeId)}?autoplay=1&rel=0"` +
      ` title="${escapeHtml(v.title)}" frameborder="0"` +
      ` allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"` +
      ` allowfullscreen></iframe>`;
    setAnno(v);
  }

  // ── Show poster (first load or on tile click before play)
  function showPoster(v) {
    const hq  = `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`;
    const max = `https://img.youtube.com/vi/${v.youtubeId}/maxresdefault.jpg`;
    stageEl.innerHTML =
      `<img class="work-poster" src="${max}" width="1280" height="720" alt="${escapeHtml(v.title)}" loading="eager"` +
      ` onerror="this.src='${hq}'" onload="if(this.naturalWidth<320&&this.src!=='${hq}')this.src='${hq}'">` +
      `<button class="work-poster-play" aria-label="Play ${escapeHtml(v.title)}">` +
        `<span class="work-play-icon" aria-hidden="true">&#9654;</span>` +
      `</button>`;
    stageEl.querySelector('.work-poster-play').addEventListener('click', () => loadPlayer(v));
    setAnno(v);
  }

  // ── Scroll player into view only if fully out of viewport
  function maybeScrollToPlayer() {
    const rect = stageEl.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      smoothScrollTo(stageEl, 600);
    }
  }

  // ── Activate a tile
  function activateTile(tile, v) {
    if (activeTile) activeTile.classList.remove('work-tile--active');
    tile.classList.add('work-tile--active');
    activeTile = tile;
    loadPlayer(v);
    maybeScrollToPlayer();
  }

  // ── Render poster for first video
  showPoster(videos[0]);

  // ── Build the bank
  bankEl.innerHTML = videos.map((v, i) => {
    const thumb = v.thumb || `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`;
    return `<div class="work-tile${i === 0 ? ' work-tile--active' : ''}" data-idx="${i}" role="button" tabindex="0"` +
      ` aria-label="${escapeHtml(v.title)}">` +
      `<div class="work-tile-img-wrap">` +
        `<img class="work-tile-img" src="${thumb}" width="320" height="180" alt="${escapeHtml(v.title)}" loading="lazy">` +
      `</div>` +
      `<div class="work-tile-meta">` +
        `<div class="work-tile-title">${escapeHtml(v.title)}</div>` +
        (v.sub ? `<div class="work-tile-sub">${escapeHtml(v.sub)}</div>` : '') +
      `</div>` +
    `</div>`;
  }).join('');

  // Cache tile references
  const tiles = bankEl.querySelectorAll('.work-tile');
  activeTile = tiles[0] || null;

  // ── Living thumbnails
  const YT_FRAMES = ['mq1.jpg', 'mq2.jpg', 'mq3.jpg'];
  tiles.forEach((tile, i) => {
    const v   = videos[i];
    const img = tile.querySelector('.work-tile-img');
    const hq  = v.thumb || `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`;
    let cycleTimer = null;

    tile.addEventListener('mouseenter', () => {
      let frame = 0;
      cycleTimer = setInterval(() => {
        frame = (frame + 1) % YT_FRAMES.length;
        img.src = `https://img.youtube.com/vi/${v.youtubeId}/${YT_FRAMES[frame]}`;
      }, 600);
    });

    tile.addEventListener('mouseleave', () => {
      clearInterval(cycleTimer);
      cycleTimer = null;
      img.src = hq;
    });

    // Click / keyboard activation
    function handleActivate() {
      if (tile.classList.contains('work-tile--active')) return;
      activateTile(tile, v);
    }
    tile.addEventListener('click', handleActivate);
    tile.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleActivate(); } });
  });
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

  // Find the electra-film page
  const page = pagesData?.pages?.find(p => p.slug === 'electra-film');

  // Extract youtubeId from a video_embed block
  const videoBlock = (page?.blocks || []).find(b => b.type === 'video_embed');
  const youtubeId  = videoBlock?.youtubeId || '';

  // Poster image: from info_box block image field
  const infoBlock  = (page?.blocks || []).find(b => b.type === 'info_box');
  const posterSrc  = infoBlock?.image || '';
  const bodyText   = infoBlock?.body?.split('\n\n')[0] || '';

  // Stills — up to 4
  const stills = (stillsData.images || []).slice(0, 4);
  const allStillItems = (stillsData.images || []).map(s => ({ src: s, alt: 'Electra still', caption: '', exif: '' }));

  // Build LEFT: poster tile
  const posterDiv = document.createElement('div');
  posterDiv.className = 'electra-poster-tile';
  if (posterSrc) {
    posterDiv.innerHTML = `<img src="${escapeHtml(posterSrc)}" alt="Electra" loading="lazy">`;
  }
  posterDiv.setAttribute('role', 'button');
  posterDiv.setAttribute('tabindex', '0');
  posterDiv.setAttribute('aria-label', 'Play Electra');

  // Click poster: swap to iframe if youtubeId, else open lightbox
  function activatePoster() {
    if (youtubeId) {
      posterDiv.innerHTML =
        `<iframe src="https://www.youtube-nocookie.com/embed/${escapeHtml(youtubeId)}?autoplay=1&rel=0"` +
        ` title="Electra" frameborder="0"` +
        ` allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"` +
        ` allowfullscreen></iframe>`;
      posterDiv.classList.add('electra-poster-tile--playing');
    } else if (allStillItems.length && typeof openLightboxAt === 'function') {
      openLightboxAt(allStillItems, 0);
    }
  }
  posterDiv.addEventListener('click', activatePoster);
  posterDiv.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activatePoster(); } });

  // Build RIGHT: copy + stills strip
  const copyDiv = document.createElement('div');
  copyDiv.className = 'electra-copy';
  const blurb = bodyText || 'Written, shot and cut as personal work. Direction, camera, stills and design in one project.';
  copyDiv.innerHTML =
    `<h2 class="electra-heading">A short film.</h2>` +
    `<p class="electra-body">${escapeHtml(blurb)}</p>`;

  if (stills.length) {
    const strip = document.createElement('div');
    strip.className = 'electra-stills-strip';
    stills.forEach((src, si) => {
      const tile = document.createElement('div');
      tile.className = 'electra-still-tile';
      tile.innerHTML = `<img src="${escapeHtml(src)}" alt="Electra still ${si + 1}" loading="lazy">`;
      tile.addEventListener('click', () => {
        if (typeof openLightboxAt === 'function') {
          openLightboxAt(allStillItems, si);
        }
      });
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

  const cols   = [masonry.querySelector('#photo-col-0'), masonry.querySelector('#photo-col-1'), masonry.querySelector('#photo-col-2')];
  const hidden = [];

  allImages.forEach((norm, i) => {
    const tile = buildPhotoTile(norm, i, allImages);
    if (i >= photoCount) {
      tile.classList.add('photo-tile--hidden');
      hidden.push(tile);
    }
    cols[i % 3].appendChild(tile);
  });

  // View-more button
  const btn = $('photo-more-btn');
  if (btn && hidden.length) {
    btn.removeAttribute('hidden');
    let expanded = false;
    btn.addEventListener('click', () => {
      expanded = !expanded;
      hidden.forEach(t => {
        if (expanded) {
          t.classList.remove('photo-tile--hidden');
          t.classList.add('photo-tile--entering');
          // remove entering class after transition
          t.addEventListener('transitionend', () => t.classList.remove('photo-tile--entering'), { once: true });
        } else {
          t.classList.add('photo-tile--hidden');
        }
      });
      btn.textContent = expanded ? 'View fewer' : 'View more';
    });
  } else if (btn) {
    btn.setAttribute('hidden', '');
  }
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
  const BTS_PREVIEW = 10;

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

  const hidden = [];

  items.forEach((item, i) => {
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

    if (i >= BTS_PREVIEW) {
      tile.classList.add('photo-tile--hidden');
      hidden.push(tile);
    }
    grid.appendChild(tile);
  });

  // View-more button
  const btn = $('bts-more-btn');
  if (btn && hidden.length) {
    btn.removeAttribute('hidden');
    let expanded = false;
    btn.addEventListener('click', () => {
      expanded = !expanded;
      hidden.forEach(t => {
        if (expanded) {
          t.classList.remove('photo-tile--hidden');
          t.classList.add('photo-tile--entering');
          t.addEventListener('transitionend', () => t.classList.remove('photo-tile--entering'), { once: true });
        } else {
          t.classList.add('photo-tile--hidden');
        }
      });
      btn.textContent = expanded ? 'View fewer' : 'View more';
    });
  } else if (btn) {
    btn.setAttribute('hidden', '');
  }
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

  const paragraphs = (block.body || '').split('\n\n').filter(Boolean);
  const skills     = block.skills || [];
  const linkedin   = _site?.social?.linkedin || 'https://www.linkedin.com/in/ash-marshall-b7725bb9';

  // LEFT: portrait + name + title + skills chips
  const leftCol = document.createElement('div');
  leftCol.className = 'about-left';

  if (block.image) {
    const portraitWrap = document.createElement('div');
    portraitWrap.className = 'about-portrait-tile';
    portraitWrap.innerHTML = `<img src="${escapeHtml(block.image)}" alt="${escapeHtml(block.heading || 'Ash Marshall')}" loading="lazy">`;
    leftCol.appendChild(portraitWrap);
  }

  const nameEl = document.createElement('div');
  nameEl.className = 'about-name';
  nameEl.textContent = 'Marshall';
  leftCol.appendChild(nameEl);

  const titleEl = document.createElement('div');
  titleEl.className = 'about-title-line';
  titleEl.textContent = 'Multimedia Creative · London';
  leftCol.appendChild(titleEl);

  if (skills.length) {
    const chipsWrap = document.createElement('div');
    chipsWrap.className = 'about-chips';
    skills.forEach(s => {
      const chip = document.createElement('span');
      chip.className = 'about-chip';
      chip.textContent = s;
      chipsWrap.appendChild(chip);
    });
    leftCol.appendChild(chipsWrap);
  }

  // RIGHT: blurb paragraphs + contact
  const rightCol = document.createElement('div');
  rightCol.className = 'about-right';

  const bodyDiv = document.createElement('div');
  bodyDiv.className = 'about-body-text';
  bodyDiv.innerHTML = paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('');
  rightCol.appendChild(bodyDiv);

  const contactDiv = document.createElement('div');
  contactDiv.className = 'about-contact';
  contactDiv.innerHTML =
    `<span class="about-contact-label">say hello</span>` +
    `<a class="about-contact-link" href="${escapeHtml(linkedin)}" target="_blank" rel="noreferrer noopener">LinkedIn ↗</a>`;
  rightCol.appendChild(contactDiv);

  el.appendChild(leftCol);
  el.appendChild(rightCol);
  el.classList.add('about-grid-new');
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
  const BUILTIN = new Set(['home', 'client-work', 'photography', 'bts', 'about']);
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
//  HOME NETWORK PROBE — publisher edit button + hub link
// ─────────────────────────────────────────────────────────────
(function () {
  const LAUNCHER  = 'http://192.168.0.21:5050';
  const PUBLISHER = 'http://192.168.0.21:5241';

  // Nav hub link (home-only)
  const navList = document.getElementById('navList');
  if (navList) {
    const li = document.createElement('li');
    li.id = 'hub-nav-item';
    li.style.display = 'none';
    li.innerHTML = `<a href="${LAUNCHER}" target="_blank" rel="noopener" class="hub-link">⌂ Home Hub</a>`;
    navList.appendChild(li);
  }

  // Edit pencil button
  const editBtn = document.createElement('a');
  editBtn.id = 'edit-btn';
  editBtn.href = PUBLISHER;
  editBtn.target = '_blank';
  editBtn.rel = 'noopener';
  editBtn.title = 'Portfolio Publisher';
  editBtn.textContent = '✏️';
  document.body.appendChild(editBtn);

  const probe = new Image();
  probe.onload = () => {
    const li = document.getElementById('hub-nav-item');
    if (li) li.style.display = '';
    editBtn.classList.add('visible');
  };
  probe.src = LAUNCHER + '/static/icons/meal_planner.svg?_=' + Date.now();
  setTimeout(() => { probe.src = ''; }, 3000);
}());

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
initScramble();
