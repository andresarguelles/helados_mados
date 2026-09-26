// Configuracion compartida por todo el pipeline de auditoria.
// Nada aqui depende del codigo de src/: la herramienta debe funcionar igual
// contra produccion que contra un preview local, sin asumir nada del bundle.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LIB_DIR = path.dirname(fileURLToPath(import.meta.url));
export const TOOL_DIR = path.resolve(LIB_DIR, '..');
export const REPO_ROOT = path.resolve(TOOL_DIR, '..', '..');

// Rutas de la app a auditar en cada seccion (vista de rastreador, HTTP, Playwright).
export const ROUTES = ['/', '/canjear', '/login', '/terminos', '/privacidad', '/eliminar-cuenta'];

// Subconjunto para Lighthouse (el que pide la tarea, no todas las rutas).
export const LIGHTHOUSE_ROUTES = ['/', '/canjear', '/terminos', '/privacidad'];

// Subconjunto para PSI (el que pide la tarea).
export const PSI_ROUTES = ['/', '/canjear'];

// Paths fijos para la matriz HTTP (sin seguir redirects).
export const STATIC_PATHS = [
  '/robots.txt',
  '/sitemap.xml',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/site.webmanifest',
  '/esta-ruta-no-existe-seo',
  '/cuenta',
  '/aviso-de-privacidad',
  '/canjear/',
  '/auth/callback?code=x',
  '/perfil',
  '/admin',
];

export const GOOGLEBOT_SMARTPHONE_UA =
  'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/125.0.6422.112 Mobile Safari/537.36 ' +
  '(compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

export const FACEBOOK_UA = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';

export const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/128.0.0.0 Safari/537.36 seo-audit-helados-mados/1.0 (+https://www.heladosmados.com)';

export const CRAWLER_UAS = {
  googlebot: GOOGLEBOT_SMARTPHONE_UA,
  facebookexternalhit: FACEBOOK_UA,
};

export const VIEWPORTS = {
  mobile: { width: 412, height: 915 },
  desktop: { width: 1350, height: 940 },
};

/**
 * Busca el Chromium de Playwright ya instalado localmente (sin descargar nada).
 * Prioridad: CHROME_PATH env var > cache de Playwright (chromium-*) > Edge instalado.
 */
export function resolveChromePath() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local');
  const playwrightCacheDirs = [
    path.join(localAppData, 'ms-playwright'),
    path.join(process.env.USERPROFILE || '', '.cache', 'ms-playwright'),
  ];

  const found = [];
  for (const cacheDir of playwrightCacheDirs) {
    if (!fs.existsSync(cacheDir)) continue;
    for (const entry of fs.readdirSync(cacheDir)) {
      const match = entry.match(/^chromium-(\d+)$/);
      if (!match) continue;
      const candidate = path.join(cacheDir, entry, 'chrome-win64', 'chrome.exe');
      if (fs.existsSync(candidate)) found.push({ rev: Number(match[1]), candidate });
    }
  }
  if (found.length > 0) {
    found.sort((a, b) => b.rev - a.rev);
    return found[0].candidate;
  }

  const edgeCandidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  for (const c of edgeCandidates) {
    if (fs.existsSync(c)) return c;
  }

  throw new Error(
    'No se encontro ningun Chromium/Edge utilizable. Define CHROME_PATH o instala el Chromium de Playwright.'
  );
}

export function isProductionBase(baseUrl) {
  try {
    const host = new URL(baseUrl).hostname;
    return host === 'www.heladosmados.com' || host === 'heladosmados.com';
  } catch {
    return false;
  }
}

export function isLocalhostBase(baseUrl) {
  try {
    const host = new URL(baseUrl).hostname;
    return host === 'localhost' || host === '127.0.0.1';
  } catch {
    return false;
  }
}
