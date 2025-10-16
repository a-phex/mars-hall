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
  const tpl = (v)=>`
    <article class="card" data-yt="${v.youtubeId}">
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
    openVideoModal(card.dataset.yt);
  });
}

// ------- Client albums (Client Work) -------
async function renderClientAlbums(containerId){
  const el = $(containerId);
  if(!el) return;
  const path = el.getAttribute('data-source');
  const data = await fetch(path).then(r=>r.json()).catch(()=>({clients:[]}));
  const tpl = (c)=>`
    <article class="card album" data-client='${JSON.stringify(c).replaceAll("'", "&apos;")}'>
      <div class="thumb">
        <img src="${c.cover || 'static/img/hero-greenwich.jpg'}" alt="${escapeHtml(c.name)}" loading="lazy">
      </div>
      <div class="meta">
        <h3 class="title">${escapeHtml(c.name)} ${c.logo ? `<img class="album-logo" src="${c.logo}" alt="${escapeHtml(c.name)} logo">` : ''}</h3>
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
  el.innerHTML = list.map(src => `
    <figure class="card">
      <div class="thumb"><img src="${src}" alt="" loading="lazy"></div>
    </figure>
  `).join('');

  el.addEventListener('click',(e)=>{
    const img = e.target.closest('img'); if(!img) return;
    openLightbox(img.src);
  });
}

// ------- Modal (YouTube) -------
function openVideoModal(youtubeId){
  const modal = $('modal'); if(!modal) return;
  const player = $('playerContainer');
  player.innerHTML = `<iframe width="560" height="315"
    src="https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0"
    title="YouTube video" frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen></iframe>`;
  modal.setAttribute('aria-hidden','false');
}

function openClientPlaylist(client){
  const modal = $('modal'); if(!modal) return;
  const player = $('playerContainer');
  const first = client.videos?.[0];
  if(first){
    player.innerHTML = `<iframe width="560" height="315"
      src="https://www.youtube.com/embed/${first.youtubeId}?autoplay=1&rel=0"
      title="${escapeHtml(first.title)}" frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen></iframe>`;
  }
  const playlist = $('playlist');
  if(playlist && client.videos){
    playlist.innerHTML = client.videos.map(v=>`
      <article class="card" data-yt="${v.youtubeId}">
        <div class="thumb">
          <img src="${v.thumb || `https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg`}" alt="${escapeHtml(v.title)}" loading="lazy">
          <span class="play">▶</span>
        </div>
        <div class="meta">
          <h4 class="title">${escapeHtml(v.title)}</h4>
        </div>
      </article>
    `).join('');
    playlist.addEventListener('click',(e)=>{
      const card = e.target.closest('.card'); if(!card) return;
      openVideoModal(card.dataset.yt);
    }, {once:false});
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

// Page initialisers
document.addEventListener('DOMContentLoaded', ()=>{
  if($('videoGrid')) renderVideoGrid('videoGrid');
  if($('clientGrid')) renderClientAlbums('clientGrid');
  if($('photoGrid')) renderImageGrid('photoGrid');
  if($('btsGrid')) renderImageGrid('btsGrid');
});
