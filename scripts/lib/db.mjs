/**
 * Plomería compartida de los scripts de este repo: la raíz del proyecto y la salida con error.
 *
 * Lo que hablaba directo con Postgres (readDbUrl, connEnv, run, query) se fue con los
 * scripts de respaldo al repo helados_mados_backend el 2026-11-11.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

export const die = (msg) => {
  console.error(`\n✖ ${msg}\n`)
  process.exit(1)
}
