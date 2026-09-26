// Auditoria con Chromium real (playwright-core): capturas con y sin JS,
// consola/errores de hidratacion, bytes por tipo de recurso y origenes de
// terceros contactados. Contexto siempre limpio (sin localStorage, sin
// consentimiento de cookies previo).
import path from 'node:path';
import { chromium } from 'playwright-core';
import { ensureDir } from './util.mjs';

const HYDRATION_PATTERNS = [
  /minified react error #41[89]/i,
  /minified react error #42[35]/i,
  /hydrat/i,
  /\[hidrataci[oó]n\]/i,
];

function isHydrationMessage(text) {
  return HYDRATION_PATTERNS.some((re) => re.test(text));
}

function bucketResourceType(resourceType) {
  if (resourceType === 'document') return 'document';
  if (resourceType === 'script') return 'script';
  if (resourceType === 'stylesheet') return 'stylesheet';
  if (resourceType === 'font') return 'font';
  if (resourceType === 'image') return 'image';
  if (resourceType === 'xhr' || resourceType === 'fetch') return 'xhr_fetch';
  return 'other';
}

function emptyBytesByType() {
  return ['document', 'script', 'stylesheet', 'font', 'image', 'xhr_fetch', 'other'].reduce((acc, k) => {
    acc[k] = { transferBytes: 0, decodedBytes: 0, count: 0 };
    return acc;
  }, {});
}

/**
 * Abre `route` en un viewport/modo dado y recolecta evidencia.
 * @param {import('playwright-core').Browser} browser
 * @param {string} baseUrl
 * @param {string} route
 * @param {{width:number,height:number}} viewport
 * @param {boolean} jsEnabled
 * @param {string} screenshotPath
 */
async function auditOnePage(browser, baseUrl, route, viewport, jsEnabled, screenshotPath) {
  const context = await browser.newContext({
    viewport,
    javaScriptEnabled: jsEnabled,
    // Contexto nuevo = storage vacio: sin cookies de consentimiento, sin localStorage previo.
  });
  const page = await context.newPage();

  const consoleMessages = [];
  const pageErrors = [];
  const responses = [];
  const baseHost = new URL(baseUrl).hostname;

  page.on('console', (msg) => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err.message || String(err));
  });

  if (jsEnabled) {
    page.on('response', async (res) => {
      try {
        const req = res.request();
        let sizes = { requestBodySize: 0, requestHeadersSize: 0, responseBodySize: 0, responseHeadersSize: 0 };
        try {
          sizes = await req.sizes();
        } catch {
          /* algunas respuestas (redirects, data:) no exponen sizes */
        }
        let decodedBytes = null;
        try {
          const body = await res.body();
          decodedBytes = body.length;
        } catch {
          /* respuestas sin cuerpo accesible (redirect, cache 304, opaque) */
        }
        responses.push({
          url: res.url(),
          status: res.status(),
          resourceType: req.resourceType(),
          transferBytes: sizes.responseBodySize,
          decodedBytes,
          hostname: (() => {
            try {
              return new URL(res.url()).hostname;
            } catch {
              return null;
            }
          })(),
        });
      } catch {
        /* si una respuesta individual falla al inspeccionarse, se ignora esa entrada */
      }
    });
  }

  let navError = null;
  const start = Date.now();
  try {
    await page.goto(new URL(route, baseUrl).toString(), {
      waitUntil: jsEnabled ? 'networkidle' : 'load',
      timeout: 30000,
    });
    if (jsEnabled) {
      // margen breve para capturar console errors asincronos post-idle (p.ej. hidratacion tardia)
      await page.waitForTimeout(750);
    }
  } catch (e) {
    navError = e.message;
  }
  const loadTimeMs = Date.now() - start;

  ensureDir(path.dirname(screenshotPath));
  try {
    await page.screenshot({ path: screenshotPath, fullPage: true, timeout: 15000 });
  } catch (e) {
    navError = navError || `screenshot: ${e.message}`;
  }

  await context.close();

  const bytesByType = emptyBytesByType();
  const thirdPartyOrigins = new Set();
  for (const r of responses) {
    const bucket = bucketResourceType(r.resourceType);
    bytesByType[bucket].transferBytes += r.transferBytes || 0;
    bytesByType[bucket].decodedBytes += r.decodedBytes || 0;
    bytesByType[bucket].count += 1;
    if (r.hostname && r.hostname !== baseHost) thirdPartyOrigins.add(r.hostname);
  }

  const consoleErrors = consoleMessages.filter((m) => m.type === 'error').map((m) => m.text);
  const consoleWarnings = consoleMessages.filter((m) => m.type === 'warning').map((m) => m.text);
  const allText = [...consoleErrors, ...consoleWarnings, ...pageErrors];
  const hydrationIssues = allText.filter(isHydrationMessage);

  return {
    loadTimeMs,
    navError,
    consoleErrors,
    consoleWarnings,
    pageErrors,
    hydrationIssues,
    bytesByType: jsEnabled ? bytesByType : null,
    thirdPartyOrigins: jsEnabled ? [...thirdPartyOrigins] : [],
    screenshot: screenshotPath,
  };
}


/**
 * Corre las 4 combinaciones (mobile/desktop x sin-JS/con-JS) para una ruta.
 */
export async function auditRoute(browser, baseUrl, route, { mobileViewport, desktopViewport, screenshotDir, slug }) {
  const paths = {
    mobileNoJs: `${screenshotDir}/mobile-nojs-${slug}.png`,
    mobileJs: `${screenshotDir}/mobile-js-${slug}.png`,
    desktopNoJs: `${screenshotDir}/desktop-nojs-${slug}.png`,
    desktopJs: `${screenshotDir}/desktop-js-${slug}.png`,
  };

  const [mobileNoJs, mobileJs, desktopNoJs, desktopJs] = await Promise.all([
    auditOnePage(browser, baseUrl, route, mobileViewport, false, paths.mobileNoJs),
    auditOnePage(browser, baseUrl, route, mobileViewport, true, paths.mobileJs),
    auditOnePage(browser, baseUrl, route, desktopViewport, false, paths.desktopNoJs),
    auditOnePage(browser, baseUrl, route, desktopViewport, true, paths.desktopJs),
  ]);

  return {
    mobile: mergeNoJsJs(mobileNoJs, mobileJs),
    desktop: mergeNoJsJs(desktopNoJs, desktopJs),
  };
}

function mergeNoJsJs(noJs, js) {
  return {
    noJs: {
      loadTimeMs: noJs.loadTimeMs,
      navError: noJs.navError,
      screenshot: noJs.screenshot,
    },
    js: {
      loadTimeMs: js.loadTimeMs,
      navError: js.navError,
      consoleErrors: js.consoleErrors,
      consoleWarnings: js.consoleWarnings,
      pageErrors: js.pageErrors,
      hydrationIssues: js.hydrationIssues,
      bytesByType: js.bytesByType,
      thirdPartyOrigins: js.thirdPartyOrigins,
      screenshot: js.screenshot,
    },
  };
}

export async function launchBrowser(chromePath) {
  return chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });
}
