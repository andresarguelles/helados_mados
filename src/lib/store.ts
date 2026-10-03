import { create } from 'zustand'
import type { PostgrestError, Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import { Profile, Dynamic, Coupon } from './types'
import type { Database } from './database.types'
import { saveAuthIntent, clearAuthIntent } from './authIntent'
import { LEGAL_META } from '../content/legal/generated/legalMeta'

/** La plataforma que queda registrada en cada aceptación del texto legal. */
const PLATAFORMA = 'web'

/**
 * Las ternas que el servidor exige para registrar una aceptación: id, versión y hash del
 * AST de CADA documento vigente.
 *
 * El hash es lo que hace que la constancia valga: sin él, un cliente con el bundle viejo
 * registraría "acepté la 2.0.0" mostrando un texto que ya no es la 2.0.0. El servidor
 * valida la terna completa contra `legal_versions` y responde `unknown_version` si no la
 * reconoce. Tienen que ir todos, o responde `legal_incomplete`.
 */
const documentosParaAceptar = () =>
  Object.values(LEGAL_META).map((doc) => ({
    doc_id: doc.id,
    version: doc.version,
    ast_hash: doc.astHash,
  }))

// Postgres SQLSTATE 23P01 = exclusion_violation, thrown by dynamics_no_overlapping_keyword
// when the same keyword is active during an overlapping date range.
function dynamicErrorMessage(error: PostgrestError): string {
  if (error.code === '23P01') {
    return 'Ya existe otra dinámica con esta palabra secreta activa en un periodo que se cruza con las fechas elegidas. Usa otra palabra o ajusta las fechas para que no se traslapen.'
  }
  return error.message
}

export type LeaderboardPeriod = 'day' | 'week' | 'month' | 'all'

export interface LeaderboardEntry {
  username: string
  points: number
  /**
   * Lo calcula el servidor contra `auth.uid()`. Antes venía el UUID del usuario y el
   * cliente comparaba — pero la RPC está concedida a `anon` para pintar el Top 5 de la
   * home, así que eso publicaba el identificador de todas las cuentas a cualquiera.
   */
  esTuFila: boolean
}

/**
 * Qué documentos le faltan por aceptar al usuario con sesión.
 *
 * `desconocido` no es lo mismo que "no falta nada": si la consulta falla (sin red, error
 * del servidor) no podemos saberlo, y la compuerta NO debe bloquear. Es un requisito
 * legal, no un control de seguridad: dejar la app inservible por un fallo de red sería
 * mucho peor que enseñar una versión tarde.
 */
type LegalStatus =
  | { estado: 'al-dia' }
  | { estado: 'pendiente'; docs: string[] }
  | { estado: 'desconocido' }

type DeleteAccountReason =
  | 'not_authenticated'
  /** Un admin que se borra deja la tienda sin quien escanee cupones. Que lo haga otro admin. */
  | 'admin_cannot_delete'
  | 'confirmation_required'
  | 'error'

type DeleteAccountResult = { success: true } | { success: false; reason: DeleteAccountReason }

/** Categoria de una baja ejecutada por el personal. La elige el admin y queda en la bitacora. */
export type BajaVia = 'admin_a_peticion' | 'admin_prueba'

type AdminDeleteReason =
  | 'not_authenticated'
  /** Quien llama no es admin. El guard de ruta es comodidad; esto es la frontera. */
  | 'forbidden'
  | 'not_found'
  /** No se borra a otro admin: dejaria la tienda sin quien escanee, y el rol no se reotorga desde la app. */
  | 'target_is_admin'
  /** El apodo tecleado no corresponde al objetivo. Atado a quien se borra, no una cadena fija. */
  | 'confirmation_mismatch'
  | 'no_identifier' | 'invalid' | 'invalid_via' | 'error'

type AdminDeleteResult =
  | { success: true; username: string | null }
  | { success: false; reason: AdminDeleteReason }

/**
 * Lo que muestran las pantallas de mostrador (/admin/leaderboard y /admin/flavors). Lo decide
 * el personal en /admin/estacion y vive en la tabla `estacion` (una fila), que Realtime empuja
 * a las pantallas en cuanto cambia.
 */
export interface EstadoEstacion {
  periodoRanking: LeaderboardPeriod
  /** Ids de `src/content/sabores.ts` que no se muestran. Un sabor nuevo aparece solo. */
  saboresOcultos: string[]
}

type FilaEstacion = Database['public']['Tables']['estacion']['Row']

const PERIODOS: readonly LeaderboardPeriod[] = ['day', 'week', 'month', 'all']

function aEstadoEstacion(fila: Pick<FilaEstacion, 'periodo_ranking' | 'sabores_ocultos'>): EstadoEstacion {
  const periodo = PERIODOS.find(p => p === fila.periodo_ranking) ?? 'all'
  return { periodoRanking: periodo, saboresOcultos: fila.sabores_ocultos ?? [] }
}

/** Las RPC de la estación responden `{ success }`; cualquier otra cosa cuenta como fallo. */
function rpcExitosa({ data, error }: { data: unknown; error: unknown }): boolean {
  return !error && (data as { success?: boolean } | null)?.success === true
}

interface LeaderboardRange {
  start: string
  end: string
}

type DynamicWriteResult = { success: true } | { success: false; error: string }

type RedeemResult =
  | { success: true; coupon: Coupon }
  | { success: false; reason: 'invalid' | 'expired' | 'already_redeemed' | 'ip_limit' | 'not_authenticated' | 'no_username' | 'error' }

// scan_coupon ya no devuelve la fila completa del perfil: mandaba teléfono, cumpleaños y correo
// al dispositivo del mostrador en cada escaneo.
export type ScanUser = Pick<Profile, 'id' | 'username' | 'total_points'>

type ScanReason = 'not_found' | 'already_used' | 'expired' | 'stock_empty' | 'forbidden' | 'error'

type ScanResult =
  | { success: true; user: ScanUser; dynamic: Dynamic }
  | { success: false; reason: ScanReason }

export interface SignupInput {
  username: string
  phone: string
  /** Opcional desde la 0023: publicidad no puede ser condición para existir. */
  whatsappOptIn: boolean
  /** Declaración de 18 años cumplidos. Obligatoria: el servidor responde `age_required`. */
  ageConfirmed: boolean
}

type CompleteSignupReason =
  | 'too_short' | 'username_taken' | 'already_set'
  | 'invalid_phone' | 'phone_taken' | 'not_authenticated' | 'error'
  // Nuevas en la 0023. Ya no existe 'consent_required': el permiso de WhatsApp dejó de
  // ser obligatorio, porque condicionar el alta a aceptar publicidad hace que el
  // consentimiento no sea libre, y un consentimiento no libre no es consentimiento.
  | 'age_required' | 'legal_required' | 'legal_incomplete' | 'unknown_version'
  | 'invalid_platform'

type CompleteSignupResult =
  | { success: true }
  | { success: false; reason: CompleteSignupReason }

export interface ProfileDataInput {
  first_name: string | null
  last_name: string | null
  birthdate: string | null
  phone: string | null
  whatsapp_opt_in: boolean
}

type UpdateProfileReason =
  | 'invalid_phone' | 'invalid_birthdate' | 'optin_without_phone'
  | 'phone_immutable' | 'phone_taken' | 'not_authenticated' | 'error'

type UpdateProfileResult =
  | { success: true; pointsAwarded: number }
  | { success: false; reason: UpdateProfileReason }

type OAuthResult = { success: true } | { success: false; reason: 'error' }

// ─── Store State ──────────────────────────────────────────────────────────────

interface AppState {
  profile: Profile | null
  isAdmin: boolean
  authReady: boolean
  dynamics: Dynamic[]
  coupons: Coupon[]
  profiles: Profile[]
  estacion: EstadoEstacion | null

  // Auth
  initAuth: () => () => void
  logout: () => Promise<void>
  getCurrentUser: () => Profile | null
  refreshProfile: () => Promise<void>

  // Google: la única forma de entrar y de crear cuenta.
  signInWithGoogle: (next?: string) => Promise<OAuthResult>
  claimGoogleBonus: () => Promise<number>

  // Perfil
  isUsernameAvailable: (username: string) => Promise<boolean | null>
  completeSignup: (input: SignupInput) => Promise<CompleteSignupResult>
  updateMyProfile: (data: ProfileDataInput) => Promise<UpdateProfileResult>

  // Admin: customers
  fetchAllProfiles: () => Promise<void>

  // Dynamics
  fetchDynamics: () => Promise<void>
  getActiveDynamic: (keyword: string) => Promise<Dynamic | null>
  addDynamic: (data: Omit<Dynamic, 'id' | 'created_at' | 'physical_redeemed'>) => Promise<DynamicWriteResult>
  updateDynamic: (id: string, data: Partial<Dynamic>) => Promise<DynamicWriteResult>
  deleteDynamic: (id: string) => Promise<DynamicWriteResult>

  // Coupons
  redeemKeyword: (keyword: string) => Promise<RedeemResult>
  scanCoupon: (couponId: string) => Promise<ScanResult>
  getUserCoupons: (userId: string) => Promise<Coupon[]>

  // Leaderboard
  getLeaderboard: (period: LeaderboardPeriod) => Promise<LeaderboardEntry[]>
  /** Como `getLeaderboard`, pero `null` si la consulta falla: una lista vacía no es un error. */
  fetchLeaderboard: (period: LeaderboardPeriod) => Promise<LeaderboardEntry[] | null>
  getLeaderboardRange: (period: 'day' | 'week' | 'month') => Promise<LeaderboardRange | null>

  // Estación: lo que muestran las pantallas de mostrador
  /** Lee la fila y escucha sus cambios en vivo. Devuelve la función para dejar de escuchar. */
  suscribirEstacion: () => () => void
  recargarEstacion: () => Promise<void>
  setPeriodoRanking: (periodo: LeaderboardPeriod) => Promise<boolean>
  setSaborVisible: (saborId: string, visible: boolean) => Promise<boolean>
  mostrarTodosLosSabores: () => Promise<boolean>

  // Texto legal
  getLegalStatus: () => Promise<LegalStatus>
  acceptLegal: () => Promise<boolean>

  // Baja de cuenta
  deleteMyAccount: () => Promise<DeleteAccountResult>
  adminDeleteAccount: (userId: string, confirmacion: string, via: BajaVia) => Promise<AdminDeleteResult>
}

async function loadProfile(): Promise<Profile | null> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', userData.user.id).single()
  return data
}

// El redirectTo debe coincidir CARACTER POR CARACTER con una entrada de Redirect URLs del dashboard,
// query string incluido. Por eso va limpio: lo que haya que recordar entre saltos viaja en
// sessionStorage (ver authIntent.ts). Si no coincide, GoTrue lo descarta en silencio y manda al
// Site URL, que es produccion — sintoma: en local el login termina en heladosmados.com.
function oauthRedirectTo(): string {
  const redirectTo = `${window.location.origin}/auth/callback`

  if (import.meta.env.DEV) {
    console.info(
      `[auth] redirectTo = ${redirectTo}\n` +
      'Debe estar tal cual en Authentication -> URL Configuration -> Redirect URLs, ' +
      'o el viaje termina en el Site URL (produccion).'
    )
  }

  return redirectTo
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppState>()((set, get) => ({
  profile: null,
  isAdmin: false,
  authReady: false,
  dynamics: [],
  coupons: [],
  profiles: [],
  estacion: null,

  // ── Auth ──────────────────────────────────────────────────────────────

  initAuth: () => {
    const hydrate = async (session: Session | null) => {
      if (!session) {
        set({ profile: null, isAdmin: false, authReady: true })
        return
      }
      const profile = await loadProfile()
      set({ profile, isAdmin: profile?.is_admin ?? false, authReady: true })
    }

    supabase.auth.getSession().then(({ data: { session } }) => { void hydrate(session) })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrate(session)
    })

    return () => subscription.unsubscribe()
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ profile: null, isAdmin: false })
  },

  getCurrentUser: () => get().profile,

  refreshProfile: async () => {
    const profile = await loadProfile()
    set({ profile, isAdmin: profile?.is_admin ?? false })
  },

  // ── Google ────────────────────────────────────────────────────────────
  //
  // Es el único acceso. El de apodo y contraseña se retiró el 2026-09-30: el proveedor Email está
  // apagado en el dashboard (GoTrue responde 422 `email_provider_disabled`) y las cuentas que nunca
  // vincularon Google se quedaron como estaban, con su apodo y sus puntos, pero sin forma de entrar.
  // Tampoco hay vincular ni desvincular: sin contraseña, desvincular dejaría a cualquiera fuera.

  signInWithGoogle: async (next) => {
    saveAuthIntent({ next: next ?? '/perfil' })
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: oauthRedirectTo() },
    })
    // En el camino feliz el navegador ya se fue a Google y esto no llega a leerse.
    if (error) {
      // Sin limpiar, esta intencion contaminaria el proximo aterrizaje.
      clearAuthIntent()
      return { success: false, reason: 'error' }
    }
    return { success: true }
  },

  claimGoogleBonus: async () => {
    const { data, error } = await supabase.rpc('claim_google_bonus')
    if (error || !data) return 0
    const result = data as { success: boolean; points_awarded?: number }
    await get().refreshProfile()
    return result.success ? (result.points_awarded ?? 0) : 0
  },

  // ── Perfil ────────────────────────────────────────────────────────────

  isUsernameAvailable: async (username) => {
    const { data, error } = await supabase.rpc('username_available', { p_username: username.trim() })
    if (error) return null
    return data
  },

  // Apodo, teléfono, edad y aceptación legal se guardan juntos o no se guarda nada: la RPC
  // es una sola transacción, así que no puede quedar un apodo tomado por una cuenta sin
  // número, ni una cuenta sin constancia de qué texto aceptó su dueño.
  completeSignup: async ({ username, phone, whatsappOptIn, ageConfirmed }) => {
    const { data, error } = await supabase.rpc('complete_signup', {
      p_username: username.trim(),
      p_phone: phone,
      p_whatsapp_opt_in: whatsappOptIn,
      p_age_confirmed: ageConfirmed,
      p_legal: documentosParaAceptar(),
      p_platform: PLATAFORMA,
    })
    if (error || !data) return { success: false, reason: 'error' }
    const result = data as { success: boolean; reason?: CompleteSignupReason }
    if (!result.success) return { success: false, reason: result.reason ?? 'error' }
    await get().refreshProfile()
    return { success: true }
  },

  updateMyProfile: async (input) => {
    const args = {
      p_first_name: input.first_name,
      p_last_name: input.last_name,
      p_birthdate: input.birthdate,
      p_phone: input.phone,
      p_whatsapp_opt_in: input.whatsapp_opt_in,
    }
    // Postgres no expresa nullability en la firma de una función, así que el generador de tipos
    // asume lo más estricto y los declara `string`. La RPC sí acepta null en todos ellos — es
    // justamente como el usuario borra un dato. El cast vive aquí para que database.types.ts
    // siga siendo un archivo puramente generado, sin ediciones a mano que se pierdan al regenerarlo.
    type UpdateProfileArgs = Database['public']['Functions']['update_my_profile']['Args']
    const { data, error } = await supabase.rpc('update_my_profile', args as UpdateProfileArgs)
    if (error || !data) return { success: false, reason: 'error' }
    const result = data as { success: boolean; reason?: UpdateProfileReason; points_awarded?: number }
    if (!result.success) return { success: false, reason: result.reason ?? 'error' }
    await get().refreshProfile()
    return { success: true, pointsAwarded: result.points_awarded ?? 0 }
  },

  // ── Admin: customers ──────────────────────────────────────────────────

  fetchAllProfiles: async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    set({ profiles: data ?? [] })
  },

  // ── Dynamics ──────────────────────────────────────────────────────────

  fetchDynamics: async () => {
    const { data } = await supabase.from('dynamics').select('*').order('created_at', { ascending: false })
    set({ dynamics: data ?? [] })

    if (get().isAdmin) {
      const { data: couponsData } = await supabase.from('coupons').select('*')
      set({ coupons: (couponsData as Coupon[]) ?? [] })
    }
  },

  getActiveDynamic: async (keyword) => {
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('dynamics')
      .select('*')
      .eq('keyword', keyword.trim())
      .lte('starts_at', now)
      .gt('ends_at', now)
      .limit(1)
      .maybeSingle()
    return data ?? null
  },

  addDynamic: async (data) => {
    const { error } = await supabase.from('dynamics').insert(data)
    if (error) return { success: false, error: dynamicErrorMessage(error) }
    await get().fetchDynamics()
    return { success: true }
  },

  updateDynamic: async (id, data) => {
    const { error } = await supabase.from('dynamics').update(data).eq('id', id)
    if (error) return { success: false, error: dynamicErrorMessage(error) }
    await get().fetchDynamics()
    return { success: true }
  },

  deleteDynamic: async (id) => {
    const { error } = await supabase.from('dynamics').delete().eq('id', id)
    if (error) {
      const message = error.code === '23503'
        ? 'No se puede eliminar: esta dinámica ya tiene cupones. Ajusta su fecha de fin para desactivarla en su lugar.'
        : error.message
      return { success: false, error: message }
    }
    await get().fetchDynamics()
    return { success: true }
  },

  // ── Coupons ───────────────────────────────────────────────────────────

  redeemKeyword: async (keyword) => {
    const { data, error } = await supabase.functions.invoke('redeem-keyword', {
      body: { keyword },
    })
    if (error) return { success: false, reason: 'error' }
    if (!data.success) return { success: false, reason: data.reason }

    await get().refreshProfile()

    return { success: true, coupon: data.coupon as Coupon }
  },

  scanCoupon: async (couponId) => {
    const { data, error } = await supabase.rpc('scan_coupon', { p_coupon_id: couponId })
    if (error || !data) return { success: false, reason: 'error' }
    const result = data as { success: boolean; reason?: ScanReason; user?: ScanUser; dynamic?: Dynamic }
    if (!result.success) return { success: false, reason: result.reason ?? 'error' }
    return { success: true, user: result.user!, dynamic: result.dynamic! }
  },

  getUserCoupons: async (userId) => {
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    return (data as Coupon[]) ?? []
  },

  // ── Leaderboard ───────────────────────────────────────────────────────

  getLeaderboard: async (period) => (await get().fetchLeaderboard(period)) ?? [],

  // La pantalla de mostrador refresca sola cada minuto y no puede quedarse en blanco por
  // un corte de red: necesita distinguir "falló" de "no hay nadie", y conservar lo que tenía.
  fetchLeaderboard: async (period) => {
    const { data, error } = await supabase.rpc('get_leaderboard', { p_period: period })
    if (error || !data) return null
    return data.map(row => ({
      username: row.username,
      points: row.points,
      esTuFila: row.es_tu_fila,
    }))
  },

  // ── Texto legal ───────────────────────────────────────────────────────

  getLegalStatus: async () => {
    const { data, error } = await supabase.rpc('my_legal_status')
    if (error || !data) return { estado: 'desconocido' as const }
    const pendientes = (data as { pendientes?: { doc_id: string }[] }).pendientes ?? []
    return pendientes.length
      ? { estado: 'pendiente' as const, docs: pendientes.map((p) => p.doc_id) }
      : { estado: 'al-dia' as const }
  },

  acceptLegal: async () => {
    const { data, error } = await supabase.rpc('accept_legal', {
      p_docs: documentosParaAceptar(),
      p_platform: PLATAFORMA,
    })
    if (error || !data) return false
    return (data as { success: boolean }).success === true
  },

  // ── Baja de cuenta ────────────────────────────────────────────────────

  /**
   * Derecho de Cancelación de ARCO, y requisito de Google Play para publicar.
   *
   * La cadena de confirmación tiene que ir literal: no es seguridad —el JWT ya lo es—
   * sino un seguro contra un cliente mal cableado. Ninguna petición accidental borra
   * una cuenta.
   */
  deleteMyAccount: async () => {
    const { data, error } = await supabase.functions.invoke('delete-account', {
      body: { confirmacion: 'ELIMINAR MI CUENTA' },
    })
    // La función responde 4xx con un cuerpo útil, y supabase-js lo trata como error;
    // el cuerpo no llega aquí, así que un fallo se reporta genérico salvo que venga en data.
    if (error && !data) return { success: false, reason: 'error' }
    if (!data?.success) return { success: false, reason: data?.reason ?? 'error' }

    // La sesión apunta a un usuario que ya no existe: limpiarla aquí evita que la app
    // quede en un estado donde hay token pero no hay perfil.
    await supabase.auth.signOut()
    set({ profile: null, isAdmin: false })
    return { success: true }
  },

  /**
   * Baja ejecutada por el personal a peticion del titular.
   *
   * `confirmacion` es el apodo del objetivo, no una cadena fija: el servidor comprueba que
   * corresponda al `userId`, asi que un id arrastrado por error no puede borrar a quien no es.
   *
   * La funcion devuelve 200 con `{success:false, reason}` para los rechazos de negocio
   * —`invoke` se come el cuerpo de los 4xx—, asi que aqui la razon concreta si llega.
   */
  adminDeleteAccount: async (userId, confirmacion, via) => {
    const { data, error } = await supabase.functions.invoke('admin-delete-account', {
      body: { userId, confirmacion, via },
    })
    if (error && !data) return { success: false, reason: 'error' }
    if (!data?.success) return { success: false, reason: data?.reason ?? 'error' }

    // Igual que deleteDynamic: la accion refresca su propia coleccion. `coupons` queda con
    // los del borrado, pero de forma invisible: solo se filtran por un user_id que ya no se
    // pinta, y los conteos de los demas no cambian.
    await get().fetchAllProfiles()
    return { success: true, username: data.username ?? null }
  },

  getLeaderboardRange: async (period) => {
    const { data, error } = await supabase.rpc('get_leaderboard_range', { p_period: period })
    const row = data?.[0]
    if (error || !row || !row.range_start || !row.range_end) return null
    return { start: row.range_start, end: row.range_end }
  },

  // ── Estación ──────────────────────────────────────────────────────────
  //
  // Las pantallas no preguntan cada rato si hay algo nuevo: abren un canal de Realtime y
  // Postgres les empuja la fila en cuanto el panel la cambia. Leer la fila aparte sigue
  // haciendo falta: al arrancar, y al reconectar, porque lo que cambió sin conexión no llega
  // por el canal.

  recargarEstacion: async () => {
    const { data, error } = await supabase.from('estacion').select('periodo_ranking, sabores_ocultos').maybeSingle()
    if (!error && data) set({ estacion: aEstadoEstacion(data) })
  },

  suscribirEstacion: () => {
    const recargar = () => void get().recargarEstacion()
    // Nombre único por suscripción: en desarrollo StrictMode monta el efecto dos veces, y dos
    // canales con el mismo tema se estorban.
    const canal = supabase
      .channel(`estacion-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'estacion' }, ({ new: fila, errors }) => {
        // Realtime avisa del cambio aunque no pueda entregar la fila: con el token vencido
        // llega `new: {}` y `errors: ["Error 401: Unauthorized"]`. Aplicar eso dejaría la
        // pantalla en "todos los sabores, histórico"; se relee la fila en su lugar.
        if (errors?.length || !fila || !('periodo_ranking' in fila)) recargar()
        else set({ estacion: aEstadoEstacion(fila as FilaEstacion) })
      })
      .subscribe(estado => { if (estado === 'SUBSCRIBED') recargar() })

    recargar()
    const alVolver = () => { if (document.visibilityState === 'visible') recargar() }
    document.addEventListener('visibilitychange', alVolver)
    // Red de seguridad para un monitor que pasa días encendido: si el canal se cayera sin
    // avisar, en unos minutos vuelve a cuadrar. Es una lectura de una fila.
    const respaldo = window.setInterval(recargar, 180_000)

    return () => {
      document.removeEventListener('visibilitychange', alVolver)
      window.clearInterval(respaldo)
      void supabase.removeChannel(canal)
    }
  },

  // Las tres acciones son optimistas: el panel cambia al instante y la RPC confirma. Si
  // falla, se regresa a lo que había (aunque tampoco haya red para releer) y luego se relee
  // la fila, para no mostrar algo que no se guardó.

  setPeriodoRanking: async (periodo) => {
    const actual = get().estacion
    if (actual) set({ estacion: { ...actual, periodoRanking: periodo } })
    const ok = rpcExitosa(await supabase.rpc('estacion_set_periodo', { p_periodo: periodo }))
    if (!ok) {
      set({ estacion: actual })
      await get().recargarEstacion()
    }
    return ok
  },

  setSaborVisible: async (saborId, visible) => {
    const actual = get().estacion
    if (actual) {
      const sinEste = actual.saboresOcultos.filter(id => id !== saborId)
      set({ estacion: { ...actual, saboresOcultos: visible ? sinEste : [...sinEste, saborId] } })
    }
    const ok = rpcExitosa(await supabase.rpc('estacion_set_sabor', { p_sabor: saborId, p_visible: visible }))
    if (!ok) {
      set({ estacion: actual })
      await get().recargarEstacion()
    }
    return ok
  },

  mostrarTodosLosSabores: async () => {
    const actual = get().estacion
    if (actual) set({ estacion: { ...actual, saboresOcultos: [] } })
    const ok = rpcExitosa(await supabase.rpc('estacion_mostrar_todos'))
    if (!ok) {
      set({ estacion: actual })
      await get().recargarEstacion()
    }
    return ok
  },
}))
