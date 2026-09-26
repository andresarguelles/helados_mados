// Matriz HTTP: status/Location/content-type/cache-control/content-encoding
// sin seguir redirects, mas el tamano transferido (bytes en la red) y
// descomprimido de los assets que referencia el HTML de "/".
import http from 'node:http';
import https from 'node:https';
import { DEFAULT_UA } from './config.mjs';

/** Verifica una ruta con redirect:manual, sin seguir la redireccion. */
export async function checkPath(baseUrl, routePath) {
  const url = new URL(routePath, baseUrl).toString();
  const res = await fetch(url, {
    headers: { 'User-Agent': DEFAULT_UA, Accept: '*/*' },
    redirect: 'manual',
  });
  const status = res.status;
  const location = res.headers.get('location');
  const contentType = res.headers.get('content-type');
  const cacheControl = res.headers.get('cache-control');
  const contentEncoding = res.headers.get('content-encoding');

  let extra = {};
  // Para 3xx (incluido el "opaqueredirect" tipo 0 si el runtime lo forzara) no
  // intentamos leer cuerpo: no aporta y algunos runtimes lo dejan vacio.
  const canReadBody = status !== 0 && status < 300;
  let bodyText = null;
  if (canReadBody) {
    bodyText = await res.text().catch(() => null);
  }

  if (routePath === '/robots.txt') {
    extra = {
      hasSitemapDirective: bodyText ? /^\s*sitemap:/im.test(bodyText) : false,
      body: bodyText,
    };
  } else if (routePath === '/sitemap.xml') {
    const looksXml = bodyText
      ? /^\s*<\?xml/i.test(bodyText) || /<urlset[\s>]/i.test(bodyText) || /<sitemapindex[\s>]/i.test(bodyText)
      : false;
    const locCount = bodyText ? (bodyText.match(/<loc>/gi) || []).length : 0;
    extra = { looksXml, locCount, bodyPreview: bodyText ? bodyText.slice(0, 500) : null };
  }

  return { path: routePath, url, status, location, contentType, cacheControl, contentEncoding, ...extra };
}

/** Sigue una cadena de redirects hop a hop (solo status/location), sin ejecutar nada. */
export async function followRedirectChain(startUrl, maxHops = 6) {
  const hops = [];
  let current = startUrl;
  for (let i = 0; i < maxHops; i++) {
    const res = await fetch(current, {
      headers: { 'User-Agent': DEFAULT_UA },
      redirect: 'manual',
    });
    const location = res.headers.get('location');
    hops.push({ url: current, status: res.status, location });
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, current).toString();
      continue;
    }
    break;
  }
  return hops;
}

function rawGet(urlStr, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const mod = urlStr.startsWith('https') ? https : http;
    const req = mod.get(
      urlStr,
      { headers: { 'Accept-Encoding': 'br, gzip, deflate', 'User-Agent': DEFAULT_UA } },
      (res) => {
        let bytes = 0;
        res.on('data', (chunk) => {
          bytes += chunk.length;
        });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, wireBytes: bytes }));
        res.on('error', reject);
      }
    );
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')));
  });
}

/**
 * Mide un asset: bytes transferidos (crudos, tal como viajan comprimidos por la
 * red) via una peticion http/https de bajo nivel, y bytes descomprimidos via
 * fetch (undici descomprime automaticamente segun Content-Encoding).
 */
export async function checkAsset(url) {
  const [rawResult, decodedResult] = await Promise.allSettled([
    rawGet(url),
    fetch(url, { headers: { 'User-Agent': DEFAULT_UA } }).then(async (r) => {
      const buf = await r.arrayBuffer();
      return {
        status: r.status,
        headers: Object.fromEntries(r.headers.entries()),
        decodedBytes: buf.byteLength,
      };
    }),
  ]);

  const raw = rawResult.status === 'fulfilled' ? rawResult.value : null;
  const decoded = decodedResult.status === 'fulfilled' ? decodedResult.value : null;

  return {
    url,
    transferSize: raw ? raw.wireBytes : null,
    decodedSize: decoded ? decoded.decodedBytes : null,
    contentType: (decoded && decoded.headers['content-type']) || (raw && raw.headers['content-type']) || null,
    cacheControl: (decoded && decoded.headers['cache-control']) || (raw && raw.headers['cache-control']) || null,
    contentEncoding: (raw && raw.headers['content-encoding']) || null,
    error: rawResult.status === 'rejected' ? rawResult.reason.message : decodedResult.status === 'rejected' ? decodedResult.reason.message : null,
  };
}

/** Extrae las URLs de /assets/*.js|css referenciadas en un HTML (script src, link stylesheet). */
export function extractAssetUrls(html, baseUrl) {
  const urls = new Set();
  const scriptRe = /<script[^>]+src=["']([^"']+)["']/gi;
  const linkRe = /<link[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = scriptRe.exec(html))) {
    if (/\/assets\/.*\.(js|css)(\?|$)/i.test(m[1])) urls.add(new URL(m[1], baseUrl).toString());
  }
  while ((m = linkRe.exec(html))) {
    const tag = m[0];
    const href = m[1];
    if (/rel=["']stylesheet["']/i.test(tag) || /\/assets\/.*\.(js|css)(\?|$)/i.test(href)) {
      if (/\/assets\/.*\.(js|css)(\?|$)/i.test(href)) urls.add(new URL(href, baseUrl).toString());
    }
  }
  return [...urls];
}
