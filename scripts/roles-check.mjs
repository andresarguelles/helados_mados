#!/usr/bin/env node
/**
 * Guardarraíl de `src/lib/roles.ts`. No escribe nada: transpila el archivo con el `typescript`
 * del repo (`transpileModule`), lo importa y afirma, rol por rol, a qué rol cae cada perfil,
 * sus permisos, dónde empieza y su nombre visible. Sobre todo, que el Gerente sea aquí
 * exactamente el staff (MVP 0 Story 1.5): con el escáner y sin pantallas de admin, que el aviso
 * de privacidad 4.1.0 no le da. Nada de eso lo ven `tsc` ni el prerender.
 *
 * Corre en `npm run build`, justo después de `tsc`. Cada aserción se imprime con ✓ o ✗; al
 * final sale con código 1 si hubo algún ✗, listando TODOS los fallos de un jalón.
 *
 * Uso: `node scripts/roles-check.mjs [ruta a roles.ts]` (por omisión, `src/lib/roles.ts`).
 *
 * Transpila con `typescript` y no con `--experimental-strip-types` a propósito: nada fija la
 * versión de Node en Vercel, y un flag que no exista rompería el deploy.
 */
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { ROOT, die } from './lib/db.mjs'

const ROLES_TS = path.resolve(process.argv[2] ?? path.join(ROOT, 'src', 'lib', 'roles.ts'))

let fallos = 0
let checks = 0

/** `problemas`: array de strings. Vacío = pasa; si no, imprime uno por línea y cuenta un solo ✗. */
function verificar(titulo, problemas) {
  checks++
  if (problemas.length === 0) {
    console.log(`✓ ${titulo}`)
    return
  }
  fallos++
  console.log(`✗ ${titulo}`)
  for (const p of problemas) console.log(`    - ${p}`)
}

// ─── Carga de roles.ts ─────────────────────────────────────────────────────────────────

if (!fs.existsSync(ROLES_TS)) die(`No encuentro ${ROLES_TS}.`)

const { outputText, diagnostics } = ts.transpileModule(fs.readFileSync(ROLES_TS, 'utf8'), {
  fileName: path.basename(ROLES_TS),
  reportDiagnostics: true,
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
})
if (diagnostics?.length) {
  die(
    `${path.relative(ROOT, ROLES_TS)} no transpila:\n` +
      diagnostics.map(d => `  - ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`).join('\n')
  )
}

// Se importa desde una URL `data:`, así que roles.ts no puede importar nada en tiempo de
// ejecución (los `import type` desaparecen al transpilar). Hoy no lo hace.
let mod
try {
  mod = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
} catch (e) {
  die(
    `No pude importar ${path.relative(ROOT, ROLES_TS)} transpilado: ${e.message}\n\n` +
      '  Este chequeo lo carga solo, sin sus vecinos: roles.ts no debe importar nada más que tipos.'
  )
}

const { rolDe, alcanza, inicioDe, permisosDe, NOMBRE_ROL } = mod
for (const [nombre, valor] of Object.entries({ rolDe, alcanza, inicioDe, permisosDe, NOMBRE_ROL })) {
  if (!valor) die(`${path.relative(ROOT, ROLES_TS)} no exporta ${nombre}.`)
}

// ─── 1. Cada perfil: rol, permisos, inicio y nombre visible ─────────────────────────────

const ESCANER = '/admin/scanner'
const DINAMICAS = '/admin/dashboard'
const LOGIN_PANEL = '/admin'

const CASOS = [
  // [título, perfil, rol, isStaff, isAdmin, isSuperadmin, inicio, nombre visible]
  ['gerente: como el staff, nunca admin', { role: 'gerente', is_admin: false }, 'gerente', true, false, false, ESCANER, 'Gerente'],
  ['gerente con el espejo is_admin mal puesto: sigue gerente', { role: 'gerente', is_admin: true }, 'gerente', true, false, false, ESCANER, 'Gerente'],
  ['staff', { role: 'staff', is_admin: false }, 'staff', true, false, false, ESCANER, 'Staff'],
  ['staff con el espejo is_admin mal puesto: sigue staff', { role: 'staff', is_admin: true }, 'staff', true, false, false, ESCANER, 'Staff'],
  ['admin', { role: 'admin', is_admin: true }, 'admin', true, true, false, DINAMICAS, 'Admin'],
  ['superadmin', { role: 'superadmin', is_admin: true }, 'superadmin', true, true, true, DINAMICAS, 'Superadmin'],
  ['cliente', { role: 'cliente', is_admin: false }, 'cliente', false, false, false, LOGIN_PANEL, 'Cliente'],
  ['rol desconocido (cajero) con is_admin falso: cliente', { role: 'cajero', is_admin: false }, 'cliente', false, false, false, LOGIN_PANEL, 'Cliente'],
  ['rol desconocido (cajero) con is_admin verdadero: admin', { role: 'cajero', is_admin: true }, 'admin', true, true, false, DINAMICAS, 'Admin'],
  ['sin perfil (null): cliente', null, 'cliente', false, false, false, LOGIN_PANEL, 'Cliente'],
]

const mostrar = v => JSON.stringify(v)

for (const [titulo, perfil, rol, isStaff, isAdmin, isSuperadmin, inicio, visible] of CASOS) {
  const problemas = []
  const comparar = (que, real, esperado) => {
    if (real !== esperado) problemas.push(`${que} = ${mostrar(real)}, esperaba ${mostrar(esperado)}`)
  }
  try {
    comparar('rolDe', rolDe(perfil), rol)
    const p = permisosDe(perfil) ?? {}
    comparar('permisosDe().rol', p.rol, rol)
    comparar('permisosDe().isStaff', p.isStaff, isStaff)
    comparar('permisosDe().isAdmin', p.isAdmin, isAdmin)
    comparar('permisosDe().isSuperadmin', p.isSuperadmin, isSuperadmin)
    comparar(`inicioDe(${mostrar(rol)})`, inicioDe(rol), inicio)
    comparar(`NOMBRE_ROL[${mostrar(rol)}]`, NOMBRE_ROL[rol], visible)
  } catch (e) {
    problemas.push(`lanzó: ${e.message}`)
  }
  verificar(`${titulo} → ${rol}, ${inicio}, «${visible}»`, problemas)
}

// ─── 2. alcanza: el Gerente pasa y rebota exactamente donde el staff ────────────────────

{
  const roles = [...new Set(['cliente', 'staff', 'gerente', 'admin', 'superadmin', ...Object.keys(NOMBRE_ROL)])]
  const problemas = []
  for (const m of roles) {
    const g = alcanza('gerente', m)
    const s = alcanza('staff', m)
    if (g !== s) problemas.push(`alcanza('gerente', '${m}') = ${g}, alcanza('staff', '${m}') = ${s}`)
  }
  verificar(`alcanza('gerente', m) === alcanza('staff', m) para ${roles.join(', ')}`, problemas)
}

// ─── Resumen ─────────────────────────────────────────────────────────────────────────

console.log()
if (fallos > 0) {
  console.log(`✖ ${fallos} de ${checks} checks fallaron`)
  process.exit(1)
}
console.log(`✓ ${checks} de ${checks} checks pasaron`)
