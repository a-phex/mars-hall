// Utility: byId
const $ = (id) => document.getElementById(id);

// Year in footer
document.addEventListener('DOMContentLoaded', () => {
  const y = $('year'); if (y) y.textContent = new Date().getFullYear();
});

// Mobile nav
const nav = $('siteNav');
const navToggle = $('navToggle');
if (nav && navToggle) {
  navToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}

// ------- Video grid (Home) -------
async function renderVideoGrid(containerId, jsonPath){
  const el = $(containerId);
  if(!el) return;
  const path = el.getAttribute('data-source') || jsonPath;
  const data = await fetch(path).then(r=>r.json()).catch(()=>({videos:[]}));
  const tpl = (v, i)=>`
    <article class="card${v.layout==='full'?' card--full':v.layout==='half'?' card--half':''}" data-yt="${v.youtubeId}" style="animation-delay:${i*60}ms">
      <div class="thumb">
        <img src="${v.thumb || `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`}" alt="${escapeHtml(v.title)}" loading="lazy">
        <span class="play" aria-hidden="true">▶</span>
      </div>
      <div class="meta">
        <h3 class="title">${escapeHtml(v.title)}</h3>
        ${v.sub ? `<p class="sub">${escapeHtml(v.sub)}</p>` : ``}
      </div>
    </article>`;
  el.innerHTML = data.videos.map(tpl).join('');
  // open modal on click
  el.addEventListener('click', (e)=>{
    const card = e.target.closest('.card'); if(!card) return;
    openVideoModal(card.dataset.yt, card.querySelector('.title')?.textContent || '');
  });
}

// ------- Client albums (Client Work) -------
async function renderClientAlbums(containerId){
  const el = $(containerId);
  if(!el) return;
  const path = el.getAttribute('data-source');
  const data = await fetch(path).then(r=>r.json()).catch(()=>({clients:[]}));
  const tpl = (c, i)=>`
    <article class="card album" data-client='${JSON.stringify(c).replaceAll("'", "&apos;")}' style="animation-delay:${i*60}ms">
      <div class="thumb">
        <img src="${c.cover || 'static/img/hero-greenwich.jpg'}" alt="${escapeHtml(c.name)}" loading="lazy">
        ${c.logo ? `<img class="album-logo" src="${c.logo}" alt="${escapeHtml(c.name)} logo">` : ''}
      </div>
      <div class="meta">
        <h3 class="title">${escapeHtml(c.name)}</h3>
        ${c.blurb ? `<p class="sub">${escapeHtml(c.blurb)}</p>` : ``}
      </div>
    </article>`;
  el.innerHTML = data.clients.map(tpl).join('');
  // Click → open modal player with small playlist
  el.addEventListener('click', (e)=>{
    const card = e.target.closest('.album'); if(!card) return;
    const client = JSON.parse(card.dataset.client.replaceAll("&apos;","'"));
    openClientPlaylist(client);
  });
}

// ------- Image grids (Photography / BTS) -------
async function renderImageGrid(containerId, images){
  const el = $(containerId); if(!el) return;
  let list = images;
  if(!list){
    const path = el.getAttribute('data-source');
    const data = await fetch(path).then(r=>r.json()).catch(()=>({images:[]}));
    list = data.images;
  }
  el.innerHTML = list.map((src, i) => `
    <figure class="card" style="animation-delay:${i*40}ms">
      <div class="thumb"><img src="${src}" alt="" loading="lazy"></div>
    </figure>
  `).join('');

  el.addEventListener('click',(e)=>{
    const img = e.target.closest('img'); if(!img) return;
    openLightbox(img.src);
  });
}

// ------- Modal (YouTube) -------
function loadPlayer(container, youtubeId, title=''){
  container.innerHTML = `<iframe
    src="https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1"
    title="${escapeHtml(title)}" frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen></iframe>`;
}

function openVideoModal(youtubeId, title=''){
  const modal = $('modal'); if(!modal) return;
  loadPlayer($('playerContainer'), youtubeId, title);
  const pl = $('playlist'); if(pl) pl.innerHTML = '';
  modal.setAttribute('aria-hidden','false');
}

function openClientPlaylist(client){
  const modal = $('modal'); if(!modal) return;
  const player = $('playerContainer');

  // First playable video (skip category headers)
  const playableVideos = (client.videos || []).filter(v => v.type !== 'category');
  const first = playableVideos[0];
  if(first) loadPlayer(player, first.youtubeId, first.title);
  else player.innerHTML = '';

  const playlist = $('playlist');
  if(playlist && client.videos){
    playlist.innerHTML = client.videos.map(v => {
      if(v.type === 'category'){
        return `<div class="playlist-category">${escapeHtml(v.label || '')}</div>`;
      }
      return `<article class="playlist-card" data-yt="${v.youtubeId}" data-title="${escapeHtml(v.title)}">
        <div class="playlist-thumb">
          <img src="${v.thumb || `https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg`}" alt="${escapeHtml(v.title)}" loading="lazy">
          <span class="play" aria-hidden="true">▶</span>
        </div>
        <div class="playlist-meta">
          <p class="playlist-title">${escapeHtml(v.title)}</p>
        </div>
      </article>`;
    }).join('');

    playlist.addEventListener('click',(e)=>{
      const card = e.target.closest('.playlist-card'); if(!card) return;
      loadPlayer(player, card.dataset.yt, card.dataset.title);
      playlist.querySelectorAll('.playlist-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });

    // Mark first card as active
    playlist.querySelector('.playlist-card')?.classList.add('active');
  }

  modal.setAttribute('aria-hidden','false');
}

// Close modal / lightbox
['modal','lightbox'].forEach(id=>{
  const box = $(id); if(!box) return;
  box.addEventListener('click',(e)=>{
    if(e.target.dataset.close === id || e.target.classList.contains(`${id}-close`)){
      box.setAttribute('aria-hidden','true');
      if(id==='modal') $('playerContainer').innerHTML='';
    }
  });
});

// Lightbox
function openLightbox(src){
  const lb = $('lightbox'); if(!lb) return;
  $('lightboxImg').src = src;
  lb.setAttribute('aria-hidden','false');
}

// Escape HTML helper
function escapeHtml(str=''){
  return str.replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[m]);
}

// ------- BTS masonry gallery -------
async function renderBTSGallery(containerId, srcPath) {
  const el = $(containerId); if (!el) return;
  const src = srcPath || el.getAttribute('data-source');
  const items = await fetch(src).then(r => r.json()).catch(() => []);
  el.innerHTML = items.map((item, i) => `
    <figure class="masonry-item fade-in" style="animation-delay:${i*70}ms">
      <img src="${item.src}" alt="${escapeHtml(item.alt||'')}" loading="lazy">
      ${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ''}
    </figure>`).join('');
  const lightbox = $('lightbox'), lightboxImg = $('lightboxImg');
  if (lightbox && lightboxImg) {
    el.querySelectorAll('img').forEach(img => {
      img.addEventListener('click', () => {
        lightboxImg.src = img.src;
        lightbox.setAttribute('aria-hidden', 'false');
      });
    });
  }
}

// ------- Carousel -------
async function renderCarousel(containerId, srcPath) {
  const el = $(containerId); if (!el) return;
  const src = srcPath || el.getAttribute('data-source');
  const raw = await fetch(src).then(r => r.json()).catch(() => ({}));
  const images = raw.images || (Array.isArray(raw) ? raw : []);
  if (!images.length) { el.innerHTML = '<p style="color:var(--muted);padding:1em">No images yet</p>'; return; }
  el.innerHTML = `
    <button class="carousel-btn prev" aria-label="Previous">‹</button>
    <div class="carousel-track">${images.map(s=>`<img src="${s}" alt="" loading="lazy">`).join('')}</div>
    <button class="carousel-btn next" aria-label="Next">›</button>`;
  let idx = 0;
  const track = el.querySelector('.carousel-track');
  const total = images.length;
  function goTo(n) { idx = ((n % total) + total) % total; track.style.transform = `translateX(-${idx * 100}%)`; }
  el.querySelector('.prev').addEventListener('click', () => goTo(idx - 1));
  el.querySelector('.next').addEventListener('click', () => goTo(idx + 1));
}

// ------- Generic page initialiser (reads data/pages.json) -------
async function initPage() {
  const container = $('page-content');
  if (!container) return;
  const slug = container.dataset.slug;
  const pagesData = await fetch('data/pages.json').then(r => r.json()).catch(() => null);
  if (!pagesData) return;
  const page = pagesData.pages.find(p => p.slug === slug);
  if (!page) return;

  for (const block of (page.blocks || [])) {
    const src = block.dataFile ? `data/${block.dataFile}.json` : `data/block-${block.id}.json`;
    const sec = document.createElement('section');
    sec.id = `block-${block.id}`;

    // ── info_box ──────────────────────────────────────────────
    if (block.type === 'info_box') {
      if (block.image) {
        sec.className = 'about';
        const mediaDiv = document.createElement('div');
        mediaDiv.className = 'about-media';
        const portrait = document.createElement('img');
        portrait.src = block.image; portrait.alt = block.heading || '';
        mediaDiv.appendChild(portrait);
        sec.appendChild(mediaDiv);
        const copyDiv = document.createElement('div');
        copyDiv.className = 'about-copy';
        if (block.heading) { const h1 = document.createElement('h1'); h1.textContent = block.heading; copyDiv.appendChild(h1); }
        (block.body||'').split('\n\n').filter(Boolean).forEach(para => { const p = document.createElement('p'); p.textContent = para; copyDiv.appendChild(p); });
        if (block.skills && block.skills.length) {
          const h2 = document.createElement('h2'); h2.textContent = 'Skills & Certifications'; copyDiv.appendChild(h2);
          const ul = document.createElement('ul'); ul.className = 'badge-list';
          block.skills.forEach(s => { const li = document.createElement('li'); li.textContent = s; ul.appendChild(li); });
          copyDiv.appendChild(ul);
        }
        sec.appendChild(copyDiv);
      } else {
        sec.className = 'section';
        if (block.heading) { const h1 = document.createElement('h1'); h1.className = 'section-title'; h1.textContent = block.heading; sec.appendChild(h1); }
        (block.body||'').split('\n\n').filter(Boolean).forEach(para => { const p = document.createElement('p'); p.textContent = para; sec.appendChild(p); });
      }
      container.appendChild(sec);
      continue;
    }

    // ── video_embed ───────────────────────────────────────────
    if (block.type === 'video_embed') {
      sec.className = 'section';
      if (block.label) { const h2 = document.createElement('h2'); h2.className = 'section-title'; h2.textContent = block.label; sec.appendChild(h2); }
      const wrap = document.createElement('div');
      wrap.className = 'video-embed';
      wrap.innerHTML = `<iframe src="https://www.youtube.com/embed/${block.youtubeId}" title="${escapeHtml(block.label||'')}" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe>`;
      sec.appendChild(wrap);
      container.appendChild(sec);
      continue;
    }

    // ── grid/gallery blocks ───────────────────────────────────
    sec.className = 'section';
    if (block.label) { const h2 = document.createElement('h2'); h2.className = 'section-title'; h2.textContent = block.label; sec.appendChild(h2); }
    const grid = document.createElement('div');
    grid.id = `grid-${block.id}`;
    grid.dataset.source = src;

    if (block.type === 'video_grid') {
      grid.className = 'video-grid';
      sec.appendChild(grid); container.appendChild(sec);
      renderVideoGrid(grid.id);
    } else if (block.type === 'client_grid') {
      grid.className = 'album-grid';
      sec.appendChild(grid); container.appendChild(sec);
      renderClientAlbums(grid.id);
    } else if (block.type === 'photo_gallery') {
      grid.className = 'image-grid';
      sec.appendChild(grid); container.appendChild(sec);
      renderImageGrid(grid.id);
    } else if (block.type === 'bts_gallery') {
      grid.className = 'masonry-gallery';
      sec.appendChild(grid); container.appendChild(sec);
      renderBTSGallery(grid.id, src);
    } else if (block.type === 'carousel') {
      grid.className = 'carousel';
      sec.appendChild(grid); container.appendChild(sec);
      renderCarousel(grid.id, src);
    }
  }
}

document.addEventListener('DOMContentLoaded', initPage);

// ── Home network tools ────────────────────────────────────────────────────────
// Probes the local launcher. If reachable (home network), reveals:
//  • Home Hub link in the nav
//  • Edit pencil button fixed to top-right corner → Portfolio Publisher
(function () {
  const LAUNCHER  = 'http://192.168.0.21:5050';
  const PUBLISHER = 'http://192.168.0.21:5241';

  // 1. Nav: Home Hub link
  const li = document.createElement('li');
  li.id = 'hub-nav-item';
  li.style.display = 'none';
  li.innerHTML = `<a href="${LAUNCHER}" target="_blank" rel="noopener" class="hub-link">⌂ Home Hub</a>`;
  const navList = document.getElementById('navList');
  if (navList) navList.appendChild(li);

  // 2. Edit pencil — fixed top-right
  const editBtn = document.createElement('a');
  editBtn.id = 'edit-btn';
  editBtn.href = PUBLISHER;
  editBtn.target = '_blank';
  editBtn.rel = 'noopener';
  editBtn.title = 'Portfolio Publisher';
  editBtn.textContent = '✏️';
  document.body.appendChild(editBtn);

  // Probe — image load is CORS-free
  const probe = new Image();
  probe.onload = function () {
    li.style.display = '';
    editBtn.classList.add('visible');
  };
  probe.src = LAUNCHER + '/static/icons/meal_planner.svg?_=' + Date.now();
  setTimeout(function () { probe.src = ''; }, 3000);
}());
