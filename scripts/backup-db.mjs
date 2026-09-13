#!/usr/bin/env node
/**
 * Respaldo lógico de la base de datos Supabase con pg_dump.
 *
 * Uso: npm run db:backup
 *
 * La conexión (SUPABASE_DB_URL, variables PG*) la resuelve ./lib/db.mjs.
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, die, readDbUrl, connEnv, run, query } from './lib/db.mjs'

const BACKUPS_DIR = path.join(ROOT, 'backups')

/** Cuenta las filas de cada bloque COPY ... FROM stdin de un volcado de datos. */
function countCopyRows(file) {
  const counts = {}
  let current = null
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.replace(/\r$/, '')
    if (current === null) {
      const m = line.match(/^COPY "([^"]+)"\."([^"]+)" .*FROM stdin;$/)
      if (m) {
        current = `${m[1]}.${m[2]}`
        counts[current] = 0
      }
    } else if (line === '\\.') {
      current = null
    } else {
      counts[current] += 1
    }
  }
  return counts
}

const sha256 = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex')

// ---------------------------------------------------------------------------

const env = connEnv(readDbUrl())
const projectRef = env.PGUSER.includes('.')
  ? env.PGUSER.split('.').slice(1).join('.')
  : env.PGHOST.split('.')[0]

const pgDumpVersion = run('pg_dump', ['--version'], env, { capture: true }).trim()
console.log(`→ ${pgDumpVersion}`)
console.log(`→ Conectando a ${env.PGHOST}:${env.PGPORT} (proyecto ${projectRef})…`)

const serverVersion = query(env, 'select version()')[0][0]
console.log(`→ ${serverVersion.split(' on ')[0]}`)

// Conteos en vivo: la lista de tablas se descubre, no se codifica.
const publicTables = query(
  env,
  "select tablename from pg_tables where schemaname = 'public' order by tablename"
).map((r) => `public.${r[0]}`)
const targets = [...publicTables, 'auth.users', 'auth.identities']
const liveCounts = Object.fromEntries(
  query(
    env,
    targets.map((t) => `select '${t}' as t, count(*)::text as n from ${t}`).join(' union all ')
  ).map((r) => [r[0], Number(r[1])])
)

const now = new Date()
const pad = (n) => String(n).padStart(2, '0')
const stamp =
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
  `_${pad(now.getHours())}${pad(now.getMinutes())}`
const outDir = path.join(BACKUPS_DIR, stamp)
if (fs.existsSync(outDir)) {
  die(`La carpeta backups/${stamp}/ ya existe. Espera un minuto o bórrala.`)
}
fs.mkdirSync(outDir, { recursive: true })

const COMMON = ['--quote-all-identifiers', '--no-tablespaces', '--encoding=UTF8']

const dumps = [
  {
    file: '01_schema.sql',
    // Esquema de referencia, para diffear contra supabase/migrations/.
    // Sin --no-privileges: los GRANT/REVOKE sobre las RPCs son parte del modelo de seguridad.
    args: [
      '--schema-only',
      '--no-owner',
      '--schema=public',
      '--schema=supabase_migrations',
      '--no-publications',
      '--no-subscriptions',
      '--no-security-labels',
    ],
  },
  {
    file: '02_data_public.sql',
    args: ['--data-only', '--schema=public', '--schema=supabase_migrations'],
  },
  {
    // Solo las cuentas. auth.sessions / refresh_tokens / flow_state son estado
    // efímero de sesión y se excluyen a propósito.
    file: '03_data_auth.sql',
    args: ['--data-only', '--table=auth.users', '--table=auth.identities'],
  },
]

try {
  for (const dump of dumps) {
    const dest = path.join(outDir, dump.file)
    process.stdout.write(`→ ${dump.file} … `)
    run('pg_dump', [...COMMON, ...dump.args, '--file', dest], env)
    const bytes = fs.statSync(dest).size
    if (bytes === 0) throw new Error(`${dump.file} quedó vacío`)
    console.log(`${(bytes / 1024).toFixed(1)} KB`)
  }

  // Verificación: lo volcado debe coincidir con lo que hay en la base de datos.
  const dumped = {
    ...countCopyRows(path.join(outDir, '02_data_public.sql')),
    ...countCopyRows(path.join(outDir, '03_data_auth.sql')),
  }
  const rows = targets.map((table) => ({
    table,
    live: liveCounts[table] ?? 0,
    dumped: dumped[table] ?? 0,
  }))

  console.log('')
  const width = Math.max(...rows.map((r) => r.table.length))
  for (const r of rows) {
    const ok = r.live === r.dumped
    console.log(`  ${ok ? '✓' : '✖'} ${r.table.padEnd(width)}  ${String(r.dumped).padStart(6)} filas`)
  }

  const mismatches = rows
    .filter((r) => r.live !== r.dumped)
    .map((r) => `${r.table}: ${r.live} en la BD vs ${r.dumped} en el volcado`)
  if (mismatches.length) throw new Error(`Conteos que no cuadran:\n    ${mismatches.join('\n    ')}`)

  const manifest = {
    createdAt: now.toISOString(),
    projectRef,
    host: env.PGHOST,
    serverVersion,
    pgDumpVersion,
    counts: Object.fromEntries(rows.map((r) => [r.table, r.dumped])),
    files: dumps.map((d) => ({
      name: d.file,
      bytes: fs.statSync(path.join(outDir, d.file)).size,
      sha256: sha256(path.join(outDir, d.file)),
    })),
  }
  fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

  console.log(`\n✓ Respaldo completo en backups/${stamp}/`)
  console.log('  Recuerda: el secreto IP_HASH_PEPPER de la edge function NO está aquí (ver backups/README.md).')
} catch (err) {
  fs.rmSync(outDir, { recursive: true, force: true })
  die(`Respaldo abortado, no se deja una carpeta a medias.\n  ${err.message}`)
}
