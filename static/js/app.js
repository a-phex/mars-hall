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

  // Email — update text + href on all email links
  const email = s.contact?.email;
  if (email) {
    document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
      a.href = 'mailto:' + email;
    });
    const topbarEmail = $('topbar-email');
    if (topbarEmail) topbarEmail.textContent = email;
    const footerEmail = $('footer-email');
    if (footerEmail) footerEmail.textContent = email;
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
  if (s.social?.linkedin) {
    document.querySelectorAll('a[href*="linkedin.com"]').forEach(a => { a.href = s.social.linkedin; });
  }

  // Section visibility - check homepage_sections first, then fall back to show_* flags
  const secs = s.homepage_sections || [];
  const getVis = (slug, showKey) => {
    const hpSec = secs.find(x => x.slug === slug);
    if (hpSec && hpSec.visible === false) return false;
    if (s.sections && s.sections[showKey] === false) return false;
    return true;
  };
  if (!getVis('client-work', 'show_clients'))    { const el = document.getElementById('clients');     if (el) el.style.display = 'none'; }
  if (!getVis('photography', 'show_photography')) { const el = document.getElementById('photography'); if (el) el.style.display = 'none'; }
  if (!getVis('about', 'show_about'))             { const el = document.getElementById('about');       if (el) el.style.display = 'none'; }
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
  const spySections = ['work', 'clients', 'photography', 'about'].map(id => ({
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
    '.section-work, .section-clients, .section-photography, .section-about'
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
//  WORK SECTION — featured video + sidebar list
// ─────────────────────────────────────────────────────────────
async function loadWork() {
  const data   = await fetch('data/videos.json').then(r => r.json()).catch(() => ({ videos: [] }));
  const videos = data.videos || [];

  // Count badge
  const countEl = $('work-count');
  if (countEl) countEl.textContent = videos.length + ' project' + (videos.length !== 1 ? 's' : '');

  // Featured = first layout:'full' or fallback first video
  const featIdx  = videos.findIndex(v => v.layout === 'full');
  const featured = featIdx >= 0 ? videos[featIdx] : videos[0];
  const rest     = videos.filter(v => v !== featured);

  // ── Feature card
  const featureEl = $('work-feature');
  if (featureEl && featured) {
    const thumb = featured.thumb || `https://img.youtube.com/vi/${featured.youtubeId}/maxresdefault.jpg`;
    featureEl.innerHTML = `
      <div class="feature-card" data-yt="${featured.youtubeId}" data-title="${escapeHtml(featured.title)}">
        <div class="feature-thumb">
          <img src="${thumb}" alt="${escapeHtml(featured.title)}" loading="eager">
          <div class="feature-play"><div class="play-circle">▶</div></div>
          <span class="feature-tag">Featured</span>
        </div>
        <div class="feature-info">
          <span class="feature-num">01</span>
          <h2 class="feature-title">${escapeHtml(featured.title)}</h2>
          ${featured.sub ? `<p class="feature-meta">${escapeHtml(featured.sub)}</p>` : ''}
        </div>
      </div>`;
    featureEl.querySelector('.feature-card').addEventListener('click', () => {
      openVideoModal(featured.youtubeId, featured.title);
    });
  }

  // ── Sidebar list
  const sidebarEl = $('work-sidebar');
  if (sidebarEl && rest.length) {
    sidebarEl.innerHTML = rest.map((v, i) => {
      const thumb = v.thumb || `https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg`;
      const num   = String(i + 2).padStart(2, '0');
      return `
        <div class="sidebar-item" data-yt="${v.youtubeId}" data-title="${escapeHtml(v.title)}">
          <div class="sidebar-thumb">
            <img src="${thumb}" alt="${escapeHtml(v.title)}" loading="lazy">
            <span class="sidebar-play">▶</span>
          </div>
          <div class="sidebar-info">
            <span class="sidebar-num">${num}</span>
            <h3 class="sidebar-title">${escapeHtml(v.title)}</h3>
            ${v.sub ? `<p class="sidebar-meta">${escapeHtml(v.sub)}</p>` : ''}
          </div>
        </div>`;
    }).join('');

    sidebarEl.addEventListener('click', e => {
      const item = e.target.closest('.sidebar-item');
      if (item) openVideoModal(item.dataset.yt, item.dataset.title);
    });
  } else if (sidebarEl) {
    sidebarEl.innerHTML = '';
  }
}

// ─────────────────────────────────────────────────────────────
//  CLIENT WORK SECTION
// ─────────────────────────────────────────────────────────────
async function loadClients() {
  const el = $('client-grid');
  if (!el) return;
  const data    = await fetch('data/clients.json').then(r => r.json()).catch(() => ({ clients: [] }));
  const clients = data.clients || [];

  if (!clients.length) {
    el.closest('.section-clients').style.display = 'none';
    return;
  }

  el.innerHTML = clients.map((c, i) => `
    <div class="album-card" data-client='${JSON.stringify(c).replaceAll("'", "&apos;")}' style="animation-delay:${i * 60}ms">
      <div class="album-thumb">
        ${c.cover ? `<img src="${c.cover}" alt="${escapeHtml(c.name)}" loading="lazy">` : ''}
        ${c.logo ? `<img class="album-logo" src="${c.logo}" alt="${escapeHtml(c.name)} logo" onerror="this.style.display='none'">` : ''}
        <div class="album-play"><div class="play-circle" style="width:44px;height:44px;font-size:14px">▶</div></div>
      </div>
      <div class="album-info">
        <div class="album-name">${escapeHtml(c.name)}</div>
        ${c.blurb ? `<p class="album-blurb">${escapeHtml(c.blurb)}</p>` : ''}
      </div>
    </div>`).join('');

  el.addEventListener('click', e => {
    const card = e.target.closest('.album-card');
    if (!card) return;
    const client = JSON.parse(card.dataset.client.replaceAll('&apos;', "'"));
    openClientPlaylist(client);
  });
}

// ─────────────────────────────────────────────────────────────
//  PHOTOGRAPHY STRIP
// ─────────────────────────────────────────────────────────────
async function loadPhotography() {
  const el = $('photo-strip');
  if (!el) return;
  const data      = await fetch('data/photos.json').then(r => r.json()).catch(() => ({ images: [] }));
  const allImages = data.images || [];
  const photoCount = _site?.sections?.photography_count || 16;
  const preview   = allImages.slice(0, photoCount);

  if (!preview.length) {
    el.closest('.section-photography').style.display = 'none';
    return;
  }

  el.innerHTML = preview.map(src => `
    <div class="photo-tile">
      <img src="${src}" alt="" loading="lazy">
    </div>`).join('');

  el.addEventListener('click', e => {
    const tile = e.target.closest('.photo-tile');
    if (!tile) return;
    openLightbox(tile.querySelector('img').src);
  });

  // Expand button
  const expandBtn = document.createElement('button');
  expandBtn.className = 'photo-expand-btn';
  expandBtn.textContent = `See all ${allImages.length} photos`;
  expandBtn.addEventListener('click', () => openPhotoModal(allImages));
  el.closest('.photo-strip-wrap').appendChild(expandBtn);
}

function openPhotoModal(images) {
  let modal = $('photo-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'photo-modal';
    modal.className = 'photo-modal';
    modal.innerHTML = `
      <div class="photo-modal-bar">
        <span class="photo-modal-count"></span>
        <button class="photo-modal-close" onclick="closePhotoModal()">Collapse ↑</button>
      </div>
      <div class="photo-modal-grid" id="photo-modal-grid"></div>`;
    document.body.appendChild(modal);
  }
  modal.querySelector('.photo-modal-count').textContent = `${images.length} photos`;
  modal.querySelector('#photo-modal-grid').innerHTML = images.map(src => `
    <div class="photo-tile">
      <img src="${src}" alt="" loading="lazy">
    </div>`).join('');
  modal.querySelector('#photo-modal-grid').addEventListener('click', e => {
    const tile = e.target.closest('.photo-tile');
    if (tile) openLightbox(tile.querySelector('img').src);
  });
  modal.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
  modal.scrollTop = 0;
}

function closePhotoModal() {
  const modal = $('photo-modal');
  if (modal) modal.setAttribute('hidden', '');
  document.body.style.overflow = '';
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

  const aboutHeadline = _site?.about?.headline || 'Based in London,<br>working everywhere.';
  const stats = block.stats || [];
  el.innerHTML = `
    <div class="about-grid">
      <div class="about-portrait-wrap">
        <div class="about-portrait-frame">
          <div class="about-portrait">
            ${block.image ? `<img src="${block.image}" alt="${escapeHtml(block.heading || 'Ash Marshall')}">` : ''}
          </div>
        </div>
        <div class="about-portrait-caption">
          <div class="about-portrait-caption-line"></div>
          <span class="about-portrait-label">On set, 2024</span>
          <div class="about-portrait-caption-line"></div>
        </div>
        ${stats.length ? `
        <div class="about-stats">
          ${stats.map(s => `
          <div class="about-stat">
            <span class="about-stat-value">${escapeHtml(s.value)}</span>
            <span class="about-stat-label">${escapeHtml(s.label)}</span>
          </div>`).join('')}
        </div>` : ''}
        ${skills.length ? `
        <div class="about-skills-block">
          <div class="about-skills-header">
            <span class="about-skills-label">Skills &amp; Tools</span>
            <span class="about-skills-count">${skills.length} discipline${skills.length !== 1 ? 's' : ''}</span>
          </div>
          <ul class="about-skills">
            ${skills.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
          </ul>
        </div>` : ''}
      </div>
      <div class="about-text">
        <div class="about-eyebrow">About</div>
        <h2 class="about-headline">${aboutHeadline}</h2>
        <div class="about-rule"></div>
        <div class="about-body">
          ${paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('')}
        </div>
      </div>
    </div>`;
}

// ─────────────────────────────────────────────────────────────
//  SECTION ORDERING — reorder DOM to match homepage_sections
// ─────────────────────────────────────────────────────────────
function reorderSections() {
  if (!_site?.homepage_sections) return;
  const SEC_ID = { 'home': 'work', 'client-work': 'clients', 'photography': 'photography', 'about': 'about' };
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
  const BUILTIN = new Set(['home', 'client-work', 'photography', 'about']);
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
['modal', 'lightbox'].forEach(id => {
  const box = $(id); if (!box) return;
  box.addEventListener('click', e => {
    if (e.target.dataset.close === id || e.target.classList.contains(`${id}-close`)) {
      box.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (id === 'modal') { const pc = $('playerContainer'); if (pc) pc.innerHTML = ''; }
    }
  });
});

// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  ['modal', 'lightbox'].forEach(id => {
    const box = $(id);
    if (box && box.getAttribute('aria-hidden') === 'false') {
      box.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (id === 'modal') { const pc = $('playerContainer'); if (pc) pc.innerHTML = ''; }
    }
  });
});

// ─────────────────────────────────────────────────────────────
//  LIGHTBOX
// ─────────────────────────────────────────────────────────────
function openLightbox(src) {
  const lb = $('lightbox'); if (!lb) return;
  $('lightboxImg').src = src;
  lb.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

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
  el.innerHTML = data.images.map((src, i) => `
    <figure class="card" style="animation-delay:${i * 40}ms">
      <div class="thumb"><img src="${src}" alt="" loading="lazy"></div>
    </figure>`).join('');
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
    await Promise.all([loadWork(), loadClients(), loadPhotography(), loadAbout(), loadCustomSections()]);
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
