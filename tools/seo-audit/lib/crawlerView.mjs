// Vista de rastreador: que ve un bot que NO ejecuta JavaScript.
// Fetch crudo con un User-Agent de bot, parseo con node-html-parser.
import { parse } from 'node-html-parser';
import { writeText } from './util.mjs';

const OG_PROPS = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'og:locale'];

function textOf(el) {
  if (!el) return null;
  const t = el.text ?? el.textContent ?? '';
  return t.replace(/\s+/g, ' ').trim();
}

function countVisibleWords(root) {
  const body = root.querySelector('body');
  if (!body) return 0;
  const clone = parse(body.outerHTML);
  for (const sel of ['script', 'style', 'noscript', 'template']) {
    clone.querySelectorAll(sel).forEach((n) => n.remove());
  }
  const text = (clone.text || '').replace(/\s+/g, ' ').trim();
  if (!text) return 0;
  return text.split(' ').filter(Boolean).length;
}

function extractInternalLinks(root, baseUrl) {
  const origin = new URL(baseUrl).origin;
  const hrefs = root
    .querySelectorAll('a[href]')
    .map((a) => a.getAttribute('href'))
    .filter(Boolean);
  const internal = [];
  for (const href of hrefs) {
    const trimmed = href.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (/^(mailto|tel|javascript):/i.test(trimmed)) continue;
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
      internal.push(trimmed);
      continue;
    }
    try {
      const resolved = new URL(trimmed, baseUrl);
      if (resolved.origin === origin) internal.push(trimmed);
    } catch {
      // no es una URL valida ni una ruta relativa; se ignora
    }
  }
  return internal;
}

function extractJsonLd(root) {
  const scripts = root.querySelectorAll('script[type="application/ld+json"]');
  return scripts.map((s) => {
    const raw = s.text || '';
    try {
      const data = JSON.parse(raw);
      const items = Array.isArray(data) ? data : data['@graph'] ? data['@graph'] : [data];
      const types = items.map((it) => it && it['@type']).filter(Boolean);
      return { valid: true, types, raw };
    } catch (e) {
      return { valid: false, error: e.message, raw };
    }
  });
}

function extractIcons(root) {
  const links = root.querySelectorAll('link');
  const byRel = (predicate) =>
    links
      .filter((l) => predicate((l.getAttribute('rel') || '').toLowerCase().split(/\s+/)))
      .map((l) => l.getAttribute('href'));
  return {
    icon: byRel((rels) => rels.includes('icon')),
    appleTouchIcon: byRel((rels) => rels.includes('apple-touch-icon')),
    manifest: byRel((rels) => rels.includes('manifest')),
  };
}

/**
 * Descarga una ruta con un User-Agent de bot (sin ejecutar JS) y extrae todo lo
 * que un rastreador vería. Guarda el HTML crudo en `rawHtmlPath` si se provee.
 */
export async function fetchCrawlerView(baseUrl, route, ua, rawHtmlPath) {
  const url = new URL(route, baseUrl).toString();
  const start = Date.now();
  const res = await fetch(url, {
    headers: { 'User-Agent': ua, Accept: 'text/html,application/xhtml+xml' },
    redirect: 'follow',
  });
  const durationMs = Date.now() - start;
  const status = res.status;
  const finalUrl = res.url;
  const redirected = res.redirected;
  const contentType = res.headers.get('content-type');
  const xRobotsTag = res.headers.get('x-robots-tag');
  const html = await res.text();

  if (rawHtmlPath) writeText(rawHtmlPath, html);

  const root = parse(html, { comment: false });

  const title = textOf(root.querySelector('title'));
  const metaDescriptionEl = root.querySelector('meta[name="description"]');
  const metaDescription = metaDescriptionEl ? metaDescriptionEl.getAttribute('content') : null;
  const canonicalEl = root.querySelector('link[rel="canonical"]');
  const canonical = canonicalEl ? canonicalEl.getAttribute('href') : null;
  const metaRobotsEl = root.querySelector('meta[name="robots"]');
  const metaRobots = metaRobotsEl ? metaRobotsEl.getAttribute('content') : null;
  const htmlLang = root.querySelector('html') ? root.querySelector('html').getAttribute('lang') : null;
  const h1s = root.querySelectorAll('h1').map((h) => textOf(h));

  const og = {};
  for (const prop of OG_PROPS) {
    const el = root.querySelector(`meta[property="${prop}"]`);
    og[prop] = el ? el.getAttribute('content') : null;
  }
  const twitterCardEl = root.querySelector('meta[name="twitter:card"]');
  const twitterCard = twitterCardEl ? twitterCardEl.getAttribute('content') : null;

  return {
    url,
    finalUrl,
    redirected,
    status,
    contentType,
    xRobotsTag,
    durationMs,
    htmlLang,
    title,
    metaDescription,
    metaDescriptionLength: metaDescription ? metaDescription.length : 0,
    canonical,
    metaRobots,
    h1Count: h1s.length,
    h1Texts: h1s,
    wordCount: countVisibleWords(root),
    internalLinks: (() => {
      const links = extractInternalLinks(root, url);
      return { count: links.length, hrefs: [...new Set(links)] };
    })(),
    jsonLd: extractJsonLd(root),
    og,
    twitterCard,
    icons: extractIcons(root),
    htmlBytes: Buffer.byteLength(html, 'utf8'),
  };
}
