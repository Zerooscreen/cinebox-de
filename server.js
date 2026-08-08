const express = require('express');
const path = require('path');
const { tmdb, img, slugify } = require('./lib/tmdb');
const { head, layout, posterCard, genreRow, trailerBlock, castGrid, mockPlayerBlock, escapeHtml, movieJsonLd, tvJsonLd, personJsonLd, sideBannerAd, nativeBannerAd, DEFAULT_TITLE, DEFAULT_DESC, SITE_NAME } = require('./lib/render');

const app = express();
const PORT = process.env.PORT || 3000;

// Domain resmi situs
const SITE_URL = process.env.SITE_URL || 'https://www.zerocinema.duckdns.org';

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

// ---------- SEO-Titel & Beschreibung ----------
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

// ---------- DETAIL PAGES ----------
app.get('/movie/:id/:slug?', async (req, res) => {
  const { id } = req.params;
  try {
    const [data, credits, videos, similar] = await Promise.all([
      tmdb(`/movie/${id}`), tmdb(`/movie/${id}/credits`), tmdb(`/movie/${id}/videos`), tmdb(`/movie/${id}/similar`)
    ]);
    const correctSlug = slugify(data.title);
    if (req.params.slug !== correctSlug) return res.redirect(301, `/movie/${id}/${encodeURIComponent(correctSlug)}`);

    const bodyHtml = `
      <a class="back-btn" href="/movie">← Zurück</a>
      <div class="detail-hero">
        <div class="hero-bg" style="background-image:url('${img(data.backdrop_path, 'original')}')"></div>
        <div class="hero-fade"></div>
        <div class="detail-poster"><img src="${img(data.poster_path)}" alt="Poster ${escapeHtml(data.title)}"></div>
        <div class="detail-info">
          <h1 class="detail-title">${escapeHtml(data.title)}</h1>
          <div class="detail-meta">★ ${data.vote_average ? data.vote_average.toFixed(1) : '-'} / 10</div>
          ${genreRow(data.genres)}
        </div>
      </div>
      ${mockPlayerBlock(data.backdrop_path || data.poster_path, data.title)}
      <div class="section-block" id="handlung"><h3>Handlung</h3><div class="bio-text">${escapeHtml(data.overview)}</div></div>
      ${trailerBlock(videos)}
      ${castGrid(credits)}
      ${movieJsonLd(data, `${SITE_URL}/movie/${id}/${encodeURIComponent(correctSlug)}`)}
    `;
    res.send(layout({ headHtml: head({ title: data.title, url: `${SITE_URL}/movie/${id}/${correctSlug}`, image: img(data.backdrop_path, 'w780') }), bodyHtml, activeTab: 'movie' }));
  } catch (e) { res.status(404).send('Not Found'); }
});

app.get('/tv/:id/:slug?', async (req, res) => {
  const { id } = req.params;
  try {
    const [data, credits, videos] = await Promise.all([
      tmdb(`/tv/${id}`), tmdb(`/tv/${id}/credits`), tmdb(`/tv/${id}/videos`)
    ]);
    const correctSlug = slugify(data.name);
    if (req.params.slug !== correctSlug) return res.redirect(301, `/tv/${id}/${encodeURIComponent(correctSlug)}`);

    const bodyHtml = `
      <a class="back-btn" href="/tv">← Zurück</a>
      <div class="detail-hero"><h1 class="detail-title">${escapeHtml(data.name)}</h1></div>
      ${mockPlayerBlock(data.backdrop_path || data.poster_path, data.name)}
      <div class="section-block"><h3>Handlung</h3><div>${escapeHtml(data.overview)}</div></div>
      ${trailerBlock(videos)}
      ${castGrid(credits)}
      ${tvJsonLd(data, `${SITE_URL}/tv/${id}/${encodeURIComponent(correctSlug)}`)}
    `;
    res.send(layout({ headHtml: head({ title: data.name, url: `${SITE_URL}/tv/${id}/${correctSlug}`, image: img(data.backdrop_path, 'w780') }), bodyHtml, activeTab: 'tv' }));
  } catch (e) { res.status(404).send('Not Found'); }
});

// ---------- DYNAMIC SITEMAP & ROBOTS ----------
app.get('/sitemap.xml', async (req, res) => {
  try {
    const [mp, mt, tp, tt] = await Promise.all([
      tmdb('/movie/popular').catch(() => ({ results: [] })),
      tmdb('/movie/top_rated').catch(() => ({ results: [] })),
      tmdb('/tv/popular').catch(() => ({ results: [] })),
      tmdb('/tv/top_rated').catch(() => ({ results: [] })),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const urls = [
      { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'daily' },
      { loc: `${SITE_URL}/movie`, priority: '1.0', changefreq: 'daily' },
      { loc: `${SITE_URL}/tv`, priority: '1.0', changefreq: 'daily' },
      ...[...(mp.results || []), ...(mt.results || [])].map(m => ({ 
        loc: `${SITE_URL}/movie/${m.id}/${encodeURIComponent(slugify(m.title) || 'film')}`, 
        priority: '0.7', changefreq: 'weekly' 
      })),
      ...[...(tp.results || []), ...(tt.results || [])].map(t => ({ 
        loc: `${SITE_URL}/tv/${t.id}/${encodeURIComponent(slugify(t.name) || 'serial')}`, 
        priority: '0.7', changefreq: 'weekly' 
      })),
    ];

    const uniq = [...new Map(urls.map(u => [u.loc, u])).values()];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniq.map(u => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>`;

    res.type('application/xml').send(xml);
  } catch (e) {
    res.status(500).send('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
});

app.listen(PORT, () => {
  console.log(`CineBox Server running on: http://localhost:${PORT}`);
});
