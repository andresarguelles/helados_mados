#!/usr/bin/env node
/**
 * Devuelve una cuenta de prueba a su estado "legacy": sin Google vinculado, sin datos de perfil,
 * y con los puntos que le corresponden únicamente por sus cupones.
 *
 * Uso:  node scripts/reset-test-account.mjs <apodo> [<apodo>...] [--yes]
 *       npm run db:reset-user -- <apodo>
 *
 * Vincular e iniciar sesión con Google deja rastro en cuatro sitios, no en uno:
 *   1. auth.identities            — la fila del proveedor 'google'
 *   2. auth.users.raw_app_meta_data  — 'google' dentro de providers[]
 *   3. auth.users.raw_user_meta_data — los claims de Google, que además PISAN 'sub' y 'email'
 *   4. public.profiles            — correo, foto, nombre, banderas de bono y los puntos de bono
 * Borrar solo la identidad deja la cuenta en un estado a medias que no representa a un legacy
 * de verdad, y la siguiente prueba partiría de una base falsa.
 *
 * La conexión (SUPABASE_DB_URL, variables PG*) la resuelve ./lib/db.mjs.
 */
import { createInterface } from 'node:readline/promises'
import { die, readDbUrl, connEnv, query } from './lib/db.mjs'

const args = process.argv.slice(2)
const skipConfirm = args.includes('--yes')
const usernames = [...new Set(args.filter((a) => !a.startsWith('--')))]

if (usernames.length === 0) {
  die(
    'Falta el apodo de la cuenta a resetear.\n\n' +
      '  node scripts/reset-test-account.mjs andresarguelles\n' +
      '  node scripts/reset-test-account.mjs andresarguelles marvinroldan --yes\n\n' +
      '  No existe un modo "todas las cuentas": hay que nombrarlas una por una, a propósito.'
  )
}

// Los apodos vienen de argv y terminan dentro de SQL. Duplicar la comilla simple es lo que
// neutraliza una inyección; standard_conforming_strings (el default) hace que la barra invertida
// sea un carácter normal, así que no hay más que escapar.
const lit = (value) => `'${String(value).replace(/'/g, "''")}'`
const inList = usernames.map(lit).join(', ')

const env = connEnv(readDbUrl())

/** Estado de las cuentas pedidas, más los puntos que les tocarían solo por sus cupones. */
function fetchState() {
  return query(
    env,
    `select p.username,
            p.total_points::text,
            coalesce((select string_agg(i.provider, '+' order by i.provider)
                        from auth.identities i where i.user_id = p.id), '-'),
            coalesce(p.email, '-'),
            case when p.google_bonus_awarded then 'si' else 'no' end,
            case when p.profile_bonus_awarded then 'si' else 'no' end,
            case when p.is_admin then 'si' else 'no' end,
            (select coalesce(sum((case when c.digital_awarded then 1 else 0 end)
                               + (case when c.physical_awarded then 10 else 0 end)), 0)::text
               from public.coupons c where c.user_id = p.id)
       from public.profiles p
      where p.username in (${inList})
      order by p.username`
  ).map(([username, points, providers, email, googleBonus, profileBonus, isAdmin, couponPoints]) => ({
    username,
    points,
    providers,
    email,
    googleBonus,
    profileBonus,
    isAdmin,
    couponPoints,
  }))
}

function printTable(rows, { showTarget }) {
  const w = Math.max(8, ...rows.map((r) => r.username.length))
  const head =
    `  ${'apodo'.padEnd(w)}  ${'puntos'.padStart(6)}  ${'proveedores'.padEnd(13)}  ` +
    `${'bonos g/p'.padEnd(9)}  correo`
  console.log(head)
  console.log(`  ${'-'.repeat(head.length)}`)
  for (const r of rows) {
    const points = showTarget ? `${r.points} → ${r.couponPoints}` : r.points
    console.log(
      `  ${r.username.padEnd(w)}  ${points.padStart(6)}  ${r.providers.padEnd(13)}  ` +
        `${`${r.googleBonus}/${r.profileBonus}`.padEnd(9)}  ${r.email}`
    )
  }
}

const before = fetchState()

const encontrados = new Set(before.map((r) => r.username.toLowerCase()))
const faltantes = usernames.filter((u) => !encontrados.has(u.toLowerCase()))
for (const u of faltantes) {
  console.warn(`⚠ No existe ninguna cuenta con el apodo "${u}". La omito.`)
}
if (before.length === 0) die('Ninguno de los apodos existe. No hay nada que resetear.')

const admins = before.filter((r) => r.isAdmin === 'si')
if (admins.length) {
  console.warn(`\n⚠ Ojo: ${admins.map((r) => r.username).join(', ')} tiene permisos de admin.`)
}

console.log('\nEstado actual → estado al que va a quedar:\n')
printTable(before, { showTarget: true })
console.log(
  '\n  Se borra: la identidad de Google, los claims de Google en los metadatos, y del perfil el\n' +
    '  correo, la foto, nombre, apellido, cumpleaños y teléfono. Las dos banderas de bono vuelven\n' +
    '  a "no" y los puntos se recalculan desde los cupones (digital=1, físico=10).'
)
console.log(
  '\n  Nota: ese recálculo descarta cualquier ajuste manual de puntos hecho desde el dashboard.'
)

if (!skipConfirm) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question('\n¿Continuar? Escribe "si" para confirmar: ')
  rl.close()
  if (answer.trim().toLowerCase() !== 'si') {
    console.log('\nCancelado. No se tocó nada.')
    process.exit(0)
  }
}

// Todo junto: si algo falla —por ejemplo el CHECK total_points >= 0— no queda una cuenta a medias.
query(
  env,
  `begin;

   delete from auth.identities i
     using public.profiles p
    where i.user_id = p.id and i.provider = 'google' and p.username in (${inList});

   -- Sesiones activas: invalidarlas evita seguir probando con datos viejos en el navegador.
   delete from auth.sessions s
     using public.profiles p
    where s.user_id = p.id and p.username in (${inList});

   update auth.users u set
     -- Quita 'google' de la lista en vez de asumir que solo había 'email'.
     raw_app_meta_data = jsonb_set(
       coalesce(u.raw_app_meta_data, '{}'::jsonb),
       '{providers}',
       coalesce(
         (select jsonb_agg(v)
            from jsonb_array_elements_text(coalesce(u.raw_app_meta_data->'providers', '[]'::jsonb)) t(v)
           where v <> 'google'),
         '["email"]'::jsonb
       )
     ),
     -- Restar las llaves de Google en vez de reconstruir el objeto: así sobreviven 'username',
     -- 'email_verified' y 'phone_verified' tal como estaban. 'sub' y 'email' sí hay que
     -- restaurarlos porque iniciar sesión con Google los sobrescribe.
     raw_user_meta_data =
       (coalesce(u.raw_user_meta_data, '{}'::jsonb)
          - 'iss' - 'name' - 'picture' - 'full_name' - 'avatar_url' - 'provider_id')
       || jsonb_build_object('sub', u.id::text, 'email', u.email)
   from public.profiles p
    where p.id = u.id and p.username in (${inList});

   update public.profiles p set
     email = null,
     avatar_url = null,
     first_name = null,
     last_name = null,
     birthdate = null,
     phone = null,
     whatsapp_opt_in = false,
     whatsapp_opt_in_at = null,
     google_bonus_awarded = false,
     profile_bonus_awarded = false,
     total_points = (
       select coalesce(sum((case when c.digital_awarded then 1 else 0 end)
                         + (case when c.physical_awarded then 10 else 0 end)), 0)
         from public.coupons c where c.user_id = p.id
     )
    where p.username in (${inList});

   commit;`
)

console.log('\n✓ Listo. Estado final:\n')
printTable(fetchState(), { showTarget: false })

console.log(
  '\nDos pasos que ningún script puede hacer por ti:\n\n' +
    '  1. Revoca el acceso en Google: myaccount.google.com/permissions → Helados Mados →\n' +
    '     Quitar acceso. Si no, Google recuerda que ya autorizaste la app y se salta la\n' +
    '     pantalla de consentimiento; la vinculación funciona, pero no verías lo que ve\n' +
    '     alguien que entra por primera vez.\n\n' +
    '  2. Cierra sesión en el navegador. Ya invalidé la sesión del servidor, pero el token que\n' +
    '     el navegador tiene en memoria sigue siendo válido hasta que caduque.\n'
)
