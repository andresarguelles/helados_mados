#!/usr/bin/env node
/**
 * Deja el dev server visible en el teléfono COMO localhost, por WiFi y sin cable.
 *
 * Uso:  npm run phone                                  (día a día: descubre, conecta y enlaza)
 *       npm run phone -- --pair <ip:puerto> <código>   (solo la primera vez)
 *       npm run phone -- <ip:puerto>                   (si el descubrimiento por mDNS falla)
 *
 * Por qué existe: Supabase solo acepta destinos de redirección `http://` cuando el host es
 * `localhost` o `127.0.0.1`. Abrir el dev server desde el teléfono por la IP de la red
 * (http://192.168.x.x:3000) hace que rechace el destino y mande al Site URL — producción — aunque esa
 * IP esté en la lista blanca de Redirect URLs. Está verificado contra el servidor, no es teoría.
 *
 * `adb reverse tcp:3000 tcp:3000` redirige el localhost:3000 DEL TELÉFONO hacia el de esta máquina,
 * así que el navegador del teléfono cree estar en localhost: Supabase lo acepta, y de paso cuenta como
 * contexto seguro, que es lo que habilita la cámara del escáner de QR.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { die } from './lib/db.mjs'

// El mismo puerto que fija `server.port` en vite.config.ts (con strictPort, así que no se mueve).
const PORT = 3000

const IS_WIN = process.platform === 'win32'
const ADB_BIN = IS_WIN ? 'adb.exe' : 'adb'

/**
 * Localiza adb. No basta con el PATH: winget instala platform-tools sin agregarlo, que es
 * exactamente como está esta máquina.
 */
function findAdb() {
  const fromPath = spawnSync(ADB_BIN, ['version'], { encoding: 'utf8' })
  if (!fromPath.error) return ADB_BIN

  const home = process.env.LOCALAPPDATA || process.env.HOME || ''
  const candidates = [
    path.join(
      home,
      'Microsoft/WinGet/Packages/Google.PlatformTools_Microsoft.Winget.Source_8wekyb3d8bbwe/platform-tools',
      ADB_BIN
    ),
    path.join(home, 'Android/Sdk/platform-tools', ADB_BIN),
    path.join(process.env.ANDROID_HOME || '', 'platform-tools', ADB_BIN),
  ]
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate
  }

  die(
    'No encuentro "adb" ni en el PATH ni en las rutas habituales.\n\n' +
      '  Instálalo con:  winget install --id Google.PlatformTools -e\n\n' +
      '  (Si acabas de instalarlo, este script lo encuentra solo — no hace falta reabrir la terminal.)'
  )
}

const ADB = findAdb()

/** Corre adb capturando salida y error juntos; no aborta, para poder interpretar el fallo. */
function adb(args) {
  const res = spawnSync(ADB, args, { encoding: 'utf8' })
  const out = `${res.stdout ?? ''}${res.stderr ?? ''}`.trim()
  return { ok: res.status === 0, out }
}

/** Direcciones ip:puerto de los dispositivos ya autorizados. */
function connectedDevices() {
  const { out } = adb(['devices'])
  return out
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter(([, state]) => state === 'device')
    .map(([serial]) => serial)
}

/**
 * Busca el teléfono por mDNS. Android anuncia dos servicios distintos: `_adb-tls-connect` cuando la
 * depuración inalámbrica está encendida, y `_adb-tls-pairing` solo mientras la pantalla del código de
 * vinculación está abierta. Esa diferencia es la que permite dar un diagnóstico útil más abajo.
 */
function mdnsServices(kind) {
  const { out } = adb(['mdns', 'services'])
  return out
    .split(/\r?\n/)
    .filter((line) => line.includes(`_adb-tls-${kind}._tcp`))
    .map((line) => line.trim().split(/\s+/).pop())
    .filter(Boolean)
}

function reverseAndFinish(device) {
  const { ok, out } = adb(['-s', device, 'reverse', `tcp:${PORT}`, `tcp:${PORT}`])
  if (!ok) die(`No pude crear el enlace de puertos con ${device}.\n\n  ${out}`)

  console.log(`\n✓ Teléfono enlazado (${device}).\n`)
  console.log(`  En el teléfono, abre:  http://localhost:${PORT}`)
  console.log(
    '\n  Tiene que decir "localhost", no la IP de la red: es la única forma en que Supabase\n' +
      '  acepta volver al teléfono después de entrar con Google. Y como localhost cuenta como\n' +
      '  sitio seguro, la cámara del escáner de QR también funciona.\n'
  )
  console.log(`  Si aún no está corriendo el servidor, arráncalo con:  npm run dev\n`)
  console.log(
    '  El enlace se cae si se corta la conexión o se reinicia el teléfono.\n' +
      '  Se recupera corriendo otra vez:  npm run phone\n'
  )
}

function pair(address, code) {
  if (!address || !code) {
    die(
      'Faltan datos para vincular.\n\n' +
        '  npm run phone -- --pair <ip:puerto> <código>\n\n' +
        '  Los dos salen en el teléfono: Opciones de desarrollador → Depuración inalámbrica →\n' +
        '  "Vincular dispositivo con código de vinculación".'
    )
  }

  console.log(`Vinculando con ${address}...`)
  const { ok, out } = adb(['pair', address, code])

  if (!ok || /fault|failed/i.test(out)) {
    die(
      `No se pudo vincular con ${address}.\n\n  ${out}\n\n` +
        '  La causa más común: la pantalla del código se cerró. Ese código y ese puerto viven solo\n' +
        '  mientras la ventana "Vincular dispositivo con código de vinculación" sigue abierta en el\n' +
        '  teléfono. Ábrela de nuevo, y con ella EN PANTALLA vuelve a correr el comando con los\n' +
        '  datos nuevos (cambian cada vez).'
    )
  }

  console.log(`✓ ${out}`)
}

/** Conecta con una dirección concreta, interpretando el fallo típico de "no vinculado". */
function connect(address) {
  console.log(`Conectando con ${address}...`)
  const { ok, out } = adb(['connect', address])

  if (!ok || /failed|cannot/i.test(out)) {
    die(
      `No se pudo conectar con ${address}.\n\n  ${out}\n\n` +
        '  Si el teléfono se ve en la red pero rechaza la conexión, es que todavía no está vinculado\n' +
        '  con esta computadora. Vincúlalo una vez:\n\n' +
        '    npm run phone -- --pair <ip:puerto> <código>\n\n' +
        '  (ojo: el ip:puerto de vincular NO es el mismo que el de conectar)'
    )
  }

  console.log(`✓ ${out}`)
}

// ─── Entrada ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const isPair = args[0] === '--pair'

if (isPair) {
  pair(args[1], args[2])
  // Tras vincular, el teléfono queda listo para conectarse; se sigue de largo para dejarlo enlazado
  // en el mismo comando en vez de obligar a correr otro.
}

// Una dirección suelta en los argumentos es el "conéctate a esta" manual. Si venimos de --pair, sus
// dos argumentos ya se consumieron y no cuentan: el puerto de vinculación no sirve para conectar.
const ADDRESS = /^\d{1,3}(\.\d{1,3}){3}:\d+$/
const explicitAddress = (isPair ? args.slice(3) : args).find((a) => ADDRESS.test(a))

let device = connectedDevices()[0]

if (!device) {
  if (explicitAddress) {
    connect(explicitAddress)
  } else {
    const discovered = mdnsServices('connect')
    if (discovered.length === 0) {
      const pairing = mdnsServices('pairing')
      die(
        'No veo ningún teléfono en la red.\n\n' +
          (pairing.length
            ? `  Sí veo la pantalla de vinculación abierta en ${pairing[0]}. Vincula primero:\n\n` +
              `    npm run phone -- --pair ${pairing[0]} <código>\n`
            : '  Revisa que el teléfono tenga encendida la Depuración inalámbrica (Opciones de\n' +
              '  desarrollador) y que esté en la misma red WiFi que esta computadora.\n\n' +
              '  Si es la primera vez, hay que vincularlo:\n\n' +
              '    npm run phone -- --pair <ip:puerto> <código>\n')
      )
    }
    connect(discovered[0])
  }
  device = connectedDevices()[0]
  if (!device) die('El dispositivo se conectó pero no aparece autorizado. Revisa el teléfono: puede haber un aviso pendiente de aceptar.')
}

reverseAndFinish(device)
