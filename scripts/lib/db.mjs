/**
 * Plomería compartida para los scripts que hablan directo con Postgres
 * (backup-db.mjs, reset-test-account.mjs).
 *
 * Requiere SUPABASE_DB_URL (en el entorno o en .env.backup.local) con la cadena
 * de conexión del "Session pooler" del proyecto — ver backups/README.md.
 *
 * La contraseña nunca se pasa como argumento: la URL se descompone en las
 * variables PG* del proceso hijo para que no quede en argv ni en los logs.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const ENV_FILE = path.join(ROOT, '.env.backup.local')

export const die = (msg) => {
  console.error(`\n✖ ${msg}\n`)
  process.exit(1)
}

/** Lee SUPABASE_DB_URL del entorno o de .env.backup.local (parser mínimo). */
export function readDbUrl() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL
  if (!fs.existsSync(ENV_FILE)) {
    die(
      'No encuentro SUPABASE_DB_URL.\n\n' +
        '  1. Dashboard de Supabase → Connect → pestaña "Session pooler" (puerto 5432).\n' +
        '  2. Crea .env.backup.local en la raíz del proyecto con una línea:\n\n' +
        '     SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@<host>.pooler.supabase.com:5432/postgres\n\n' +
        '  (ese archivo ya está en .gitignore — ver backups/README.md)'
    )
  }
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?SUPABASE_DB_URL\s*=\s*(.*)$/)
    if (m) return m[1].trim().replace(/^["']|["']$/g, '')
  }
  die('.env.backup.local existe pero no define SUPABASE_DB_URL.')
}

/** Convierte la URL de conexión en variables de entorno PG* para los procesos hijos. */
export function connEnv(rawUrl) {
  let url
  try {
    url = new URL(rawUrl)
  } catch {
    die('SUPABASE_DB_URL no es una URL válida. Debe empezar por postgresql:// o postgres://')
  }
  if (!/^postgres(ql)?:$/.test(url.protocol)) {
    die(`SUPABASE_DB_URL debe usar el esquema postgresql://, no "${url.protocol}"`)
  }
  if (url.port === '6543') {
    die(
      'El puerto 6543 es el Transaction pooler y no soporta pg_dump.\n' +
        'Usa la cadena del "Session pooler" (puerto 5432).'
    )
  }
  return {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.replace(/^\//, '')) || 'postgres',
    PGSSLMODE: process.env.PGSSLMODE || 'require',
    PGCLIENTENCODING: 'UTF8',
  }
}

export function run(cmd, args, env, { capture = false, input } = {}) {
  const res = spawnSync(cmd, args, {
    env,
    encoding: 'utf8',
    // `input` va como Buffer para que los bytes lleguen intactos (ver query()).
    ...(input === undefined ? {} : { input }),
    stdio: capture
      ? [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe']
      : [input === undefined ? 'ignore' : 'pipe', 'inherit', 'inherit'],
  })
  if (res.error?.code === 'ENOENT') {
    die(
      `No encuentro "${cmd}" en el PATH. Instala las herramientas de cliente de PostgreSQL 17+\n` +
        '(p. ej. https://www.postgresql.org/download/windows/ — basta con "Command Line Tools").'
    )
  }
  if (res.status !== 0) {
    if (capture && res.stderr) console.error(res.stderr.trim())
    die(`"${cmd}" falló con código ${res.status}.`)
  }
  return capture ? res.stdout : ''
}

// Separador de campos para psql -A -F: un carácter de control que no puede
// aparecer dentro de un nombre de tabla ni de un conteo.
const SEP = String.fromCharCode(1)

/**
 * Ejecuta una consulta con psql y devuelve las filas como arrays de strings.
 *
 * El SQL va por stdin (`-f -`) y no como argumento (`-c`): en Windows, argv pasa por la codepage
 * de la consola y cualquier acento dentro del SQL llega mutilado, con psql abortando por
 * "invalid byte sequence for encoding UTF8". Por stdin mandamos los bytes UTF-8 exactos.
 */
export function query(env, sql) {
  const out = run(
    'psql',
    ['--no-psqlrc', '--quiet', '-t', '-A', '-F', SEP, '-v', 'ON_ERROR_STOP=1', '-f', '-'],
    env,
    { capture: true, input: Buffer.from(sql, 'utf8') }
  )
  return out
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '')
    .map((l) => l.split(SEP))
}
