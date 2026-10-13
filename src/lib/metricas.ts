// Métricas y roles: lo que usa solo /admin/metricas (superadmin, migraciones 0044 y 0045).
//
// Vive fuera de `store.ts` a propósito: el store lo importa toda la app, y esto solo lo necesita
// una página lazy. Todo se calcula en Postgres; aquí no se suma nada, solo se pide y se tipa.
import { supabase } from './supabaseClient'
import type { Rol } from './roles'

// ─── Filtros ──────────────────────────────────────────────────────────────────

export type Segmento = 'todos' | 'whatsapp' | 'nuevos' | 'recurrentes'
export type Granularidad = 'day' | 'week' | 'month'
export type Rango = 'hoy' | '7d' | '30d' | '90d' | 'mes' | 'mes_pasado' | 'todo' | 'custom'

export interface Filtros {
  /** ISO con offset de Ciudad de México. Rango [desde, hasta). */
  desde: string
  hasta: string
  /** null = todas. */
  dinamicas: string[] | null
  segmento: Segmento
}

export const SEGMENTOS: { valor: Segmento; nombre: string; ayuda: string }[] = [
  { valor: 'todos', nombre: 'Todos', ayuda: 'Todos los clientes' },
  { valor: 'whatsapp', nombre: 'Con WhatsApp', ayuda: 'Dieron permiso de recibir promociones' },
  { valor: 'nuevos', nombre: 'Nuevos', ayuda: 'Crearon su cuenta dentro del rango' },
  { valor: 'recurrentes', nombre: 'Recurrentes', ayuda: 'Dos o más cupones antes del fin del rango' },
]

export const RANGOS: { valor: Exclude<Rango, 'custom'>; nombre: string }[] = [
  { valor: 'hoy', nombre: 'Hoy' },
  { valor: '7d', nombre: '7 días' },
  { valor: '30d', nombre: '30 días' },
  { valor: '90d', nombre: '90 días' },
  { valor: 'mes', nombre: 'Este mes' },
  { valor: 'mes_pasado', nombre: 'Mes pasado' },
  { valor: 'todo', nombre: 'Todo' },
]

/** Antes de esto no hay datos: el primer cupón es del 25 de agosto de 2026. */
export const INICIO_DE_DATOS = '2026-08-01'

// La operación vive en Ciudad de México, que no tiene horario de verano desde 2022: todo corte
// de día es a medianoche UTC-6, igual que en Postgres (America/Mexico_City).
const OFFSET_MX = '-06:00'

/** La fecha de hoy en Ciudad de México, 'YYYY-MM-DD'. */
export function hoyMx(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date())
}

/** 'YYYY-MM-DD' ± n días, sin pasar por la zona del navegador. */
export function sumarDias(fecha: string, n: number): string {
  const d = new Date(`${fecha}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Medianoche de Ciudad de México de esa fecha, como ISO con offset. */
export function inicioDelDia(fecha: string): string {
  return `${fecha}T00:00:00${OFFSET_MX}`
}

/** Las fechas (inclusivas) que abarca un rango. */
export function fechasDeRango(rango: Rango, custom?: { desde: string; hasta: string }): { desde: string; hasta: string } {
  const hoy = hoyMx()
  const [anio, mes] = hoy.split('-').map(Number)
  const primeroDe = (a: number, m: number) => `${a}-${String(m).padStart(2, '0')}-01`
  switch (rango) {
    case 'hoy': return { desde: hoy, hasta: hoy }
    case '7d': return { desde: sumarDias(hoy, -6), hasta: hoy }
    case '30d': return { desde: sumarDias(hoy, -29), hasta: hoy }
    case '90d': return { desde: sumarDias(hoy, -89), hasta: hoy }
    case 'mes': return { desde: primeroDe(anio, mes), hasta: hoy }
    case 'mes_pasado': {
      const [a, m] = mes === 1 ? [anio - 1, 12] : [anio, mes - 1]
      return { desde: primeroDe(a, m), hasta: sumarDias(primeroDe(anio, mes), -1) }
    }
    case 'todo': return { desde: INICIO_DE_DATOS, hasta: hoy }
    case 'custom': return custom ?? { desde: sumarDias(hoy, -29), hasta: hoy }
  }
}

/** Fechas inclusivas → el rango [desde, hasta) que esperan las RPC. */
export function aFiltros(
  fechas: { desde: string; hasta: string },
  dinamicas: string[] | null,
  segmento: Segmento,
): Filtros {
  return {
    desde: inicioDelDia(fechas.desde),
    hasta: inicioDelDia(sumarDias(fechas.hasta, 1)),
    dinamicas: dinamicas && dinamicas.length > 0 ? dinamicas : null,
    segmento,
  }
}

/** La granularidad que se lee bien para un rango de tantos días. */
export function granularidadSugerida(fechas: { desde: string; hasta: string }): Granularidad {
  const dias = (Date.parse(fechas.hasta) - Date.parse(fechas.desde)) / 86_400_000 + 1
  if (dias <= 62) return 'day'
  if (dias <= 300) return 'week'
  return 'month'
}

// ─── Respuestas ──────────────────────────────────────────────────────────────

export interface Kpis {
  altas: number
  activos: number
  canjes: number
  escaneos: number
  puntos: number
  /** % de los cupones canjeados en el rango que ya se cobraron en tienda. */
  conversion: number | null
  /** Mediana de horas entre canjear la palabra y cobrar el QR. */
  mediana_horas: number | null
}

export interface Resumen {
  actual: Kpis
  anterior: Kpis
  perfil: { clientes: number; con_whatsapp: number; con_telefono: number; con_cumple: number; con_nombre: number }
}

export interface PuntoSerie {
  cubeta: string
  altas: number
  canjes: number
  escaneos: number
  activos: number
}

export interface CeldaHorario {
  /** 1 = lunes … 7 = domingo. */
  dia: number
  hora: number
  canjes: number
  escaneos: number
}

export interface MetricaDinamica {
  id: string
  keyword: string
  premio: string
  inicia: string
  termina: string
  existencias: number
  entregados: number
  canjes: number
  escaneos: number
  conversion: number | null
  pct_nuevos: number | null
  mediana_horas: number | null
  agotado_en: string | null
}

export interface MetricasClientes {
  embudo: { cuentas: number; con_alta: number; con_canje: number; con_escaneo: number; recurrentes: number }
  frecuencia: { rango: string; clientes: number }[]
  cohortes: { semana: string; clientes: number; retencion: number[] | null }[]
  cumpleanos_por_mes: { mes: number; clientes: number }[]
}

export type Lista = 'top' | 'en_riesgo' | 'cumpleanos' | 'nuevos'

export interface FilaLista {
  id: string
  username: string
  puntos_periodo: number
  total_points: number
  cupones: number
  ultimo_punto: string | null
  alta: string
  whatsapp: boolean
  /** Solo viene si el cliente dio permiso de WhatsApp. */
  telefono: string | null
  cumple_mes: number | null
  cumple_dia: number | null
  dias_para_cumple: number | null
}

export type Resultado<T> = { ok: true; datos: T } | { ok: false; motivo: string }

function argsDe(f: Filtros) {
  return { p_desde: f.desde, p_hasta: f.hasta, p_dinamicas: f.dinamicas ?? undefined, p_segmento: f.segmento }
}

/** Todas las RPC de métricas responden `{ success, reason?, ...datos }`. */
async function pedir<T>(promesa: PromiseLike<{ data: unknown; error: unknown }>, extraer: (d: Record<string, unknown>) => T): Promise<Resultado<T>> {
  const { data, error } = await promesa
  if (error || !data) return { ok: false, motivo: 'error' }
  const d = data as Record<string, unknown>
  if (d.success !== true) return { ok: false, motivo: typeof d.reason === 'string' ? d.reason : 'error' }
  return { ok: true, datos: extraer(d) }
}

export const metricas = {
  resumen: (f: Filtros) =>
    pedir(supabase.rpc('metricas_resumen', argsDe(f)), d => d as unknown as Resumen),
  serie: (f: Filtros, granularidad: Granularidad) =>
    pedir(supabase.rpc('metricas_serie', { ...argsDe(f), p_granularidad: granularidad }), d => d.serie as PuntoSerie[]),
  horarios: (f: Filtros) =>
    pedir(supabase.rpc('metricas_horarios', argsDe(f)), d => d.celdas as CeldaHorario[]),
  dinamicas: (f: Filtros) =>
    pedir(supabase.rpc('metricas_dinamicas', argsDe(f)), d => d.dinamicas as MetricaDinamica[]),
  clientes: (f: Filtros) =>
    pedir(supabase.rpc('metricas_clientes', argsDe(f)), d => d as unknown as MetricasClientes),
  lista: (f: Filtros, lista: Lista, limite = 50) =>
    pedir(supabase.rpc('metricas_lista', { ...argsDe(f), p_lista: lista, p_limite: limite }),
      d => ({ total: d.total as number, filas: d.filas as FilaLista[] })),
}

/** Las dinámicas para el filtro, de la más reciente a la más vieja. */
export async function fetchOpcionesDinamicas(): Promise<{ id: string; keyword: string; premio: string }[]> {
  const { data } = await supabase
    .from('dynamics')
    .select('id, keyword, prize_label')
    .order('starts_at', { ascending: false })
  return (data ?? []).map(d => ({ id: d.id, keyword: d.keyword, premio: d.prize_label }))
}

// ─── Equipo: quién tiene qué rol ─────────────────────────────────────────────

export interface Miembro {
  id: string
  username: string | null
  email: string | null
  role: Rol
  created_at: string
}

export interface CambioDeRol {
  id: string
  username: string | null
  rol_anterior: string
  rol_nuevo: string
  creado_en: string
  /** Apodo de quien lo hizo, resuelto aparte. */
  ejecutado_por: string
}

/** El personal: todo perfil cuyo rol no es cliente. El superadmin lee `profiles` por RLS. */
export async function fetchEquipo(): Promise<Miembro[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, username, email, role, created_at')
    .neq('role', 'cliente')
    .order('role')
  return (data as Miembro[] | null) ?? []
}

/** Busca cuentas que se puedan promover: con apodo y con acceso (correo de Google). */
export async function buscarUsuarios(texto: string): Promise<Miembro[]> {
  const q = texto.trim().replace(/[%_,()]/g, '')
  if (q.length < 2) return []
  const { data } = await supabase
    .from('profiles')
    .select('id, username, email, role, created_at')
    .not('username', 'is', null)
    .not('email', 'is', null)
    .or(`username.ilike.%${q}%,email.ilike.%${q}%`)
    .order('username')
    .limit(15)
  return (data as Miembro[] | null) ?? []
}

export async function fetchBitacoraRoles(): Promise<CambioDeRol[]> {
  const { data } = await supabase
    .from('cambios_de_rol')
    .select('id, username, rol_anterior, rol_nuevo, creado_en, ejecutado_por')
    .order('creado_en', { ascending: false })
    .limit(30)
  const filas = data ?? []
  const ids = [...new Set(filas.map(f => f.ejecutado_por))]
  const nombres = new Map<string, string>()
  if (ids.length) {
    const { data: perfiles } = await supabase.from('profiles').select('id, username').in('id', ids)
    for (const p of perfiles ?? []) nombres.set(p.id, p.username ?? '—')
  }
  return filas.map(f => ({ ...f, ejecutado_por: nombres.get(f.ejecutado_por) ?? 'cuenta borrada' }))
}

export type MotivoRol =
  | 'forbidden' | 'invalid_role' | 'not_found' | 'self' | 'target_superadmin'
  | 'no_username' | 'sin_acceso' | 'sin_cambio' | 'error'

export async function asignarRol(usuario: string, rol: Exclude<Rol, 'superadmin'>): Promise<{ ok: true } | { ok: false; motivo: MotivoRol }> {
  const r = await pedir(supabase.rpc('asignar_rol', { p_usuario: usuario, p_rol: rol }), () => null)
  return r.ok ? { ok: true } : { ok: false, motivo: r.motivo as MotivoRol }
}

/** Quien pidió no figurar en las listas (finalidad voluntaria del aviso 4.1.0). */
export async function excluirDeListas(usuario: string, excluir: boolean): Promise<boolean> {
  return (await pedir(supabase.rpc('marcar_excluir_de_listas', { p_usuario: usuario, p_excluir: excluir }), () => null)).ok
}
