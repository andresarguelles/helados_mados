/**
 * Medición del sitio (Google Analytics 4) — apagada mientras no haya consentimiento.
 *
 * El tag ya no vive en `index.html`: se inyecta desde aquí y solo después de que la
 * persona acepta en el aviso de cookies. Se descartó Consent Mode v2 (cargar gtag.js
 * con todo en `denied` por defecto) porque aun denegado el navegador descarga
 * `googletagmanager.com` y manda pings sin cookies; el aviso de privacidad promete que
 * la herramienta «solo se carga si usted acepta las cookies de medición», y eso tiene
 * que poder comprobarse en la pestaña Network con el `localStorage` limpio.
 *
 * La decisión se guarda en `localStorage` porque es una preferencia del navegador, no
 * del cadete: la misma persona en otro teléfono vuelve a decidir, y quien nunca crea
 * cuenta también tiene derecho a decidir.
 */

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export type ConsentimientoMedicion = 'aceptado' | 'rechazado'

const CLAVE = 'mados:cookies-medicion'

const ID_MEDICION = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined

// El dev server no mide: ni siquiera se descarga el script remoto, para que Enhanced
// Measurement (scroll, clics salientes...) tampoco dispare hits desde localhost. Para
// verificar el flujo completo en local —que tras aceptar sí aparece la petición a
// googletagmanager.com— basta con VITE_GA_FORZAR_LOCAL=1 en .env.local.
const EN_LOCAL =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname)
const FORZAR_LOCAL = import.meta.env.VITE_GA_FORZAR_LOCAL === '1'

/**
 * ¿Hay algo que consentir? Si el build no trae ID de medición no existe herramienta que
 * cargar, y preguntar sería teatro: el aviso de cookies no se muestra.
 *
 * En local sí se muestra (el ID está en .env.local) aunque no se mida, para poder
 * revisarlo en el navegador; lo que decide si el tag llega a cargarse es `puedeMedir()`.
 */
export function medicionConfigurada(): boolean {
  return !!ID_MEDICION
}

function puedeMedir(): boolean {
  return !!ID_MEDICION && (!EN_LOCAL || FORZAR_LOCAL)
}

// ─── Estado del consentimiento ────────────────────────────────────

function leerAlmacen(): ConsentimientoMedicion | null {
  try {
    const valor = localStorage.getItem(CLAVE)
    return valor === 'aceptado' || valor === 'rechazado' ? valor : null
  } catch {
    // Safari privado y «bloquear cookies» tiran al leer. Sin almacén no hay
    // consentimiento guardado, y sin consentimiento no se mide: el fallo es seguro.
    return null
  }
}

// `useSyncExternalStore` llama a la instantánea en cada render; se cachea para no
// tocar `localStorage` decenas de veces y para que la referencia sea estable.
let consentimiento: ConsentimientoMedicion | null = leerAlmacen()

const escuchas = new Set<() => void>()

function avisar() {
  for (const escucha of escuchas) escucha()
}

export function suscribirConsentimiento(escucha: () => void): () => void {
  escuchas.add(escucha)
  return () => {
    escuchas.delete(escucha)
  }
}

export function leerConsentimiento(): ConsentimientoMedicion | null {
  return consentimiento
}

function aplicar(valor: ConsentimientoMedicion | null) {
  if (valor === 'aceptado') activarMedicion()
  else desactivarMedicion()
}

export function guardarConsentimiento(valor: ConsentimientoMedicion) {
  consentimiento = valor
  try {
    localStorage.setItem(CLAVE, valor)
  } catch {
    // Sin almacén la decisión dura lo que la pestaña. Es lo correcto: lo que no se
    // puede recordar se vuelve a preguntar, nunca se asume aceptado.
  }
  aplicar(valor)
  avisar()
}

// Otra pestaña del mismo sitio puede cambiar la decisión: que esta se entere.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    // `key === null` es un `localStorage.clear()`, que también nos afecta.
    if (event.key !== null && event.key !== CLAVE) return
    const nuevo = leerAlmacen()
    if (nuevo === consentimiento) return
    consentimiento = nuevo
    aplicar(nuevo)
    avisar()
  })
}

// ─── Carga y descarga del tag ─────────────────────────────────────

let tagInyectado = false

function claveApagado(): string {
  return `ga-disable-${ID_MEDICION}`
}

function activarMedicion() {
  if (!puedeMedir()) return

  // Si ya se cargó y luego se rechazó, este es el interruptor oficial de GA.
  ;(window as unknown as Record<string, unknown>)[claveApagado()] = false
  if (tagInyectado) return
  tagInyectado = true

  const capa = (window.dataLayer = window.dataLayer ?? [])
  // Tiene que empujar el objeto `arguments`, no un array: gtag.js distingue los dos y
  // un array literal no se procesa como comando.
  const gtag: (...args: unknown[]) => void = function () {
    capa.push(arguments)
  }
  window.gtag = gtag

  gtag('js', new Date())
  // `page_view` se manda a mano desde `trackPageview` en cada cambio de ruta: es una
  // SPA y el tag solo vería la primera carga.
  gtag('config', ID_MEDICION, { send_page_view: false })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${ID_MEDICION}`
  document.head.appendChild(script)
}

function desactivarMedicion() {
  if (!ID_MEDICION) return
  // El script no se puede «desinyectar», pero este flag lo deja mudo hasta la recarga,
  // y tras recargar ya no vuelve a cargarse.
  ;(window as unknown as Record<string, unknown>)[claveApagado()] = true
  borrarCookiesDeMedicion()
}

/** Revocar sin borrar las cookies dejaría los identificadores puestos. */
function borrarCookiesDeMedicion() {
  try {
    const nombres = document.cookie
      .split(';')
      .map(trozo => trozo.split('=')[0].trim())
      .filter(nombre => nombre.startsWith('_ga') || nombre === '_gid' || nombre.startsWith('_gat'))
    if (nombres.length === 0) return

    // GA escribe en el dominio registrable (.heladosmados.com), así que hay que intentar
    // el host y cada uno de sus padres: borrar solo en el host actual no las quita.
    const partes = window.location.hostname.split('.')
    const dominios = ['', ...partes.map((_, i) => `.${partes.slice(i).join('.')}`)]

    for (const nombre of nombres) {
      for (const dominio of dominios) {
        document.cookie =
          `${nombre}=; path=/; max-age=0` + (dominio ? `; domain=${dominio}` : '')
      }
    }
  } catch {
    // Sin acceso a cookies no hay nada que borrar.
  }
}

// ─── Medición ─────────────────────────────────────────────────────

export function trackPageview(path: string) {
  if (consentimiento !== 'aceptado') return

  // La carga es perezosa a propósito: así no depende de que nadie llame a un `init()`
  // antes que el primer `trackPageview`, que es justo el orden que React no garantiza.
  activarMedicion()
  if (typeof window.gtag !== 'function') return

  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  })
}
