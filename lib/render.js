const { img, slugify } = require('./tmdb');

const SITE_NAME = 'ZeroCinema';
const DEFAULT_TITLE = 'Ganzer Film Deutsch Stream Online anschauen | Cinemath Deutschland';
const DEFAULT_DESC = 'Ganzer Film Deutsch Stream Online anschauen. Entdecken Sie die neuesten Filme und Serien mit Trailer, Handlung, Besetzung und Bewertungen auf Cinemath Deutschland.';
const DEFAULT_OG_IMAGE = 'https://placehold.co/1200x630/17171b/8d8a92?text=Cinemath';

const GOOGLE_SITE_VERIFICATION = '6gYe5feTdGWgq42bWQ7P9GGuTlThX-_nF0Eau6epMzE';

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function head({ title, description, url, image, type = 'website', robots = 'index, follow' }) {
  const t = escapeHtml(title || DEFAULT_TITLE);
  const d = escapeHtml((description || DEFAULT_DESC).slice(0, 160));
  const ogImg = image || DEFAULT_OG_IMAGE;
  return `
    <title>${t}</title>
    <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATION}" />
    <meta name="description" content="${d}">
    <meta name="robots" content="${robots}">
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="${type}">
    <meta property="og:site_name" content="${SITE_NAME}">
    <meta property="og:title" content="${t}">
    <meta property="og:description" content="${d}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${ogImg}">
    <meta property="og:locale" content="de_DE">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${t}">
    <meta name="twitter:description" content="${d}">
    <meta name="twitter:image" content="${ogImg}">
  `;
}

function movieJsonLd(data, url) {
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: data.title,
    description: `${data.title} (${(data.release_date || '').slice(0,4)}) Ganzer Film Deutsch Stream Online anschauen. Sehen Sie Trailer, Handlung, Besetzung, Bewertungen und aktuelle Informationen auf Cinemath Deutschland.`,
    url: url,
    image: img(data.poster_path, 'original'),
    datePublished: data.release_date,
    inLanguage: 'de',
    genre: (data.genres || []).map(g => g.name),
  };

  if (data.vote_average && data.vote_count) {
    payload.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: data.vote_average.toFixed(1),
      ratingCount: data.vote_count,
      bestRating: '10',
      worstRating: '0',
    };
  }
  return `<script type="application/ld+json">${JSON.stringify(payload)}</script>`;
}

function tvJsonLd(data, url) {
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name: data.name,
    description:`${data.name} (${(data.first_air_date || '').slice(0,4)}) Ganzer Film Deutsch Stream Online anschauen. Sehen Sie Trailer, Handlung, Besetzung, Bewertungen und aktuelle Informationen auf Cinemath Deutschland.`,
  };
  if (data.vote_average && data.vote_count) {
    payload.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: data.vote_average.toFixed(1),
      ratingCount: data.vote_count,
      bestRating: '10',
      worstRating: '0',
    };
  }
  return `<script type="application/ld+json">${JSON.stringify(payload)}</script>`;
}

function personJsonLd(person, url) {
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    description: person.biography ? person.biography.slice(0, 160) : `${person.name} Biografie, Filme und Serien auf Cinemath.`,
    image: img(person.profile_path, 'original'),
    url: url
  };
  return `<script type="application/ld+json">${JSON.stringify(payload)}</script>`;
}

// ---------- Adsterra & Histats ----------
function bannerScript(key, width, height) {
  return `<script>atOptions = { 'key' : '${key}', 'format' : 'iframe', 'height' : ${height}, 'width' : ${width}, 'params' : {} };</script><script src="https://www.highperformanceformat.com/${key}/invoke.js"></script>`;
}
function topBannerAd() {
  return `
    <div class="ad-slot ad-desktop-only">${bannerScript('9eab15e2d0d97de74e3ee971fe615a5e', 728, 90)}</div>
    <div class="ad-slot ad-mobile-only">${bannerScript('374f3cbadfdea331b749dcfc79f79f2c', 320, 50)}</div>
  `;
}
function sideBannerAd() {
  return `<div class="ad-slot ad-desktop-only">${bannerScript('25247fde261d8f76e06b91b9d74945f4', 160, 600)}</div>`;
}
function nativeBannerAd() {
  return `
    <div class="ad-slot ad-native">
      <script async data-cfasync="false" src="https://pl30557737.effectivecpmnetwork.com/6f7b03feb080b4884047d6210ed8268e/invoke.js"></script>
      <div id="container-6f7b03feb080b4884047d6210ed8268e"></div>
    </div>
  `;
}
function socialBarScript() {
  return `<script src="https://pl30557736.effectivecpmnetwork.com/af/c1/6d/afc16d8a70f1f493abf2098939fca8f7.js"></script>`;
}

function histatsSnippet() {
  return `
    <div id="histats_counter" style="display:none;"></div>
    <script type="text/javascript">
    var _Hasync = _Hasync || [];
    _Hasync.push(['Histats.start', '1,5014113,4,1,120,40,00011111']);
    _Hasync.push(['Histats.fasi', '1']);
    _Hasync.push(['Histats.track_hits', '']);
    (function() {
      var hs = document.createElement('script'); hs.type = 'text/javascript'; hs.async = true;
      hs.src = ('//s10.histats.com/js15_as.js');
      (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(hs);
    })();
    </script>
    <noscript><a href="/" target="_blank"><img src="//sstatic1.histats.com/0.gif?5014113&101" alt="" border="0" style="display:none;"></a></noscript>
  `;
}

function layout({ headHtml, bodyHtml, activeTab = 'movie' }) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${headHtml}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
<style>
  html { scroll-behavior: smooth; }
  .section-block { scroll-margin-top: 90px; }
  .detail-nav { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; margin-bottom: 20px; }
  .detail-nav a { color: #e5e7eb; text-decoration: none; font-weight: 600; font-size: 0.9rem; padding: 8px 14px; background: rgba(255,255,255,0.08); border-radius: 6px; transition: all 0.2s ease; border: 1px solid rgba(255,255,255,0.05); }
  .detail-nav a:hover { background: #e50914; color: #fff; border-color: #e50914; }

  /* Hero Call to Action Buttons */
  .cta-group { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 20px; align-items: center; }
  .btn-stream-hd {
    display: inline-flex; align-items: center; justify-content: center; gap: 10px;
    background: linear-gradient(135deg, #e50914 0%, #b20710 100%);
    color: #fff; font-size: 1rem; font-weight: 700; padding: 12px 24px; border-radius: 8px;
    text-decoration: none; box-shadow: 0 4px 15px rgba(229, 9, 20, 0.4); transition: transform 0.2s, box-shadow 0.2s;
  }
  .btn-stream-hd:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(229, 9, 20, 0.6); }
  .btn-trailer-direct {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    background: rgba(255, 255, 255, 0.12); color: #fff; font-size: 0.95rem; font-weight: 600;
    padding: 12px 20px; border-radius: 8px; text-decoration: none; border: 1px solid rgba(255, 255, 255, 0.2); transition: all 0.2s;
  }
  .btn-trailer-direct:hover { background: rgba(255, 255, 255, 0.25); color: #fff; }

  /* Mock Player Styling */
  .mock-player-container {
    position: relative; width: 100%; max-width: 900px; margin: 30px auto;
    background: #0d0d11; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 10px 30px rgba(0,0,0,0.8);
  }
  .mock-player-header {
    display: flex; justify-content: space-between; align-items: center; padding: 12px 20px;
    background: #14141d; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem; color: #a1a1aa;
  }
  .server-badge { display: flex; gap: 8px; align-items: center; }
  .server-btn { background: #27273a; color: #fff; padding: 4px 10px; border-radius: 4px; font-weight: 600; font-size: 0.75rem; }
  .server-btn.active { background: #e50914; }
  .mock-player-screen {
    position: relative; aspect-ratio: 16/9; background-size: cover; background-position: center;
    display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; text-decoration: none;
  }
  .mock-player-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.65); transition: background 0.3s; }
  .mock-player-screen:hover .mock-player-overlay { background: rgba(0,0,0,0.45); }
  .play-trigger-circle {
    position: relative; z-index: 2; width: 80px; height: 80px; background: rgba(229, 9, 20, 0.9);
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 30px rgba(229, 9, 20, 0.7); transition: transform 0.3s;
  }
  .mock-player-screen:hover .play-trigger-circle { transform: scale(1.1); }
  .play-trigger-circle svg { width: 36px; height: 36px; fill: #fff; margin-left: 4px; }
  .player-text-status { position: relative; z-index: 2; margin-top: 15px; color: #fff; font-weight: 700; font-size: 1.1rem; text-shadow: 0 2px 4px rgba(0,0,0,0.8); }

  /* Cast Card Link Styling */
  .cast-card { text-decoration: none; color: inherit; display: block; transition: transform 0.2s; }
  .cast-card:hover { transform: translateY(-4px); }

  /* Person Detail Page */
  .person-header { display: flex; gap: 30px; margin: 30px 0; align-items: flex-start; }
  .person-poster { width: 220px; flex-shrink: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 20px rgba(0,0,0,0.5); }
  .person-poster img { width: 100%; height: auto; display: block; object-fit: cover; }
  .person-info { flex-grow: 1; }
  .person-name { font-size: 2.2rem; font-weight: 900; margin-bottom: 10px; color: #fff; }
  .person-meta { display: flex; gap: 15px; font-size: 0.9rem; color: #a1a1aa; margin-bottom: 15px; flex-wrap: wrap; }
  .person-bio { line-height: 1.6; color: #d1d5db; max-height: 250px; overflow-y: auto; padding-right: 10px; }

  .ad-slot { display: flex; justify-content: center; align-items: center; margin: 20px auto; overflow: hidden; }
  .ad-mobile-only { display: none; }
  @media (max-width: 768px) {
    .ad-desktop-only { display: none; }
    .ad-mobile-only { display: flex; }
    .cta-group { flex-direction: column; align-items: stretch; }
    .btn-stream-hd, .btn-trailer-direct { width: 100%; text-align: center; }
    .person-header { flex-direction: column; align-items: center; text-align: center; }
    .person-poster { width: 180px; }
  }
</style>
</head>
<body>
<header>
  <div class="header-inner">
    <a class="logo" href="/movie">Cinema<span>th</span></a>
    <nav class="tabs">
      <a class="tab-btn ${activeTab === 'movie' ? 'active' : ''}" href="/movie">Filme</a>
      <a class="tab-btn ${activeTab === 'tv' ? 'active' : ''}" href="/tv">Serien</a>
    </nav>
    <div class="search-wrap">
      <input id="search-input" type="text" placeholder="Titel suchen..." autocomplete="off">
      <div class="search-results" id="search-results"></div>
    </div>
  </div>
</header>
${topBannerAd()}
<main>
${bodyHtml}
</main>
<footer>
  <p>Cinemath — Film- und Serieninfos auf Basis öffentlicher TMDB-Daten (kein Streaming-Dienst) · Powered by <a href="https://www.themoviedb.org/" target="_blank" rel="noopener">TMDB</a></p>
  ${histatsSnippet()}
</footer>
<script src="/app.js"></script>
${socialBarScript()}
</body>
</html>`;
}

function posterCard(item, type) {
  const title = item.title || item.name;
  const date = (item.release_date || item.first_air_date || '').slice(0, 4);
  const rating = item.vote_average ? item.vote_average.toFixed(1) : '-';
  const slug = slugify(title);
  return `
    <a class="poster-card" href="/${type}/${item.id}/${encodeURIComponent(slug)}">
      <div class="poster-frame">
        <img src="${img(item.poster_path)}" alt="${escapeHtml(title)}" loading="lazy">
        <div class="poster-badge">★ ${rating}</div>
      </div>
      <div class="poster-title">${escapeHtml(title)}</div>
      <div class="poster-sub">${date || 'Jahr unbekannt'}</div>
    </a>
  `;
}

function genreRow(genres) {
  if (!genres || !genres.length) return '';
  return `<div class="genre-row">${genres.map(g => `<span class="genre-pill">${escapeHtml(g.name)}</span>`).join('')}</div>`;
}

function mockPlayerBlock(backdropPath, title) {
  return `
    <div class="section-block" id="stream-player">
      <h3>Online Streamen</h3>
      <div class="mock-player-container">
        <div class="mock-player-header">
          <div class="server-badge">
            <span class="server-btn active">Server 1 (HD)</span>
            <span class="server-btn">Server 2 (Fast)</span>
          </div>
          <div>Status: <span style="color:#4ade80; font-weight:bold;">● Online</span></div>
        </div>
        <a href="#trailer" class="mock-player-screen" style="background-image: url('${img(backdropPath, 'original')}');">
          <div class="mock-player-overlay"></div>
          <div class="play-trigger-circle">
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
          <div class="player-text-status">Klicken Sie hier, um Stream / Trailer zu starten (${escapeHtml(title)})</div>
        </a>
      </div>
    </div>
  `;
}

function trailerBlock(videos) {
  const list = (videos && videos.results) || [];
  const trailer = list.find(v => v.site === 'YouTube' && v.type === 'Trailer') || list.find(v => v.site === 'YouTube');
  if (!trailer) return `<div class="no-trailer">Noch kein Trailer verfügbar.</div>`;
  return `
    <div class="trailer-wrap">
      <iframe src="https://www.youtube.com/embed/${trailer.key}" title="trailer" allowfullscreen loading="lazy"></iframe>
    </div>
  `;
}

function castGrid(credits) {
  const cast = ((credits && credits.cast) || []).slice(0, 12);
  if (!cast.length) return `<div class="empty">Keine Besetzungsinformationen verfügbar.</div>`;
  return `<div class="cast-grid">${cast.map(c => `
    <a class="cast-card" href="/person/${c.id}/${encodeURIComponent(slugify(c.name))}">
      <img src="${img(c.profile_path, 'w185')}" alt="${escapeHtml(c.name)}" loading="lazy">
      <div class="cast-name">${escapeHtml(c.name)}</div>
      <div class="cast-role">${escapeHtml(c.character || '')}</div>
    </a>
  `).join('')}</div>`;
}

function personBlock(person, credits) {
  const profileImage = img(person.profile_path, 'w185') || 'https://placehold.co/300x450/17171b/ffffff?text=Kein+Foto';
  const birthday = person.birthday || '-';
  const placeOfBirth = person.place_of_birth || '-';
  const bio = person.biography || 'Keine Biografie verfügbar.';

  const knownFor = (credits && credits.cast) ? credits.cast.slice(0, 18) : [];
  const movieCards = knownFor.map(item => {
    const type = item.media_type === 'tv' ? 'tv' : 'movie';
    return posterCard(item, type);
  }).join('');

  return `
    <div class="section-block">
      <div class="detail-nav">
        <a href="javascript:history.back()">← Zurück</a>
      </div>

      <div class="person-header">
        <div class="person-poster">
          <img src="${profileImage}" alt="${escapeHtml(person.name)}" loading="lazy">
        </div>
        <div class="person-info">
          <h1 class="person-name">${escapeHtml(person.name)}</h1>
          <div class="person-meta">
            <span><strong>Geboren:</strong> ${escapeHtml(birthday)}</span>
            <span><strong>Geburtsort:</strong> ${escapeHtml(placeOfBirth)}</span>
          </div>
          <div class="person-bio">
            <p>${escapeHtml(bio).replace(/\n/g, '<br>')}</p>
          </div>
        </div>
      </div>

      ${nativeBannerAd()}

      <div class="section-block" style="margin-top: 40px;">
        <h3>Bekannt für (Filme & Serien)</h3>
        <div class="poster-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px;">
          ${movieCards || '<div class="empty">Keine Filme gefunden.</div>'}
        </div>
      </div>
    </div>
  `;
}

module.exports = {
  head,
  layout,
  posterCard,
  genreRow,
  trailerBlock,
  castGrid,
  mockPlayerBlock,
  personBlock,
  escapeHtml,
  movieJsonLd,
  tvJsonLd,
  personJsonLd,
  sideBannerAd,
  nativeBannerAd,
  DEFAULT_TITLE,
  DEFAULT_DESC,
  SITE_NAME
};
