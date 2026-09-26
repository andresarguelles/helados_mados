#!/usr/bin/env node
// Compara dos corridas de audit.mjs (p.ej. "antes" vs "despues") leyendo sus
// resumen.json y generando comparacion.json + comparacion.md con deltas por
// metrica y por check (pasa/falla antes -> despues).
//
// Uso: node compare.mjs --antes <dir> --despues <dir> [--out <dir>]
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, writeJson, writeText, nowIso } from './lib/util.mjs';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--antes') args.antes = argv[++i];
    else if (a === '--despues') args.despues = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else {
      console.error(`Argumento desconocido: ${a}`);
      process.exit(1);
    }
  }
  if (!args.antes || !args.despues) {
    console.error('Uso: node compare.mjs --antes <dir> --despues <dir> [--out <dir>]');
    process.exit(1);
  }
  return args;
}

function loadResumen(dir) {
  const p = path.join(path.resolve(dir), 'resumen.json');
  if (!fs.existsSync(p)) throw new Error(`No existe ${p}`);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function num(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function deltaNum(a, b) {
  const na = num(a);
  const nb = num(b);
  if (na === null || nb === null) return { antes: a ?? null, despues: b ?? null, delta: null };
  return { antes: na, despues: nb, delta: nb - na };
}

function deltaVal(a, b) {
  const changed = JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
  return { antes: a ?? null, despues: b ?? null, cambio: changed };
}

// ---------------------------------------------------------------------------
// Vista de rastreador
// ---------------------------------------------------------------------------
function compareVistaRastreador(antes, despues) {
  const out = {};
  const routes = new Set([...Object.keys(antes || {}), ...Object.keys(despues || {})]);
  for (const route of routes) {
    out[route] = {};
    const uas = new Set([...Object.keys((antes || {})[route] || {}), ...Object.keys((despues || {})[route] || {})]);
    for (const ua of uas) {
      const a = (antes[route] || {})[ua] || {};
      const b = (despues[route] || {})[ua] || {};
      const ogCompleteA = Object.values(a.og || {}).length > 0 && Object.values(a.og || {}).every(Boolean);
      const ogCompleteB = Object.values(b.og || {}).length > 0 && Object.values(b.og || {}).every(Boolean);
      out[route][ua] = {
        status: deltaVal(a.status, b.status),
        contentType: deltaVal(a.contentType, b.contentType),
        htmlLang: deltaVal(a.htmlLang, b.htmlLang),
        title: deltaVal(a.title, b.title),
        metaDescriptionLength: deltaNum(a.metaDescriptionLength, b.metaDescriptionLength),
        canonical: deltaVal(a.canonical, b.canonical),
        metaRobots: deltaVal(a.metaRobots, b.metaRobots),
        xRobotsTag: deltaVal(a.xRobotsTag, b.xRobotsTag),
        h1Count: deltaNum(a.h1Count, b.h1Count),
        wordCount: deltaNum(a.wordCount, b.wordCount),
        internalLinksCount: deltaNum(a.internalLinks?.count, b.internalLinks?.count),
        jsonLdTypes: deltaVal(
          (a.jsonLd || []).map((j) => (j.valid ? j.types.join('/') : 'INVALIDO')),
          (b.jsonLd || []).map((j) => (j.valid ? j.types.join('/') : 'INVALIDO'))
        ),
        ogCompleto: deltaVal(ogCompleteA, ogCompleteB),
        twitterCard: deltaVal(a.twitterCard, b.twitterCard),
      };
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Matriz HTTP
// ---------------------------------------------------------------------------
function compareHttpMatrix(antes, despues) {
  const paths = {};
  const allPaths = new Set([...Object.keys(antes?.paths || {}), ...Object.keys(despues?.paths || {})]);
  for (const p of allPaths) {
    const a = (antes?.paths || {})[p] || {};
    const b = (despues?.paths || {})[p] || {};
    paths[p] = {
      status: deltaVal(a.status, b.status),
      contentType: deltaVal(a.contentType, b.contentType),
      cacheControl: deltaVal(a.cacheControl, b.cacheControl),
      contentEncoding: deltaVal(a.contentEncoding, b.contentEncoding),
      hasSitemapDirective: deltaVal(a.hasSitemapDirective, b.hasSitemapDirective),
      looksXml: deltaVal(a.looksXml, b.looksXml),
      locCount: deltaNum(a.locCount, b.locCount),
    };
  }

  // Los assets tienen nombre de archivo con hash de contenido (cambia en cada
  // build de Vite), asi que no se comparan 1:1 por URL: se agregan por
  // extension para que el delta siga siendo significativo entre builds.
  function aggregateAssets(assets) {
    const agg = { js: { count: 0, transfer: 0, decoded: 0 }, css: { count: 0, transfer: 0, decoded: 0 }, otro: { count: 0, transfer: 0, decoded: 0 } };
    for (const a of assets || []) {
      const key = /\.js(\?|$)/i.test(a.url || '') ? 'js' : /\.css(\?|$)/i.test(a.url || '') ? 'css' : 'otro';
      agg[key].count += 1;
      agg[key].transfer += a.transferSize || 0;
      agg[key].decoded += a.decodedSize || 0;
    }
    return agg;
  }
  const aggA = aggregateAssets(antes?.assets);
  const aggB = aggregateAssets(despues?.assets);
  const assets = {};
  for (const key of ['js', 'css', 'otro']) {
    assets[key] = {
      count: deltaNum(aggA[key].count, aggB[key].count),
      transferBytes: deltaNum(aggA[key].transfer, aggB[key].transfer),
      decodedBytes: deltaNum(aggA[key].decoded, aggB[key].decoded),
    };
  }

  return { paths, assets };
}

// ---------------------------------------------------------------------------
// Playwright
// ---------------------------------------------------------------------------
function comparePlaywright(antes, despues) {
  const out = {};
  const routes = new Set([...Object.keys(antes || {}), ...Object.keys(despues || {})]);
  for (const route of routes) {
    out[route] = {};
    for (const vp of ['mobile', 'desktop']) {
      const a = (antes?.[route] || {})[vp]?.js || {};
      const b = (despues?.[route] || {})[vp]?.js || {};
      const totalTransferA = a.bytesByType ? Object.values(a.bytesByType).reduce((s, x) => s + x.transferBytes, 0) : null;
      const totalTransferB = b.bytesByType ? Object.values(b.bytesByType).reduce((s, x) => s + x.transferBytes, 0) : null;
      const thirdA = new Set(a.thirdPartyOrigins || []);
      const thirdB = new Set(b.thirdPartyOrigins || []);
      out[route][vp] = {
        consoleErrorsCount: deltaNum((a.consoleErrors || []).length, (b.consoleErrors || []).length),
        hydrationIssuesCount: deltaNum((a.hydrationIssues || []).length, (b.hydrationIssues || []).length),
        pageErrorsCount: deltaNum((a.pageErrors || []).length, (b.pageErrors || []).length),
        totalTransferBytes: deltaNum(totalTransferA, totalTransferB),
        thirdPartyAdded: [...thirdB].filter((h) => !thirdA.has(h)),
        thirdPartyRemoved: [...thirdA].filter((h) => !thirdB.has(h)),
      };
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Lighthouse / PSI (misma forma: medianScores/medianMetrics o scores/metrics)
// ---------------------------------------------------------------------------
function compareLighthouseLike(antes, despues, scoreKey, metricKey) {
  const out = {};
  const routes = new Set([...Object.keys(antes || {}), ...Object.keys(despues || {})]);
  for (const route of routes) {
    out[route] = {};
    const strategies = new Set([...Object.keys((antes || {})[route] || {}), ...Object.keys((despues || {})[route] || {})]);
    for (const strategy of strategies) {
      const a = (antes[route] || {})[strategy];
      const b = (despues[route] || {})[strategy];
      if (!a || !b) {
        out[route][strategy] = { antes: a ?? null, despues: b ?? null, nota: 'faltante en uno de los dos lados' };
        continue;
      }
      const aScores = a[scoreKey] || {};
      const bScores = b[scoreKey] || {};
      const aMetrics = a[metricKey] || {};
      const bMetrics = b[metricKey] || {};
      const scores = {};
      for (const k of new Set([...Object.keys(aScores), ...Object.keys(bScores)])) {
        scores[k] = deltaNum(aScores[k] !== null && aScores[k] !== undefined ? aScores[k] * 100 : null, bScores[k] !== null && bScores[k] !== undefined ? bScores[k] * 100 : null);
      }
      const metrics = {};
      for (const k of new Set([...Object.keys(aMetrics), ...Object.keys(bMetrics)])) {
        metrics[k] = deltaNum(aMetrics[k], bMetrics[k]);
      }
      out[route][strategy] = { scores, metrics };
    }
  }
  return out;
}

function comparePsi(antes, despues) {
  const out = {};
  if (!antes || !despues) return null;
  const routes = new Set([...Object.keys(antes || {}), ...Object.keys(despues || {})]);
  for (const route of routes) {
    out[route] = {};
    const strategies = new Set([...Object.keys((antes || {})[route] || {}), ...Object.keys((despues || {})[route] || {})]);
    for (const strategy of strategies) {
      const a = (antes[route] || {})[strategy];
      const b = (despues[route] || {})[strategy];
      if (!a?.medido || !b?.medido) {
        out[route][strategy] = { medido: false, antesMotivo: a?.motivo ?? null, despuesMotivo: b?.motivo ?? null };
        continue;
      }
      const scores = {};
      for (const k of new Set([...Object.keys(a.scores || {}), ...Object.keys(b.scores || {})])) {
        scores[k] = deltaNum(a.scores[k] !== null ? a.scores[k] * 100 : null, b.scores[k] !== null ? b.scores[k] * 100 : null);
      }
      const metrics = {};
      for (const k of new Set([...Object.keys(a.metrics || {}), ...Object.keys(b.metrics || {})])) {
        metrics[k] = deltaNum(a.metrics[k], b.metrics[k]);
      }
      out[route][strategy] = { medido: true, scores, metrics };
    }
  }
  return out;
}

function buildMarkdown(comparacion) {
  const lines = [];
  const p = (...a) => lines.push(a.join(''));

  p(`# Comparacion SEO/rendimiento: ${comparacion.meta.antesLabel} -> ${comparacion.meta.despuesLabel}`);
  p();
  p(`- Antes: \`${comparacion.meta.antesBase}\` (${comparacion.meta.antesFecha}) — \`${comparacion.meta.antesDir}\``);
  p(`- Despues: \`${comparacion.meta.despuesBase}\` (${comparacion.meta.despuesFecha}) — \`${comparacion.meta.despuesDir}\``);
  p(`- Generado: ${comparacion.meta.fecha}`);
  p();

  p(`## Vista de rastreador`);
  p();
  for (const [route, byUa] of Object.entries(comparacion.vistaRastreador)) {
    p(`### \`${route}\``);
    for (const [ua, fields] of Object.entries(byUa)) {
      p(`**${ua}**`);
      p(`| campo | antes | despues | cambio |`);
      p(`|---|---|---|---|`);
      for (const [campo, v] of Object.entries(fields)) {
        const cambio = 'delta' in v ? v.delta : v.cambio;
        const cambioStr = 'delta' in v ? (v.delta === null ? 'n/d' : v.delta) : cambio ? 'SI' : 'no';
        p(`| ${campo} | ${JSON.stringify(v.antes)} | ${JSON.stringify(v.despues)} | ${cambioStr} |`);
      }
      p();
    }
  }

  p(`## Matriz HTTP`);
  p();
  p(`| path | status antes->despues | content-type cambio | cache-control cambio | Sitemap directive antes->despues | locCount antes->despues |`);
  p(`|---|---|---|---|---|---|`);
  for (const [path_, v] of Object.entries(comparacion.httpMatrix.paths)) {
    p(
      `| ${path_} | ${v.status.antes}->${v.status.despues} | ${v.contentType.cambio ? 'SI' : 'no'} | ${v.cacheControl.cambio ? 'SI' : 'no'} | ${v.hasSitemapDirective.antes}->${v.hasSitemapDirective.despues} | ${v.locCount.antes ?? 'n/d'}->${v.locCount.despues ?? 'n/d'} |`
    );
  }
  p();
  p(`### Assets (agregados por extension, ya que el hash de archivo cambia entre builds)`);
  p();
  p(`| tipo | count antes->despues | transferido antes->despues (bytes) | descomprimido antes->despues (bytes) |`);
  p(`|---|---|---|---|`);
  for (const [tipo, v] of Object.entries(comparacion.httpMatrix.assets)) {
    p(`| ${tipo} | ${v.count.antes}->${v.count.despues} (${v.count.delta}) | ${v.transferBytes.antes}->${v.transferBytes.despues} (${v.transferBytes.delta}) | ${v.decodedBytes.antes}->${v.decodedBytes.despues} (${v.decodedBytes.delta}) |`);
  }
  p();

  p(`## Playwright (con JS)`);
  p();
  p(`| ruta | viewport | errores consola antes->despues | problemas hidratacion antes->despues | bytes transferidos antes->despues | terceros +/- |`);
  p(`|---|---|---|---|---|---|`);
  for (const [route, byVp] of Object.entries(comparacion.playwright)) {
    for (const [vp, v] of Object.entries(byVp)) {
      p(
        `| ${route} | ${vp} | ${v.consoleErrorsCount.antes}->${v.consoleErrorsCount.despues} | ${v.hydrationIssuesCount.antes}->${v.hydrationIssuesCount.despues} | ${v.totalTransferBytes.antes ?? 'n/d'}->${v.totalTransferBytes.despues ?? 'n/d'} | +${v.thirdPartyAdded.join('/') || '(nada)'} / -${v.thirdPartyRemoved.join('/') || '(nada)'} |`
      );
    }
  }
  p();

  p(`## Lighthouse (mediana), puntos porcentuales y ms de delta`);
  p();
  p(`| ruta | form factor | Perf | A11y | BP | SEO | LCP ms | CLS | TBT ms |`);
  p(`|---|---|---|---|---|---|---|---|---|`);
  for (const [route, byFf] of Object.entries(comparacion.lighthouse)) {
    for (const [ff, v] of Object.entries(byFf)) {
      if (v.nota) {
        p(`| ${route} | ${ff} | ${v.nota} | | | | | | |`);
        continue;
      }
      p(
        `| ${route} | ${ff} | ${fmtDelta(v.scores.performance)} | ${fmtDelta(v.scores.accessibility)} | ${fmtDelta(v.scores['best-practices'])} | ${fmtDelta(v.scores.seo)} | ${fmtDelta(v.metrics.lcp)} | ${fmtDelta(v.metrics.cls, 3)} | ${fmtDelta(v.metrics.tbt)} |`
      );
    }
  }
  p();

  p(`## PageSpeed Insights`);
  p();
  if (!comparacion.psi) {
    p(`No se pudo comparar PSI (falta en uno de los dos lados).`);
  } else {
    p(`| ruta | estrategia | Perf | A11y | BP | SEO | LCP ms |`);
    p(`|---|---|---|---|---|---|---|`);
    for (const [route, byStrategy] of Object.entries(comparacion.psi)) {
      for (const [strategy, v] of Object.entries(byStrategy)) {
        if (!v.medido) {
          p(`| ${route} | ${strategy} | no medido (antes: ${v.antesMotivo || 'n/d'}; despues: ${v.despuesMotivo || 'n/d'}) | | | | |`);
          continue;
        }
        p(`| ${route} | ${strategy} | ${fmtDelta(v.scores.performance)} | ${fmtDelta(v.scores.accessibility)} | ${fmtDelta(v.scores['best-practices'])} | ${fmtDelta(v.scores.seo)} | ${fmtDelta(v.metrics.lcp)} |`);
      }
    }
  }
  p();

  return lines.join('\n');
}

function fmtDelta(d, digits = 0) {
  if (!d || d.delta === null || d.delta === undefined) return 'n/d';
  const sign = d.delta > 0 ? '+' : '';
  return `${d.antes.toFixed(digits)}->${d.despues.toFixed(digits)} (${sign}${d.delta.toFixed(digits)})`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const antes = loadResumen(args.antes);
  const despues = loadResumen(args.despues);
  const outDir = args.out ? path.resolve(args.out) : path.resolve(args.despues);
  ensureDir(outDir);

  const comparacion = {
    meta: {
      antesDir: path.resolve(args.antes),
      despuesDir: path.resolve(args.despues),
      antesLabel: antes.meta.label,
      despuesLabel: despues.meta.label,
      antesBase: antes.meta.base,
      despuesBase: despues.meta.base,
      antesFecha: antes.meta.fecha,
      despuesFecha: despues.meta.fecha,
      fecha: nowIso(),
    },
    vistaRastreador: compareVistaRastreador(antes.vistaRastreador, despues.vistaRastreador),
    httpMatrix: compareHttpMatrix(antes.httpMatrix, despues.httpMatrix),
    playwright: comparePlaywright(antes.playwright, despues.playwright),
    lighthouse: compareLighthouseLike(antes.lighthouse, despues.lighthouse, 'medianScores', 'medianMetrics'),
    psi: comparePsi(antes.psi, despues.psi),
  };

  writeJson(path.join(outDir, 'comparacion.json'), comparacion);
  writeText(path.join(outDir, 'comparacion.md'), buildMarkdown(comparacion));
  console.log('Comparacion escrita en', path.join(outDir, 'comparacion.json'), 'y', path.join(outDir, 'comparacion.md'));
}


main().catch((e) => {
  console.error('FALLO NO CAPTURADO:', e);
  process.exit(1);
});
