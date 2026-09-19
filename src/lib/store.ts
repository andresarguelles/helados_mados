import { create } from 'zustand'
import type { PostgrestError, Session, UserIdentity } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import { Profile, Dynamic, Coupon } from './types'
import type { Database } from './database.types'
import { saveAuthIntent, clearAuthIntent } from './authIntent'
import { LEGAL_DOCS } from '../content/legal/generated/legalContent'

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
  Object.values(LEGAL_DOCS).map((doc) => ({
    doc_id: doc.id,
    version: doc.version,
    ast_hash: doc.astHash,
  }))

// GoTrue rejects RFC 2606/6762 reserved TLDs (.local, .test, .invalid, ...), so this needs to
// look like a real domain even though it's never used to send or receive mail.
const EMAIL_DOMAIN = 'accounts.helados-mados.app'
const usernameToEmail = (username: string) => `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`

// Desde que el registro es solo con Google conviven dos clases de email primario: el sintético de los
// cadetes legacy y el Gmail real de quien nació con Google y luego se puso contraseña. Por eso el campo
// del formulario acepta apodo o correo: si trae '@' es un correo y se usa tal cual.
const toLoginEmail = (identifier: string) => {
  const trimmed = identifier.trim()
  return trimmed.includes('@') ? trimmed.toLowerCase() : usernameToEmail(trimmed)
}

// Postgres SQLSTATE 23P01 = exclusion_violation, thrown by dynamics_no_overlapping_keyword
// when the same keyword is active during an overlapping date range.
function dynamicErrorMessage(error: PostgrestError): string {
  if (error.code === '23P01') {
    return 'Ya existe otra dinámica con esta palabra secreta activa en un periodo que se cruza con las fechas elegidas. Usa otra palabra o ajusta las fechas para que no se traslapen.'
  }
  return error.message
}

interface LeaderboardEntry {
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

interface LeaderboardRange {
  start: string
  end: string
}

// 'provider_disabled': el proveedor Email está apagado en el dashboard, así que GoTrue rechaza el
// intento sin llegar a mirar la contraseña. No es culpa de quien escribe, y decirle "contraseña
// incorrecta" lo manda a resetearla en vano.
export type LoginFailureReason = 'invalid_credentials' | 'provider_disabled' | 'error'

type LoginResult =
  | { success: true; user: Profile }
  | { success: false; reason: LoginFailureReason }

// Los tres puntos de entrada con contraseña (Login, el paso auth de Redeem y AdminLogin) comparten
// este texto para no volver a divergir. 'provider_disabled' importa: mandar a alguien a revisar su
// contraseña cuando el servidor ni la miró lo deja dando vueltas — pasó con los 175 legacy cuando
// se apagó el proveedor Email.
export function loginErrorMessage(reason: LoginFailureReason, identifier: string): string {
  if (reason === 'provider_disabled') {
    return 'El acceso con contraseña está temporalmente deshabilitado. Entra con Google o inténtalo más tarde.'
  }
  return identifier.includes('@') ? 'Correo o contraseña incorrectos' : 'Usuario o contraseña incorrectos'
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

type OAuthResult = { success: true } | { success: false; reason: 'already_linked' | 'error' }

type PasswordResult = { success: true } | { success: false; reason: 'weak_password' | 'error' }

type UnlinkResult = { success: true } | { success: false; reason: 'needs_password' | 'not_linked' | 'error' }

// ─── Store State ──────────────────────────────────────────────────────────────

interface AppState {
  profile: Profile | null
  isAdmin: boolean
  authReady: boolean
  /** Proveedores vinculados a la cuenta ('email' para los legacy, 'google' tras vincular). */
  identities: UserIdentity[]
  /** Si es false, desvincular Google dejaría al usuario sin ninguna forma de entrar. */
  hasPassword: boolean
  dynamics: Dynamic[]
  coupons: Coupon[]
  profiles: Profile[]

  // Auth
  initAuth: () => () => void
  /** `identifier` es un apodo (legacy) o un correo (nacido con Google + contraseña). */
  login: (identifier: string, password: string) => Promise<LoginResult>
  logout: () => Promise<void>
  getCurrentUser: () => Profile | null
  refreshProfile: () => Promise<void>

  // Google
  signInWithGoogle: (next?: string) => Promise<OAuthResult>
  linkGoogle: () => Promise<OAuthResult>
  unlinkGoogle: () => Promise<UnlinkResult>
  isGoogleLinked: () => boolean
  googleEmail: () => string | null
  /** Con qué se entra usando contraseña: el apodo (legacy) o el correo (nacido con Google). */
  loginIdentifier: () => string | null
  claimGoogleBonus: () => Promise<number>

  // Perfil
  isUsernameAvailable: (username: string) => Promise<boolean | null>
  completeSignup: (input: SignupInput) => Promise<CompleteSignupResult>
  updateMyProfile: (data: ProfileDataInput) => Promise<UpdateProfileResult>
  setPassword: (password: string) => Promise<PasswordResult>

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
  getLeaderboard: (period: 'day' | 'week' | 'month' | 'all') => Promise<LeaderboardEntry[]>
  getLeaderboardRange: (period: 'day' | 'week' | 'month') => Promise<LeaderboardRange | null>

  // Texto legal
  getLegalStatus: () => Promise<LegalStatus>
  acceptLegal: () => Promise<boolean>
}

async function loadProfile(): Promise<Profile | null> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', userData.user.id).single()
  return data
}

async function loadIdentities(): Promise<UserIdentity[]> {
  const { data, error } = await supabase.auth.getUserIdentities()
  if (error || !data) return []
  return data.identities
}

// GoTrue no expone "este usuario tiene contraseña". Los legacy sí la tienen y se delatan por su
// identidad 'email'; a los de Google se la marcamos en user_metadata al momento de crearla.
function derivePasswordFlag(session: Session, identities: UserIdentity[]): boolean {
  if (identities.some(i => i.provider === 'email')) return true
  return session.user.user_metadata?.has_password === true
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
  identities: [],
  hasPassword: false,
  dynamics: [],
  coupons: [],
  profiles: [],

  // ── Auth ──────────────────────────────────────────────────────────────

  initAuth: () => {
    const hydrate = async (session: Session | null) => {
      if (!session) {
        set({ profile: null, isAdmin: false, identities: [], hasPassword: false, authReady: true })
        return
      }
      const [profile, identities] = await Promise.all([loadProfile(), loadIdentities()])
      set({
        profile,
        isAdmin: profile?.is_admin ?? false,
        identities,
        hasPassword: derivePasswordFlag(session, identities),
        authReady: true,
      })
    }

    supabase.auth.getSession().then(({ data: { session } }) => { void hydrate(session) })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrate(session)
    })

    return () => subscription.unsubscribe()
  },

  login: async (identifier, password) => {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: toLoginEmail(identifier),
      password,
    })
    if (error) {
      const disabled = error.code === 'email_provider_disabled'
      return { success: false, reason: disabled ? 'provider_disabled' : 'invalid_credentials' }
    }

    const [profile, identities] = await Promise.all([loadProfile(), loadIdentities()])
    if (!profile) return { success: false, reason: 'error' }
    set({
      profile,
      isAdmin: profile.is_admin,
      identities,
      hasPassword: authData.session ? derivePasswordFlag(authData.session, identities) : true,
    })
    return { success: true, user: profile }
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ profile: null, isAdmin: false, identities: [], hasPassword: false })
  },

  getCurrentUser: () => get().profile,

  refreshProfile: async () => {
    const profile = await loadProfile()
    set({ profile, isAdmin: profile?.is_admin ?? false })
  },

  // ── Google ────────────────────────────────────────────────────────────

  signInWithGoogle: async (next) => {
    saveAuthIntent({ next: next ?? '/perfil', linking: false })
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

  linkGoogle: async () => {
    saveAuthIntent({ next: '/perfil', linking: true })
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: oauthRedirectTo() },
    })
    if (error) {
      clearAuthIntent()
      const alreadyLinked = /already|exists|registered/i.test(error.message)
      return { success: false, reason: alreadyLinked ? 'already_linked' : 'error' }
    }
    return { success: true }
  },

  unlinkGoogle: async () => {
    // Sin contraseña, desvincular Google deja al usuario sin ninguna forma de entrar.
    if (!get().hasPassword) return { success: false, reason: 'needs_password' }

    const identities = await loadIdentities()
    const google = identities.find(i => i.provider === 'google')
    if (!google) return { success: false, reason: 'not_linked' }

    const { error } = await supabase.auth.unlinkIdentity(google)
    if (error) return { success: false, reason: 'error' }

    set({ identities: await loadIdentities() })
    return { success: true }
  },

  isGoogleLinked: () => get().identities.some(i => i.provider === 'google'),

  googleEmail: () => {
    const google = get().identities.find(i => i.provider === 'google')
    const email = google?.identity_data?.email
    return typeof email === 'string' ? email : null
  },

  loginIdentifier: () => {
    const { identities, profile } = get()
    // Un legacy tiene identidad 'email' y su email primario es el sintetico derivado del apodo,
    // asi que signInWithPassword solo funciona escribiendo el apodo. Quien nacio con Google tiene
    // su Gmail real como email primario y entra con el correo. Confundirlos deja al usuario
    // intentando entrar con un dato que nunca va a funcionar.
    const isLegacy = identities.some(i => i.provider === 'email')
    return (isLegacy ? profile?.username : profile?.email) ?? null
  },

  claimGoogleBonus: async () => {
    const { data, error } = await supabase.rpc('claim_google_bonus')
    if (error || !data) return 0
    const result = data as { success: boolean; points_awarded?: number }
    await get().refreshProfile()
    set({ identities: await loadIdentities() })
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

  setPassword: async (password) => {
    // El flag en user_metadata es lo único que nos deja saber después si un usuario de Google
    // ya se puso contraseña (GoTrue no lo expone).
    const { error } = await supabase.auth.updateUser({ password, data: { has_password: true } })
    if (error) {
      const weak = /password/i.test(error.message)
      return { success: false, reason: weak ? 'weak_password' : 'error' }
    }
    set({ hasPassword: true })
    return { success: true }
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

  getLeaderboard: async (period) => {
    const { data, error } = await supabase.rpc('get_leaderboard', { p_period: period })
    if (error || !data) return []
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

  getLeaderboardRange: async (period) => {
    const { data, error } = await supabase.rpc('get_leaderboard_range', { p_period: period })
    const row = data?.[0]
    if (error || !row || !row.range_start || !row.range_end) return null
    return { start: row.range_start, end: row.range_end }
  },
}))
