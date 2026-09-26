#!/usr/bin/env node
// Herramienta de auditoria SEO/rendimiento reproducible para Helados Mados.
// Uso:
//   node audit.mjs --base <url> --label <antes|local|despues> [--out <dir>]
//                  [--runs 3] [--no-lighthouse] [--no-psi] [--chrome <path>]
//
// No depende de nada bajo src/: funciona igual contra produccion que contra
// un preview local. Toda medicion queda guardada en disco.
import path from 'node:path';
import fs from 'node:fs';

import {
  ROUTES,
  LIGHTHOUSE_ROUTES,
  PSI_ROUTES,
  STATIC_PATHS,
  CRAWLER_UAS,
  DEFAULT_UA,
  VIEWPORTS,
  REPO_ROOT,
  resolveChromePath,
  isProductionBase,
  isLocalhostBase,
} from './lib/config.mjs';
import { ensureDir, writeJson, writeText, nowIso, routeSlug, log, tryOrRecord } from './lib/util.mjs';
import { fetchCrawlerView } from './lib/crawlerView.mjs';
import { checkPath, checkAsset, extractAssetUrls, followRedirectChain } from './lib/httpMatrix.mjs';
import { launchBrowser, auditRoute } from './lib/browserAudit.mjs';
import { runLighthouse } from './lib/lighthouseAudit.mjs';
import { runPsi } from './lib/psi.mjs';
import { buildMarkdown } from './lib/report.mjs';

function parseArgs(argv) {
  const args = { runs: 3, lighthouse: true, psi: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base') args.base = argv[++i];
    else if (a === '--label') args.label = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--runs') args.runs = Number(argv[++i]);
    else if (a === '--no-lighthouse') args.lighthouse = false;
    else if (a === '--no-psi') args.psi = false;
    else if (a === '--chrome') args.chrome = argv[++i];
    else {
      console.error(`Argumento desconocido: ${a}`);
      process.exit(1);
    }
  }
  if (!args.base) {
    console.error('Falta --base <url>');
    process.exit(1);
  }
  if (!args.label) {
    console.error('Falta --label <antes|local|despues>');
    process.exit(1);
  }
  if (!['antes', 'local', 'despues'].includes(args.label)) {
    console.warn(`Aviso: --label "${args.label}" no es uno de antes|local|despues (se continua igual).`);
  }
  return args;
}

function readToolVersions() {
  const pkgPath = path.join(REPO_ROOT, 'tools', 'seo-audit', 'package.json');
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return pkg.dependencies || {};
  } catch {
    return {};
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = args.base.replace(/\/+$/, '') + '/';
  const outDir = args.out ? path.resolve(args.out) : path.join(REPO_ROOT, 'docs', 'seo', 'evidencia', args.label);
  const rawDir = path.join(outDir, 'raw');
  const screenshotsDir = path.join(outDir, 'screenshots');
  const lighthouseDir = path.join(outDir, 'lighthouse');
  const psiDir = path.join(outDir, 'psi');
  for (const d of [outDir, rawDir, screenshotsDir, lighthouseDir, psiDir]) ensureDir(d);

  const chromePath = args.chrome || resolveChromePath();
  log('Base:', base);
  log('Label:', args.label);
  log('Salida:', outDir);
  log('Chromium:', chromePath);

  const errores = [];

  // ---------------------------------------------------------------
  // 1. Vista de rastreador (sin JS)
  // ---------------------------------------------------------------
  log('=== 1/5 Vista de rastreador (sin JS) ===');
  const vistaRastreador = {};
  for (const route of ROUTES) {
    vistaRastreador[route] = {};
    for (const [uaName, ua] of Object.entries(CRAWLER_UAS)) {
      const rawPath = path.join(rawDir, `${routeSlug(route)}__${uaName}.html`);
      vistaRastreador[route][uaName] = await tryOrRecord(
        errores,
        { seccion: 'vistaRastreador', ruta: route, ua: uaName },
        () => fetchCrawlerView(base, route, ua, rawPath),
        { error: 'fallo la peticion, ver errores[]' }
      );
    }
  }

  // ---------------------------------------------------------------
  // 2. Matriz HTTP
  // ---------------------------------------------------------------
  log('=== 2/5 Matriz HTTP ===');
  const httpPaths = {};
  for (const p of STATIC_PATHS) {
    httpPaths[p] = await tryOrRecord(errores, { seccion: 'httpMatrix', ruta: p }, () => checkPath(base, p), {
      error: 'fallo la peticion, ver errores[]',
    });
  }

  let homeHtmlForAssets = null;
  try {
    const res = await fetch(base, { headers: { 'User-Agent': DEFAULT_UA } });
    homeHtmlForAssets = await res.text();
  } catch (e) {
    errores.push({ seccion: 'httpMatrix.assets', ruta: '/', mensaje: `no se pudo descargar / para extraer assets: ${e.message}` });
  }
  const assets = [];
  if (homeHtmlForAssets) {
    const assetUrls = extractAssetUrls(homeHtmlForAssets, base);
    for (const u of assetUrls) {
      const result = await tryOrRecord(errores, { seccion: 'httpMatrix.assets', ruta: u }, () => checkAsset(u), {
        url: u,
        error: 'fallo la peticion, ver errores[]',
      });
      assets.push(result);
    }
  }

  let redirectChains = null;
  if (isProductionBase(base)) {
    redirectChains = {};
    for (const start of ['http://heladosmados.com/', 'https://heladosmados.com/']) {
      redirectChains[start] = await tryOrRecord(
        errores,
        { seccion: 'httpMatrix.redirectChains', ruta: start },
        () => followRedirectChain(start),
        [{ url: start, error: 'fallo, ver errores[]' }]
      );
    }
  }

  // ---------------------------------------------------------------
  // 3. Playwright
  // ---------------------------------------------------------------
  log('=== 3/5 Playwright (capturas, consola, bytes, terceros) ===');
  const playwright = {};
  {
    const browser = await launchBrowser(chromePath);
    try {
      for (const route of ROUTES) {
        const slug = routeSlug(route);
        log('Playwright ->', route);
        playwright[route] = await tryOrRecord(
          errores,
          { seccion: 'playwright', ruta: route },
          () =>
            auditRoute(browser, base, route, {
              mobileViewport: VIEWPORTS.mobile,
              desktopViewport: VIEWPORTS.desktop,
              screenshotDir: screenshotsDir,
              slug,
            }),
          null
        );
      }
    } finally {
      await browser.close();
    }
  }

  // ---------------------------------------------------------------
  // 4. Lighthouse
  // ---------------------------------------------------------------
  const lighthouse = {};
  if (args.lighthouse) {
    log('=== 4/5 Lighthouse (mediana de', args.runs, 'corridas) ===');
    for (const route of LIGHTHOUSE_ROUTES) {
      const slug = routeSlug(route);
      const url = new URL(route, base).toString();
      lighthouse[route] = {};
      for (const formFactor of ['mobile', 'desktop']) {
        lighthouse[route][formFactor] = await tryOrRecord(
          errores,
          { seccion: 'lighthouse', ruta: route, formFactor },
          () => runLighthouse({ url, formFactor, runs: args.runs, chromePath, outDir: lighthouseDir, slug }),
          null
        );
      }
    }
  } else {
    log('=== 4/5 Lighthouse OMITIDO (--no-lighthouse) ===');
  }

  // ---------------------------------------------------------------
  // 5. PSI
  // ---------------------------------------------------------------
  let psi = null;
  if (args.psi && !isLocalhostBase(base)) {
    log('=== 5/5 PageSpeed Insights API ===');
    psi = {};
    for (const route of PSI_ROUTES) {
      const slug = routeSlug(route);
      const url = new URL(route, base).toString();
      psi[route] = {};
      for (const strategy of ['mobile', 'desktop']) {
        psi[route][strategy] = await runPsi({ url, strategy, apiKey: process.env.PSI_API_KEY, outDir: psiDir, slug });
        if (!psi[route][strategy].medido) {
          errores.push({
            seccion: 'psi',
            ruta: route,
            mensaje: `${strategy}: no medido — ${psi[route][strategy].motivo}`,
          });
        }
      }
    }
  } else if (!args.psi) {
    log('=== 5/5 PSI OMITIDO (--no-psi) ===');
  } else {
    log('=== 5/5 PSI OMITIDO (base es localhost) ===');
  }

  // ---------------------------------------------------------------
  // Resumen final
  // ---------------------------------------------------------------
  const resumen = {
    meta: {
      base,
      label: args.label,
      fecha: nowIso(),
      runs: args.runs,
      chromePath,
      nodeVersion: process.version,
      toolVersions: readToolVersions(),
    },
    rutas: ROUTES,
    vistaRastreador,
    httpMatrix: { paths: httpPaths, assets, redirectChains },
    playwright,
    lighthouse,
    psi,
    errores,
  };

  writeJson(path.join(outDir, 'resumen.json'), resumen);
  writeText(path.join(outDir, 'resumen.md'), buildMarkdown(resumen));

  log('Listo. Resumen en', path.join(outDir, 'resumen.json'), 'y', path.join(outDir, 'resumen.md'));
  log('Errores registrados:', errores.length);
}

main().catch((e) => {
  console.error('FALLO NO CAPTURADO:', e);
  process.exit(1);
});
