// Genera resumen.md (legible por humanos) a partir del objeto resumen.json.
function fmtNum(n, digits = 2) {
  if (n === null || n === undefined) return 'n/d';
  return Number(n).toFixed(digits);
}

function fmtMs(n) {
  if (n === null || n === undefined) return 'n/d';
  return `${Math.round(n)} ms`;
}

function fmtBytes(n) {
  if (n === null || n === undefined) return 'n/d';
  return `${(n / 1024).toFixed(1)} KB`;
}

function bool(v) {
  return v ? 'si' : 'no';
}

export function buildMarkdown(resumen) {
  const lines = [];
  const p = (...args) => lines.push(args.join(''));

  p(`# Auditoria SEO/rendimiento — Helados Mados`);
  p();
  p(`- Base: \`${resumen.meta.base}\``);
  p(`- Label: \`${resumen.meta.label}\``);
  p(`- Fecha: ${resumen.meta.fecha}`);
  p(`- Chromium: \`${resumen.meta.chromePath}\``);
  p(`- Node: ${resumen.meta.nodeVersion}`);
  p(`- Corridas Lighthouse: ${resumen.meta.runs}`);
  p();

  // ---- Vista de rastreador ----
  p(`## 1. Vista de rastreador (sin JS)`);
  p();
  for (const route of resumen.rutas) {
    const porUa = resumen.vistaRastreador[route];
    if (!porUa) continue;
    p(`### \`${route}\``);
    p();
    p(`| UA | status | content-type | lang | title (len) | description (len) | canonical | robots meta / X-Robots-Tag | H1 (n) | palabras visibles | links internos | JSON-LD | OG completo | twitter:card |`);
    p(`|---|---|---|---|---|---|---|---|---|---|---|---|---|---|`);
    for (const [ua, v] of Object.entries(porUa)) {
      if (!v || v.error) {
        p(`| ${ua} | ERROR: ${v ? v.error : 'sin datos'} | | | | | | | | | | | | |`);
        continue;
      }
      const ogVals = Object.values(v.og || {});
      const ogCompleto = ogVals.length > 0 && ogVals.every(Boolean);
      const jsonLdTypes = (v.jsonLd || []).map((j) => (j.valid ? j.types.join('/') : 'INVALIDO')).join(', ') || '(ninguno)';
      p(
        `| ${ua} | ${v.status} | ${v.contentType || 'n/d'} | ${v.htmlLang || 'n/d'} | ${v.title || '(vacio)'} (${v.title ? v.title.length : 0}) | ${(v.metaDescription || '(vacio)').slice(0, 40)} (${v.metaDescriptionLength}) | ${v.canonical || '(ninguno)'} | ${v.metaRobots || '(ninguno)'} / ${v.xRobotsTag || '(ninguno)'} | ${v.h1Count} ${v.h1Texts.length ? '- ' + v.h1Texts.join(' | ') : ''} | ${v.wordCount} | ${v.internalLinks.count} | ${jsonLdTypes} | ${bool(ogCompleto)} | ${v.twitterCard || '(ninguno)'} |`
      );
    }
    p();
  }

  // ---- Matriz HTTP ----
  p(`## 2. Matriz HTTP (sin seguir redirects)`);
  p();
  p(`| path | status | Location | content-type | cache-control | content-encoding | extra |`);
  p(`|---|---|---|---|---|---|---|`);
  for (const [path, v] of Object.entries(resumen.httpMatrix.paths)) {
    if (!v || v.error) {
      p(`| ${path} | ERROR | | | | | ${v ? v.error : 'sin datos'} |`);
      continue;
    }
    let extra = '';
    if (path === '/robots.txt') extra = `Sitemap: ${bool(v.hasSitemapDirective)}`;
    if (path === '/sitemap.xml') extra = `XML: ${bool(v.looksXml)}, <loc>: ${v.locCount}`;
    p(`| ${path} | ${v.status} | ${v.location || ''} | ${v.contentType || 'n/d'} | ${v.cacheControl || 'n/d'} | ${v.contentEncoding || 'n/d'} | ${extra} |`);
  }
  p();

  if (resumen.httpMatrix.assets && resumen.httpMatrix.assets.length > 0) {
    p(`### Assets referenciados por \`/\``);
    p();
    p(`| url | transferido | descomprimido | cache-control | content-encoding |`);
    p(`|---|---|---|---|---|`);
    for (const a of resumen.httpMatrix.assets) {
      p(`| ${a.url} | ${fmtBytes(a.transferSize)} | ${fmtBytes(a.decodedSize)} | ${a.cacheControl || 'n/d'} | ${a.contentEncoding || 'n/d'} |`);
    }
    p();
  }

  if (resumen.httpMatrix.redirectChains) {
    p(`### Cadenas de redirect (produccion)`);
    p();
    for (const [start, hops] of Object.entries(resumen.httpMatrix.redirectChains)) {
      p(`- **${start}**: ` + hops.map((h) => `${h.status}${h.location ? ' -> ' + h.location : ''}`).join(' => '));
    }
    p();
  }

  // ---- Playwright ----
  p(`## 3. Playwright (Chromium)`);
  p();
  for (const route of resumen.rutas) {
    const pw = resumen.playwright[route];
    if (!pw) continue;
    p(`### \`${route}\``);
    p();
    for (const vp of ['mobile', 'desktop']) {
      const v = pw[vp];
      if (!v) continue;
      p(`**${vp}** — carga sin JS: ${fmtMs(v.noJs.loadTimeMs)}${v.noJs.navError ? ' (ERROR: ' + v.noJs.navError + ')' : ''}; carga con JS: ${fmtMs(v.js.loadTimeMs)}${v.js.navError ? ' (ERROR: ' + v.js.navError + ')' : ''}`);
      p(`- Errores de consola: ${v.js.consoleErrors.length}${v.js.consoleErrors.length ? ' — ' + v.js.consoleErrors.slice(0, 3).join(' || ') : ''}`);
      p(`- Warnings de consola: ${v.js.consoleWarnings.length}`);
      p(`- Errores de pagina (uncaught): ${v.js.pageErrors.length}`);
      p(`- **Problemas de hidratacion detectados: ${v.js.hydrationIssues.length}**${v.js.hydrationIssues.length ? ' — ' + v.js.hydrationIssues.join(' || ') : ''}`);
      if (v.js.bytesByType) {
        const total = Object.values(v.js.bytesByType).reduce((acc, b) => acc + b.transferBytes, 0);
        p(`- Bytes transferidos (total ${fmtBytes(total)}): ` + Object.entries(v.js.bytesByType).map(([k, b]) => `${k}=${fmtBytes(b.transferBytes)}`).join(', '));
      }
      p(`- Origenes de terceros: ${v.js.thirdPartyOrigins.join(', ') || '(ninguno)'}`);
      p(`- Screenshots: \`${v.noJs.screenshot}\`, \`${v.js.screenshot}\``);
      p();
    }
  }

  // ---- Lighthouse ----
  p(`## 4. Lighthouse (mediana de ${resumen.meta.runs} corridas)`);
  p();
  p(`| ruta | form factor | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT | FCP | Speed Index |`);
  p(`|---|---|---|---|---|---|---|---|---|---|---|`);
  for (const route of Object.keys(resumen.lighthouse || {})) {
    for (const ff of ['mobile', 'desktop']) {
      const v = resumen.lighthouse[route][ff];
      if (!v) continue;
      const s = v.medianScores;
      const m = v.medianMetrics;
      p(
        `| ${route} | ${ff} | ${fmtNum((s.performance ?? null) * 100, 0)} | ${fmtNum((s.accessibility ?? null) * 100, 0)} | ${fmtNum((s['best-practices'] ?? null) * 100, 0)} | ${fmtNum((s.seo ?? null) * 100, 0)} | ${fmtMs(m.lcp)} | ${fmtNum(m.cls, 3)} | ${fmtMs(m.tbt)} | ${fmtMs(m.fcp)} | ${fmtMs(m.speedIndex)} |`
      );
    }
  }
  p();
  for (const route of Object.keys(resumen.lighthouse || {})) {
    for (const ff of ['mobile', 'desktop']) {
      const v = resumen.lighthouse[route][ff];
      if (!v) continue;
      if (v.failedAudits.seo.length || v.failedAudits.accessibility.length) {
        p(`**${route} (${ff})** — SEO fallidas: ${v.failedAudits.seo.map((a) => a.id).join(', ') || '(ninguna)'}; A11y fallidas: ${v.failedAudits.accessibility.map((a) => a.id).join(', ') || '(ninguna)'}`);
      }
      if (v.errors && v.errors.length) {
        p(`**${route} (${ff})** — errores durante las corridas: ${v.errors.map((e) => `run ${e.run}: ${e.mensaje}`).join('; ')}`);
      }
    }
  }
  p();

  // ---- PSI ----
  p(`## 5. PageSpeed Insights (API)`);
  p();
  if (!resumen.psi) {
    p(`No se corrio PSI (omitido por flag o por ser base local).`);
  } else {
    p(`| ruta | estrategia | medido | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |`);
    p(`|---|---|---|---|---|---|---|---|---|---|`);
    for (const [route, byStrategy] of Object.entries(resumen.psi)) {
      for (const [strategy, v] of Object.entries(byStrategy)) {
        if (!v.medido) {
          p(`| ${route} | ${strategy} | NO (${v.motivo}) | | | | | | | |`);
          continue;
        }
        const s = v.scores;
        const m = v.metrics;
        p(
          `| ${route} | ${strategy} | si | ${fmtNum((s.performance ?? null) * 100, 0)} | ${fmtNum((s.accessibility ?? null) * 100, 0)} | ${fmtNum((s['best-practices'] ?? null) * 100, 0)} | ${fmtNum((s.seo ?? null) * 100, 0)} | ${fmtMs(m.lcp)} | ${fmtNum(m.cls, 3)} | ${fmtMs(m.tbt)} |`
        );
      }
    }
  }
  p();

  // ---- Errores ----
  p(`## 6. Errores/omisiones registrados durante la corrida`);
  p();
  if (!resumen.errores || resumen.errores.length === 0) {
    p(`(ninguno)`);
  } else {
    for (const e of resumen.errores) {
      p(`- **${e.seccion}** ${e.ruta ? `(\`${e.ruta}\`)` : ''}: ${e.mensaje}`);
    }
  }
  p();

  return lines.join('\n');
}
