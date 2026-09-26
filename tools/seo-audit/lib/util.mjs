import fs from 'node:fs';
import path from 'node:path';

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

export function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

export function writeText(filePath, text) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, text, 'utf8');
}

export function nowIso() {
  return new Date().toISOString();
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Mediana de un arreglo de numeros. Devuelve null si el arreglo esta vacio. */
export function median(numbers) {
  const valid = numbers.filter((n) => typeof n === 'number' && Number.isFinite(n));
  if (valid.length === 0) return null;
  const sorted = [...valid].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Convierte una ruta ("/", "/canjear", "/auth/callback?code=x") en un slug seguro para nombre de archivo. */
export function routeSlug(route) {
  if (route === '/' || route === '') return 'home';
  return route
    .replace(/^\//, '')
    .replace(/[?#]/g, '_q_')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\/+$/, '_slash')
    .replace(/\//g, '_') || 'home';
}

export function log(...args) {
  const ts = new Date().toISOString().split('T')[1].replace('Z', '');
  console.log(`[${ts}]`, ...args);
}

/** Envuelve una funcion async; si falla, registra el error en `errores` y devuelve `fallback`. */
export async function tryOrRecord(errores, contexto, fn, fallback = null) {
  try {
    return await fn();
  } catch (e) {
    const mensaje = e && e.message ? e.message : String(e);
    errores.push({ ...contexto, mensaje });
    log('ERROR', JSON.stringify(contexto), '->', mensaje);
    return fallback;
  }
}
