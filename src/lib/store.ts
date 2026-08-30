import { create } from 'zustand'
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import { Profile, Dynamic, Coupon } from './types'

// GoTrue rejects RFC 2606/6762 reserved TLDs (.local, .test, .invalid, ...), so this needs to
// look like a real domain even though it's never used to send or receive mail.
const EMAIL_DOMAIN = 'accounts.helados-mados.app'
const usernameToEmail = (username: string) => `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`

// Postgres SQLSTATE 23P01 = exclusion_violation, thrown by dynamics_no_overlapping_keyword
// when the same keyword is active during an overlapping date range.
function dynamicErrorMessage(error: PostgrestError): string {
  if (error.code === '23P01') {
    return 'Ya existe otra dinámica con esta palabra secreta activa en un periodo que se cruza con las fechas elegidas. Usa otra palabra o ajusta las fechas para que no se traslapen.'
  }
  return error.message
}

interface LeaderboardEntry {
  user: { id: string; username: string }
  points: number
}

type LoginResult =
  | { success: true; user: Profile }
  | { success: false; reason: 'invalid_credentials' | 'error' }

type RegisterResult =
  | { success: true; user: Profile }
  | { success: false; reason: 'username_taken' | 'error' }

type DynamicWriteResult = { success: true } | { success: false; error: string }

type RedeemResult =
  | { success: true; coupon: Coupon }
  | { success: false; reason: 'invalid' | 'expired' | 'already_redeemed' | 'ip_limit' | 'not_authenticated' | 'error' }

type ScanResult =
  | { success: true; user: Profile; dynamic: Dynamic }
  | { success: false; reason: 'not_found' | 'already_used' | 'expired' | 'stock_empty' | 'forbidden' | 'error' }

// ─── Store State ──────────────────────────────────────────────────────────────

interface AppState {
  profile: Profile | null
  isAdmin: boolean
  authReady: boolean
  dynamics: Dynamic[]
  coupons: Coupon[]
  profiles: Profile[]

  // Auth
  initAuth: () => () => void
  login: (username: string, password: string) => Promise<LoginResult>
  register: (username: string, password: string) => Promise<RegisterResult>
  logout: () => Promise<void>
  getCurrentUser: () => Profile | null

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
  getLeaderboard: (period: 'day' | 'week' | 'all') => Promise<LeaderboardEntry[]>
}

async function loadProfile(): Promise<Profile | null> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', userData.user.id).single()
  return data
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppState>()((set, get) => ({
  profile: null,
  isAdmin: false,
  authReady: false,
  dynamics: [],
  coupons: [],
  profiles: [],

  // ── Auth ──────────────────────────────────────────────────────────────

  initAuth: () => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const profile = session ? await loadProfile() : null
      set({ profile, isAdmin: profile?.is_admin ?? false, authReady: true })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const profile = session ? await loadProfile() : null
      set({ profile, isAdmin: profile?.is_admin ?? false, authReady: true })
    })

    return () => subscription.unsubscribe()
  },

  login: async (username, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    })
    if (error) return { success: false, reason: 'invalid_credentials' }

    const profile = await loadProfile()
    if (!profile) return { success: false, reason: 'error' }
    set({ profile, isAdmin: profile.is_admin })
    return { success: true, user: profile }
  },

  register: async (username, password) => {
    const trimmed = username.trim()

    const { data: available, error: checkError } = await supabase.rpc('username_available', {
      p_username: trimmed,
    })
    if (checkError) return { success: false, reason: 'error' }
    if (!available) return { success: false, reason: 'username_taken' }

    const { data, error } = await supabase.auth.signUp({
      email: usernameToEmail(trimmed),
      password,
      options: { data: { username: trimmed } },
    })
    if (error || !data.user) return { success: false, reason: 'error' }

    const profile = await loadProfile()
    if (!profile) return { success: false, reason: 'error' }
    set({ profile, isAdmin: profile.is_admin })
    return { success: true, user: profile }
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ profile: null, isAdmin: false })
  },

  getCurrentUser: () => get().profile,

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

    const profile = await loadProfile()
    if (profile) set({ profile })

    return { success: true, coupon: data.coupon as Coupon }
  },

  scanCoupon: async (couponId) => {
    const { data, error } = await supabase.rpc('scan_coupon', { p_coupon_id: couponId })
    if (error || !data) return { success: false, reason: 'error' }
    const result = data as { success: boolean; reason?: ScanResult extends { success: false } ? ScanResult['reason'] : never; user?: Profile; dynamic?: Dynamic }
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
      user: { id: row.user_id, username: row.username },
      points: row.points,
    }))
  },
}))
