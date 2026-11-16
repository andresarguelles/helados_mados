// El Premio normalizado de una dinámica (MVP 0, Story 5.1; FR-17 y AD-15). Vive en
// `control.premios_dinamica` del backend y solo se lee y escribe con estas dos RPC, que son del
// Superadmin y validan Presentación y Sabor contra el catálogo (`CONTRATO.md` de
// `helados_mados_backend`, «heladosmados.com»). No cambia `dynamics`: los clientes siguen viendo
// `description` y `prize_label` tal cual.
import { supabase } from './supabaseClient'

/**
 * `control.actor` pide esta cabecera en toda RPC del MVP 0 y responde `actualizar_app` si es menor
 * que `version_minima` de la base. Si Andrés sube `version_minima` por encima de este valor, este
 * sitio se publica antes con el valor al día; si no, la sección de Premio dice «Hay una versión
 * nueva del sitio» y la dinámica se sigue guardando sin Premio.
 */
export const VERSION_CONTROL = '0.1.0'

export type TipoPremio = 'helado' | 'otro'

export interface Premio {
  tipo: TipoPremio
  /** Clave de la Presentación (`control.presentaciones.clave`); nula en un Premio de tipo otro. */
  presentacion: string | null
  /** Slug del Sabor (el de `src/content/sabores.ts`); nulo si es «a elegir» o de tipo otro. */
  sabor: string | null
  a_elegir: boolean
  /** Pesos, solo en un Premio de tipo otro. */
  costo: number | null
  revisada: boolean
  revisada_en: string | null
}

export interface OpcionPresentacion { clave: string; nombre: string; bolitas: number }
export interface OpcionSabor { slug: string; nombre: string }
export interface OpcionesPremio { presentaciones: OpcionPresentacion[]; sabores: OpcionSabor[] }

export type Rechazo = { success: false; reason: string; ref?: string }
export type LecturaPremio = ({ success: true; premio: Premio | null } & OpcionesPremio) | Rechazo
export type GuardadoPremio = { success: true; premio: Premio } | Rechazo

/** Lo que se teclea en el formulario. `sabor` es un slug o `A_ELEGIR`. */
export interface BorradorPremio { tipo: TipoPremio | ''; presentacion: string; sabor: string; costo: string }

// Con guiones bajos no puede ser el slug de un Sabor (^[a-z0-9]+(-[a-z0-9]+)*$).
export const A_ELEGIR = '__a_elegir__'
export const BORRADOR_VACIO: BorradorPremio = { tipo: '', presentacion: '', sabor: '', costo: '' }

// Pesos de 0 a 999,999.99, con punto o coma y hasta dos decimales: lo mismo que acepta la RPC.
const COSTO = /^\d{1,6}([.,]\d{1,2})?$/

function rechazo(data: unknown): Rechazo {
  const r = (data ?? {}) as { reason?: unknown; ref?: unknown }
  return {
    success: false,
    reason: typeof r.reason === 'string' ? r.reason : 'error',
    ...(typeof r.ref === 'string' ? { ref: r.ref } : {}),
  }
}

/** Catálogo activo y, si `dynamicId` no es nulo, el Premio que ya tiene (o nulo: pendiente). */
export async function verPremioDinamica(dynamicId: string | null): Promise<LecturaPremio> {
  const { data, error } = await supabase
    .rpc('ver_premio_dinamica', { p_dynamic_id: dynamicId as string })
    .setHeader('x-mados-version', VERSION_CONTROL)
  if (error) return { success: false, reason: 'error' }
  const r = data as { success?: unknown; presentaciones?: unknown; sabores?: unknown; premio?: unknown } | null
  if (r?.success !== true || !Array.isArray(r.presentaciones) || !Array.isArray(r.sabores)) return rechazo(r)
  return {
    success: true,
    presentaciones: r.presentaciones as OpcionPresentacion[],
    sabores: r.sabores as OpcionSabor[],
    premio: (r.premio ?? null) as Premio | null,
  }
}

/** Guarda el Premio de una dinámica que ya existe; repetirlo con lo mismo no cambia nada. */
export async function guardarPremioDinamica(dynamicId: string, borrador: BorradorPremio): Promise<GuardadoPremio> {
  const { data, error } = await supabase
    .rpc('guardar_premio_dinamica', { p_dynamic_id: dynamicId, ...cargaDe(borrador) })
    .setHeader('x-mados-version', VERSION_CONTROL)
  if (error) return { success: false, reason: 'error' }
  const r = data as { success?: unknown; premio?: unknown } | null
  if (r?.success !== true || !r.premio) return rechazo(r)
  return { success: true, premio: r.premio as Premio }
}

/** Los argumentos de `guardar_premio_dinamica` para un borrador que ya pasó `validarBorrador`. */
export function cargaDe(b: BorradorPremio) {
  const helado = b.tipo === 'helado'
  return {
    p_tipo: b.tipo,
    p_presentacion: helado ? b.presentacion : null,
    p_sabor: helado && b.sabor !== A_ELEGIR ? b.sabor : null,
    p_a_elegir: helado && b.sabor === A_ELEGIR,
    p_costo: helado ? null : Number(b.costo.trim().replace(',', '.')),
  } as { p_tipo: string; p_presentacion: string; p_sabor: string; p_a_elegir: boolean; p_costo: number }
}

/**
 * El borrador de un Premio guardado. Una Presentación o un Sabor que ya no está activo queda sin
 * elegir: la RPC lo rechazaría, así que el Superadmin elige otro.
 */
export function borradorDe(p: Premio | null, opciones: OpcionesPremio): BorradorPremio {
  if (!p) return BORRADOR_VACIO
  if (p.tipo === 'otro') return { tipo: 'otro', presentacion: '', sabor: '', costo: p.costo === null ? '' : String(p.costo) }
  const presentacion = opciones.presentaciones.some(o => o.clave === p.presentacion) ? p.presentacion ?? '' : ''
  const sabor = p.a_elegir
    ? A_ELEGIR
    : opciones.sabores.some(o => o.slug === p.sabor) ? p.sabor ?? '' : ''
  return { tipo: 'helado', presentacion, sabor, costo: '' }
}

/** Si el borrador dice lo mismo que el Premio guardado (entonces no hace falta guardarlo). */
export function mismoPremio(b: BorradorPremio, p: Premio | null): boolean {
  if (!p || b.tipo !== p.tipo) return false
  const c = cargaDe(b)
  if (p.tipo === 'otro') return p.costo !== null && Number(p.costo) === c.p_costo
  return c.p_presentacion === p.presentacion && c.p_sabor === p.sabor && c.p_a_elegir === p.a_elegir
}

/** El error que impide guardar el borrador, o nulo si está completo. */
export function validarBorrador(b: BorradorPremio): string | null {
  if (b.tipo === '') return 'Elige el tipo de premio: helado u otro.'
  if (b.tipo === 'helado') {
    if (!b.presentacion) return 'Elige la presentación del premio.'
    if (!b.sabor) return 'Elige el sabor del premio o «A elegir».'
    return null
  }
  if (!COSTO.test(b.costo.trim())) return 'Escribe el costo del premio en pesos, de 0 a 999,999.99, con hasta dos decimales.'
  return null
}

/** El texto de cada `reason` de las dos RPC; lo desconocido, un mensaje genérico. */
export function mensajePremio(r: Rechazo): string {
  switch (r.reason) {
    case 'no_autorizado':
    case 'sin_permiso':
      return 'Solo el Superadmin fija el premio.'
    case 'sin_sesion':
      return 'Tu sesión terminó. Vuelve a entrar.'
    case 'actualizar_app':
      return 'Hay una versión nueva del sitio. Recarga la página.'
    case 'no_encontrado':
      return 'Este entrenamiento ya no existe.'
    case 'tipo_invalido':
      return 'Elige el tipo de premio: helado u otro.'
    case 'presentacion_invalida':
      return 'Elige una presentación del catálogo.'
    case 'sabor_invalido':
      return 'Elige un sabor del catálogo o «A elegir».'
    case 'costo_invalido':
      return 'Escribe el costo del premio en pesos, de 0 a 999,999.99, con hasta dos decimales.'
    case 'error_interno':
      return r.ref ? `Algo falló en el servidor. Referencia: ${r.ref}` : 'Algo falló en el servidor. Intenta otra vez.'
    default:
      return 'No se pudo completar. Revisa tu conexión e intenta otra vez.'
  }
}
