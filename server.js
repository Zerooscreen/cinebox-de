const express = require('express');
const path = require('path');
const { tmdb, img, slugify } = require('./lib/tmdb');
const { head, layout, posterCard, genreRow, trailerBlock, castGrid, escapeHtml, movieJsonLd, tvJsonLd, sideBannerAd, nativeBannerAd, DEFAULT_TITLE, DEFAULT_DESC, SITE_NAME } = require('./lib/render');

const app = express();
const PORT = process.env.PORT || 3000;

// Domain resmi situs — dipakai untuk sitemap, canonical, dan Open Graph URL
const SITE_URL = process.env.SITE_URL || 'https://cinebox-de.up.railway.app';

app.use(express.static(path.join(__dirname, 'public')));

const ROWS = {
  movie: [
    { key: '01', title: 'Angesagte Filme', path: '/trending/movie/week' },
    { key: '02', title: 'Beliebte Filme', path: '/movie/popular' },
    { key: '03', title: 'Bestbewertete Filme', path: '/movie/top_rated' },
    { key: '04', title: 'Demnächst im Kino', path: '/movie/upcoming' },
  ],
  tv: [
    { key: '01', title: 'Angesagte Serien', path: '/trending/tv/week' },
    { key: '02', title: 'Beliebte Serien', path: '/tv/popular' },
    { key: '03', title: 'Bestbewertete Serien', path: '/tv/top_rated' },
    { key: '04', title: 'Laufende Serien', path: '/tv/on_the_air' },
  ],
};

// ---------- SEO-Titel & Beschreibung (gleiches Muster für ALLE Detailseiten) ----------
function seoTitle(kind, title, year) {
  return `${title} (${year || '2026'}) Ganzer Film Deutsch Stream Online anschauen`;
}

function seoDescription(title, year, genreNames) {
  return `${title} (${year || '2026'}) Ganzer Film Deutsch Stream Online anschauen. Kostenlos ansehen in HD. Trailer, Handlung, Besetzung, Bewertung und aktuelle Informationen auf CineBox.`;
}

// ---------- HOME (/, /movie, /tv) ----------
async function renderHome(req, res, tab) {
  try {
    const heroData = await tmdb(tab === 'movie' ? '/trending/movie/week' : '/trending/tv/week');
    const hero = heroData.results[0];
    const heroTitle = hero ? (hero.title || hero.name) : SITE_NAME;
    const heroOverview = hero ? (hero.overview || '') : '';

    const rowsHtml = [];
    for (const def of ROWS[tab]) {
      const data = await tmdb(def.path);
      const cards = data.results.slice(0, 12).map(item => posterCard(item, tab)).join('');
      rowsHtml.push(`
        <section class="row">
          <div class="row-head"><span class="row-num">${def.key}</span><h2>${def.title}</h2></div>
          <div class="grid">${cards}</div>
        </section>
      `);
    }

    const heroHtml = hero ? `
      <div id="hero">
        <div class="hero-bg" style="background-image:url('${img(hero.backdrop_path, 'original')}')"></div>
        <div class="hero-fade"></div>
        <div class="hero-content">
          <div class="hero-eyebrow">Trend der Woche</div>
          <div class="hero-title">${escapeHtml(heroTitle)}</div>
          <div class="hero-overview">${escapeHtml(heroOverview).slice(0, 180)}${heroOverview.length > 180 ? '…' : ''}</div>
          <a class="hero-btn" href="/${tab}/${hero.id}/${encodeURIComponent(slugify(heroTitle))}">Mehr erfahren ▸</a>
        </div>
      </div>` : '';

    const bodyHtml = heroHtml + `<div id="rows">${rowsHtml.join('')}</div>`;

    const headHtml = head({
      title: DEFAULT_TITLE,
      description: DEFAULT_DESC,
      url: `${SITE_URL}/${tab}`,
      image: hero ? img(hero.backdrop_path, 'w780') : null,
    });

    res.send(layout({ headHtml, bodyHtml, activeTab: tab }));
  } catch (e) {
    res.status(500).send(layout({
      headHtml: head({ title: DEFAULT_TITLE, description: DEFAULT_DESC, url: `${SITE_URL}/${tab}` }),
      bodyHtml: `<div class="empty">Daten konnten nicht geladen werden. Bitte versuchen Sie es später erneut.</div>`,
      activeTab: tab,
    }));
  }
}

app.get('/', (req, res) => renderHome(req, res, 'movie'));
app.get('/movie', (req, res) => renderHome(req, res, 'movie'));
app.get('/tv', (req, res) => renderHome(req, res, 'tv'));

// ---------- DETAIL: /movie/:id/:slug? ----------
app.get('/movie/:id/:slug?', async (req, res) => {
  const { id } = req.params;
  try {
    const [data, credits, videos, similar] = await Promise.all([
  tmdb(`/movie/${id}`),
  tmdb(`/movie/${id}/credits`),
  tmdb(`/movie/${id}/videos`),
  tmdb(`/movie/${id}/similar`)
]);
    console.log("SIMILAR:", similar);
    const correctSlug = slugify(data.title);
    if (req.params.slug !== correctSlug) {
      return res.redirect(301, `/movie/${id}/${encodeURIComponent(correctSlug)}`);
    }

    const runtime = data.runtime ? `${Math.floor(data.runtime / 60)} Std. ${data.runtime % 60} Min.` : 'Unbekannt';
    const bodyHtml = `
      <a class="back-btn" href="/movie">← Zurück</a>
      <div class="detail-hero">
        <div class="hero-bg" style="background-image:url('${img(data.backdrop_path, 'original')}')"></div>
        <div class="hero-fade"></div>
        <div class="detail-poster"><img src="${img(data.poster_path)}" alt="Poster ${escapeHtml(data.title)}"></div>
        <div class="detail-info">
          <div class="detail-eyebrow">Film</div>
          <h1 class="detail-title"> ${escapeHtml(data.title)} (${(data.release_date || '').slice(0,4)}) Ganzer Film Deutsch Stream Online anschauen </h1>
          <div class="detail-orig"> HD Stream • Kostenlos Online • Deutsch • ${(data.release_date || '').slice(0,4) || 'Jahr unbekannt'} </div>
          ${data.tagline ? `<div class="tagline">"${escapeHtml(data.tagline)}"</div>` : ''}
          <div class="detail-meta">
            <span class="m-item star">★ ${data.vote_average ? data.vote_average.toFixed(1) : '-'} / 10</span>
            <span class="m-item">${runtime}</span>
            <span class="m-item">${escapeHtml(data.status || '')}</span>
          </div>
          ${genreRow(data.genres)}
        </div>
      </div>
      <div class="section-block"><h3>Handlung</h3><div class="bio-text">${escapeHtml(data.overview) || 'Keine Handlung verfügbar.'}</div></div>
      ${nativeBannerAd()}
      <div class="section-block"><h3>Trailer</h3>${trailerBlock(videos)}</div>
      <div class="section-block"><h3>Besetzung</h3>${castGrid(credits)}</div>
      ${sideBannerAd()}
      ${movieJsonLd(data, `${SITE_URL}/movie/${id}/${encodeURIComponent(correctSlug)}`)}
    `;

    const headHtml = head({
      title: seoTitle('movie', data.title, (data.release_date || '').slice(0, 4)),
      description: seoDescription(data.title, (data.release_date || '').slice(0, 4), (data.genres || []).map(g => g.name).join(', ')),
      url: `${SITE_URL}/movie/${id}/${encodeURIComponent(correctSlug)}`,
      image: img(data.backdrop_path || data.poster_path, 'w780'),
      type: 'video.movie',
    });

    res.send(layout({ headHtml, bodyHtml, activeTab: 'movie' }));
  } catch (e) {
    res.status(404).send(layout({
      headHtml: head({
        title: 'Film nicht gefunden · CineBox',
        description: DEFAULT_DESC,
        url: `${SITE_URL}/movie/${id}`,
        robots: 'noindex, nofollow',
      }),
      bodyHtml: `<a class="back-btn" href="/movie">← Zurück</a><div class="empty">Dieser Film wurde nicht gefunden.</div>`,
      activeTab: 'movie',
    }));
  }
});

// ---------- DETAIL: /tv/:id/:slug? ----------
app.get('/tv/:id/:slug?', async (req, res) => {
  const { id } = req.params;
  try {
    const [data, credits, videos] = await Promise.all([
      tmdb(`/tv/${id}`),
      tmdb(`/tv/${id}/credits`),
      tmdb(`/tv/${id}/videos`),
    ]);
    const correctSlug = slugify(data.name);
    if (req.params.slug !== correctSlug) {
      return res.redirect(301, `/tv/${id}/${encodeURIComponent(correctSlug)}`);
    }

    const seasons = (data.seasons || []).filter(s => s.season_number >= 0);
    const seasonsHtml = seasons.map(s => `
      <div class="season-item" data-season="${s.season_number}" data-tv="${id}">
        <div class="season-head">
          <img src="${img(s.poster_path, 'w92')}" alt="${escapeHtml(s.name)}">
          <div>
            <div class="s-title">${escapeHtml(s.name)}</div>
            <div class="s-meta">${s.episode_count} Episoden · ${(s.air_date || '').slice(0, 4) || 'Jahr unbekannt'}</div>
          </div>
          <div class="chev">▶</div>
        </div>
        <div class="episode-panel"></div>
      </div>
    `).join('');

    const bodyHtml = `
      <a class="back-btn" href="/tv">← Zurück</a>
      <div class="detail-hero">
        <div class="hero-bg" style="background-image:url('${img(data.backdrop_path, 'original')}')"></div>
        <div class="hero-fade"></div>
        <div class="detail-poster"><img src="${img(data.poster_path)}" alt="Poster ${escapeHtml(data.name)}"></div>
        <div class="detail-info">
          <div class="detail-eyebrow">Serie</div>
          <h1 class="detail-title">${escapeHtml(data.name)}</h1>
          <div class="detail-orig">${escapeHtml(data.original_name)} · ${(data.first_air_date || '').slice(0, 4) || 'Jahr unbekannt'}</div>
          ${data.tagline ? `<div class="tagline">"${escapeHtml(data.tagline)}"</div>` : ''}
          <div class="detail-meta">
            <span class="m-item star">★ ${data.vote_average ? data.vote_average.toFixed(1) : '-'} / 10</span>
            <span class="m-item">${data.number_of_seasons || '-'} Staffeln</span>
            <span class="m-item">${data.number_of_episodes || '-'} Episoden</span>
            <span class="m-item">${escapeHtml(data.status || '')}</span>
          </div>
          ${genreRow(data.genres)}
        </div>
      </div>
     <div class="section-block">
  <h3>Besetzung</h3>
  ${castGrid(credits)}
</div>

${
  similar?.results?.length
    ? `
<div class="section-block">
  <h3>Ähnliche Filme</h3>
  <div class="poster-grid">
    ${similar.results
      .slice(0, 8)
      .map(item => posterCard(item, 'movie'))
      .join('')}
  </div>
</div>
`
    : ''
}

${sideBannerAd()}

${movieJsonLd(data, `${SITE_URL}/movie/${id}/${encodeURIComponent(correctSlug)}`)}
      ${nativeBannerAd()}
      <div class="section-block"><h3>Trailer</h3>${trailerBlock(videos)}</div>
      <div class="section-block"><h3>Besetzung</h3>${castGrid(credits)}</div>
      <div class="section-block">
        <h3>Staffeln &amp; Episoden</h3>
        <div class="season-list" id="season-list">${seasonsHtml}</div>
      </div>
      ${sideBannerAd()}
      ${tvJsonLd(data, `${SITE_URL}/tv/${id}/${encodeURIComponent(correctSlug)}`)}
    `;

    const headHtml = head({
      title: seoTitle('tv', data.name, (data.first_air_date || '').slice(0, 4)),
      description: seoDescription(data.name, (data.first_air_date || '').slice(0, 4), (data.genres || []).map(g => g.name).join(', ')),
      url: `${SITE_URL}/tv/${id}/${encodeURIComponent(correctSlug)}`,
      image: img(data.backdrop_path || data.poster_path, 'w780'),
      type: 'video.tv_show',
    });

    res.send(layout({ headHtml, bodyHtml, activeTab: 'tv' }));
  } catch (e) {
    res.status(404).send(layout({
      headHtml: head({
        title: 'Serie nicht gefunden · CineBox',
        description: DEFAULT_DESC,
        url: `${SITE_URL}/tv/${id}`,
        robots: 'noindex, nofollow',
      }),
      bodyHtml: `<a class="back-btn" href="/tv">← Zurück</a><div class="empty">Diese Serie wurde nicht gefunden.</div>`,
      activeTab: 'tv',
    }));
  }
});

// ---------- API proxy ----------
app.get('/api/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q.trim()) return res.json({ results: [] });
    const data = await tmdb('/search/multi', { query: q });
    const results = data.results
      .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
      .slice(0, 8)
      .map(r => ({
        id: r.id,
        type: r.media_type,
        title: r.title || r.name,
        year: (r.release_date || r.first_air_date || '').slice(0, 4),
        poster: img(r.poster_path, 'w92'),
        slug: slugify(r.title || r.name),
      }));
    res.json({ results });
  } catch (e) {
    res.status(500).json({ results: [], error: true });
  }
});

app.get('/api/season/:tvId/:seasonNumber', async (req, res) => {
  try {
    const { tvId, seasonNumber } = req.params;
    const data = await tmdb(`/tv/${tvId}/season/${seasonNumber}`);
    const episodes = (data.episodes || []).map(ep => ({
      number: ep.episode_number,
      name: ep.name,
      airDate: ep.air_date,
      rating: ep.vote_average ? ep.vote_average.toFixed(1) : '-',
      overview: ep.overview,
      still: img(ep.still_path, 'w300'),
    }));
    res.json({ episodes });
  } catch (e) {
    res.status(500).json({ episodes: [], error: true });
  }
});

// ---------- sitemap.xml ----------
app.get('/sitemap.xml', async (req, res) => {
  try {
    const [mp, mt, tp, tt] = await Promise.all([
      tmdb('/movie/popular'),
      tmdb('/movie/top_rated'),
      tmdb('/tv/popular'),
      tmdb('/tv/top_rated'),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const urls = [
      { loc: `${SITE_URL}/movie`, priority: '1.0', changefreq: 'daily' },
      { loc: `${SITE_URL}/tv`, priority: '1.0', changefreq: 'daily' },
      ...[...mp.results, ...mt.results].map(m => ({ loc: `${SITE_URL}/movie/${m.id}/${encodeURIComponent(slugify(m.title))}`, priority: '0.7', changefreq: 'weekly' })),
      ...[...tp.results, ...tt.results].map(t => ({ loc: `${SITE_URL}/tv/${t.id}/${encodeURIComponent(slugify(t.name))}`, priority: '0.7', changefreq: 'weekly' })),
    ];
    const uniq = [...new Map(urls.map(u => [u.loc, u])).values()];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniq.map(u => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>`;
    res.type('application/xml').send(xml);
  } catch (e) {
    res.status(500).send('');
  }
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
});

app.listen(PORT, () => {
  console.log(`CineBox (DE) Server läuft auf: http://localhost:${PORT}`);
});
