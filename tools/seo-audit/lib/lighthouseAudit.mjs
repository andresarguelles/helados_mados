// Lighthouse programatico (chrome-launcher + lighthouse), corriendo N veces
// por ruta/formFactor y reportando la mediana. Guarda el JSON completo de
// cada corrida para evidencia.
import fs from 'node:fs';
import path from 'node:path';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import desktopConfigModule from 'lighthouse/core/config/desktop-config.js';
import { median, writeJson, log } from './util.mjs';

const desktopConfig = desktopConfigModule.default || desktopConfigModule;

const METRIC_AUDITS = {
  lcp: 'largest-contentful-paint',
  cls: 'cumulative-layout-shift',
  tbt: 'total-blocking-time',
  fcp: 'first-contentful-paint',
  speedIndex: 'speed-index',
};

function summarizeLhr(lhr) {
  const scores = {};
  for (const [key, cat] of Object.entries(lhr.categories || {})) {
    scores[key] = cat.score;
  }
  const metrics = {};
  for (const [key, auditId] of Object.entries(METRIC_AUDITS)) {
    const audit = lhr.audits[auditId];
    metrics[key] = audit ? audit.numericValue : null;
  }
  const failedByCategory = {};
  for (const [catKey, cat] of Object.entries(lhr.categories || {})) {
    if (catKey !== 'seo' && catKey !== 'accessibility') continue;
    const refs = cat.auditRefs || [];
    const failed = refs
      .map((r) => lhr.audits[r.id])
      .filter((a) => a && a.score !== null && a.score < 1)
      .map((a) => ({ id: a.id, title: a.title, score: a.score }));
    failedByCategory[catKey] = failed;
  }
  return { scores, metrics, failedAudits: failedByCategory };
}

/**
 * Corre Lighthouse `runs` veces para una URL/formFactor y devuelve la mediana
 * de cada score/metrica, mas la union de auditorias fallidas vistas en
 * cualquier corrida.
 */
export async function runLighthouse({ url, formFactor, runs, chromePath, outDir, slug }) {
  const summaries = [];
  const files = [];
  const errors = [];

  for (let i = 1; i <= runs; i++) {
    let chrome;
    try {
      chrome = await chromeLauncher.launch({
        chromePath,
        chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
      });
      const flags = {
        port: chrome.port,
        output: 'json',
        logLevel: 'error',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      };
      const config = formFactor === 'desktop' ? desktopConfig : undefined;
      log(`Lighthouse ${formFactor} run ${i}/${runs}: ${url}`);
      const result = await lighthouse(url, flags, config);
      const lhr = result.lhr;
      const fileName = `${slug}-${formFactor}-run${i}.json`;
      const filePath = path.join(outDir, fileName);
      writeJson(filePath, lhr);
      files.push(fileName);
      summaries.push(summarizeLhr(lhr));
    } catch (e) {
      errors.push({ run: i, mensaje: e.message });
      log('ERROR Lighthouse', formFactor, url, 'run', i, '->', e.message);
    } finally {
      if (chrome) {
        try {
          await chrome.kill();
        } catch {
          /* chrome-launcher.kill() es sincrono en Windows y puede no devolver una promesa */
        }
      }
    }
  }

  const medianScores = {};
  const medianMetrics = {};
  if (summaries.length > 0) {
    for (const key of Object.keys(summaries[0].scores)) {
      medianScores[key] = median(summaries.map((s) => s.scores[key]));
    }
    for (const key of Object.keys(summaries[0].metrics)) {
      medianMetrics[key] = median(summaries.map((s) => s.metrics[key]));
    }
  }

  // Union de auditorias fallidas de SEO/accesibilidad vistas en cualquier corrida (dedupe por id).
  const failedUnion = { seo: new Map(), accessibility: new Map() };
  for (const s of summaries) {
    for (const cat of ['seo', 'accessibility']) {
      for (const f of s.failedAudits[cat] || []) {
        failedUnion[cat].set(f.id, f);
      }
    }
  }

  return {
    url,
    formFactor,
    runsRequested: runs,
    runsOk: summaries.length,
    medianScores,
    medianMetrics,
    failedAudits: {
      seo: [...failedUnion.seo.values()],
      accessibility: [...failedUnion.accessibility.values()],
    },
    files,
    errors,
  };
}
