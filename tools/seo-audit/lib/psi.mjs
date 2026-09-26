// PageSpeed Insights API (v5): evidencia independiente, corrida por Google.
// Sin API key: si hay 429/cuota, reintenta con espera razonable; si sigue
// fallando, se registra honestamente como "no medido" (nunca se inventa).
import { sleep, log, writeJson } from './util.mjs';

const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
const RETRY_WAITS_MS = [15000, 30000]; // 2 reintentos con espera creciente

function buildUrl(targetUrl, strategy, apiKey) {
  const params = new URLSearchParams();
  params.append('url', targetUrl);
  params.append('strategy', strategy);
  for (const c of CATEGORIES) params.append('category', c);
  if (apiKey) params.append('key', apiKey);
  return `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`;
}

function summarizePsi(json) {
  const lr = json.lighthouseResult;
  if (!lr) return null;
  const scores = {};
  for (const [key, cat] of Object.entries(lr.categories || {})) {
    scores[key] = cat.score;
  }
  const metricAudits = {
    lcp: 'largest-contentful-paint',
    cls: 'cumulative-layout-shift',
    tbt: 'total-blocking-time',
    fcp: 'first-contentful-paint',
    speedIndex: 'speed-index',
  };
  const metrics = {};
  for (const [key, auditId] of Object.entries(metricAudits)) {
    const audit = lr.audits && lr.audits[auditId];
    metrics[key] = audit ? audit.numericValue : null;
  }
  const crux = json.loadingExperience && json.loadingExperience.metrics ? json.loadingExperience.metrics : null;
  return { scores, metrics, fieldData: crux };
}

/**
 * Llama a PSI para una URL/estrategia. Reintenta ante 429/cuota. Devuelve
 * { medido: true, ... } o { medido: false, motivo } si no se pudo medir.
 */
export async function runPsi({ url, strategy, apiKey, outDir, slug }) {
  const attempts = [];
  const waits = [0, ...RETRY_WAITS_MS];
  for (let i = 0; i < waits.length; i++) {
    if (waits[i] > 0) {
      log(`PSI ${strategy} ${url}: reintentando en ${waits[i]}ms (intento ${i + 1}/${waits.length})`);
      await sleep(waits[i]);
    }
    const reqUrl = buildUrl(url, strategy, apiKey);
    try {
      const res = await fetch(reqUrl);
      const bodyText = await res.text();
      if (res.status === 200) {
        let json;
        try {
          json = JSON.parse(bodyText);
        } catch (e) {
          attempts.push({ status: res.status, error: `respuesta no-JSON: ${e.message}` });
          continue;
        }
        if (outDir && slug) {
          writeJson(`${outDir}/${slug}-${strategy}.json`, json);
        }
        return { medido: true, url, strategy, ...summarizePsi(json) };
      }
      let reason = bodyText.slice(0, 500);
      try {
        const parsed = JSON.parse(bodyText);
        reason = parsed.error?.message || reason;
      } catch {
        /* deja el texto crudo si no es JSON */
      }
      attempts.push({ status: res.status, error: reason });
      if (res.status !== 429 && res.status < 500) {
        // Error no transitorio (4xx que no es cuota): no tiene caso reintentar.
        break;
      }
    } catch (e) {
      attempts.push({ error: e.message });
    }
  }
  return { medido: false, url, strategy, motivo: 'PSI no respondio 200 tras reintentos', intentos: attempts };
}
