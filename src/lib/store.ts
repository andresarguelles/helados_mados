import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  User, Dynamic, Coupon, IpLog,
  INITIAL_USERS, INITIAL_DYNAMICS, INITIAL_COUPONS, IP_LOGS, generateId,
} from './mock-data'

// ─── Store State ──────────────────────────────────────────────────────────────

interface AppState {
  users: User[]
  dynamics: Dynamic[]
  coupons: Coupon[]
  ipLogs: IpLog[]
  currentUserId: string | null
  isAdmin: boolean

  // Auth
  login: (username: string, password: string) => User | null
  register: (username: string, password: string) => User | 'username_taken' | 'error'
  logout: () => void
  getCurrentUser: () => User | null

  // Dynamics
  addDynamic: (data: Omit<Dynamic, 'id' | 'created_at' | 'physical_redeemed'>) => Dynamic
  updateDynamic: (id: string, data: Partial<Dynamic>) => void
  deleteDynamic: (id: string) => void
  getActiveDynamic: (keyword: string) => Dynamic | null

  // Coupons
  redeemKeyword: (keyword: string, userId: string, ip: string) => 
    { success: true; coupon: Coupon } | 
    { success: false; reason: 'invalid' | 'expired' | 'already_redeemed' | 'ip_limit' }
  scanCoupon: (couponId: string) => 
    { success: true; user: User; dynamic: Dynamic } | 
    { success: false; reason: 'not_found' | 'already_used' | 'expired' | 'stock_empty' }
  getUserCoupons: (userId: string) => Coupon[]

  // Leaderboard
  getLeaderboard: (period: 'day' | 'week' | 'all') => { user: User; points: number }[]

  // Reset to initial data (dev only)
  reset: () => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      users: INITIAL_USERS,
      dynamics: INITIAL_DYNAMICS,
      coupons: INITIAL_COUPONS,
      ipLogs: IP_LOGS,
      currentUserId: null,
      isAdmin: false,

      // ── Auth ──────────────────────────────────────────────────────────────

      login: (username, password) => {
        const user = get().users.find(
          u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
        )
        if (!user) return null
        set({ currentUserId: user.id, isAdmin: user.is_admin })
        return user
      },

      register: (username, password) => {
        const exists = get().users.find(
          u => u.username.toLowerCase() === username.toLowerCase()
        )
        if (exists) return 'username_taken'
        const newUser: User = {
          id: generateId(),
          username,
          password,
          total_points: 0,
          is_admin: false,
          created_at: new Date().toISOString(),
        }
        set(s => ({ users: [...s.users, newUser], currentUserId: newUser.id, isAdmin: false }))
        return newUser
      },

      logout: () => set({ currentUserId: null, isAdmin: false }),

      getCurrentUser: () => {
        const { users, currentUserId } = get()
        return users.find(u => u.id === currentUserId) ?? null
      },

      // ── Dynamics ──────────────────────────────────────────────────────────

      addDynamic: (data) => {
        const newDynamic: Dynamic = {
          ...data,
          id: generateId(),
          physical_redeemed: 0,
          created_at: new Date().toISOString(),
        }
        set(s => ({ dynamics: [...s.dynamics, newDynamic] }))
        return newDynamic
      },

      updateDynamic: (id, data) => {
        set(s => ({
          dynamics: s.dynamics.map(d => d.id === id ? { ...d, ...data } : d)
        }))
      },

      deleteDynamic: (id) => {
        set(s => ({ dynamics: s.dynamics.filter(d => d.id !== id) }))
      },

      getActiveDynamic: (keyword) => {
        const now = new Date()
        return get().dynamics.find(d =>
          d.keyword.toUpperCase() === keyword.toUpperCase() &&
          new Date(d.starts_at) <= now &&
          new Date(d.ends_at) > now
        ) ?? null
      },

      // ── Coupons ───────────────────────────────────────────────────────────

      redeemKeyword: (keyword, userId, ip) => {
        const dynamic = get().getActiveDynamic(keyword)
        if (!dynamic) return { success: false, reason: 'invalid' }

        // Check if user already redeemed this dynamic
        const existingCoupon = get().coupons.find(
          c => c.user_id === userId && c.dynamic_id === dynamic.id
        )
        if (existingCoupon) return { success: false, reason: 'already_redeemed' }

        // Check IP limit (max 3 per IP per dynamic)
        const ipLog = get().ipLogs.find(l => l.ip === ip && l.dynamic_id === dynamic.id)
        if (ipLog && ipLog.count >= 3) return { success: false, reason: 'ip_limit' }

        // Create coupon + award +1 point
        const coupon: Coupon = {
          id: generateId(),
          user_id: userId,
          dynamic_id: dynamic.id,
          status: 'active',
          digital_awarded: true,
          physical_awarded: false,
          redeemed_at: null,
          created_at: new Date().toISOString(),
        }

        set(s => {
          const updatedUsers = s.users.map(u =>
            u.id === userId ? { ...u, total_points: u.total_points + 1 } : u
          )
          const existingIpLog = s.ipLogs.find(l => l.ip === ip && l.dynamic_id === dynamic.id)
          const updatedIpLogs = existingIpLog
            ? s.ipLogs.map(l =>
                l.ip === ip && l.dynamic_id === dynamic.id ? { ...l, count: l.count + 1 } : l
              )
            : [...s.ipLogs, { ip, dynamic_id: dynamic.id, count: 1 }]

          return {
            coupons: [...s.coupons, coupon],
            users: updatedUsers,
            ipLogs: updatedIpLogs,
          }
        })

        return { success: true, coupon }
      },

      scanCoupon: (couponId) => {
        const coupon = get().coupons.find(c => c.id === couponId)
        if (!coupon) return { success: false, reason: 'not_found' }

        if (coupon.status === 'redeemed' || coupon.physical_awarded) {
          return { success: false, reason: 'already_used' }
        }

        const dynamic = get().dynamics.find(d => d.id === coupon.dynamic_id)
        if (!dynamic) return { success: false, reason: 'not_found' }

        // Check expiry
        if (new Date(dynamic.ends_at) < new Date()) {
          set(s => ({
            coupons: s.coupons.map(c => c.id === couponId ? { ...c, status: 'expired' } : c)
          }))
          return { success: false, reason: 'expired' }
        }

        // Check stock
        if (dynamic.physical_redeemed >= dynamic.physical_stock) {
          return { success: false, reason: 'stock_empty' }
        }

        const user = get().users.find(u => u.id === coupon.user_id)
        if (!user) return { success: false, reason: 'not_found' }

        // Mark redeemed + award +10 points
        set(s => ({
          coupons: s.coupons.map(c =>
            c.id === couponId
              ? { ...c, status: 'redeemed', physical_awarded: true, redeemed_at: new Date().toISOString() }
              : c
          ),
          dynamics: s.dynamics.map(d =>
            d.id === dynamic.id ? { ...d, physical_redeemed: d.physical_redeemed + 1 } : d
          ),
          users: s.users.map(u =>
            u.id === user.id ? { ...u, total_points: u.total_points + 10 } : u
          ),
        }))

        return { success: true, user, dynamic }
      },

      getUserCoupons: (userId) => {
        return get().coupons.filter(c => c.user_id === userId)
      },

      // ── Leaderboard ───────────────────────────────────────────────────────

      getLeaderboard: (period) => {
        const { users, coupons } = get()
        const now = new Date()
        const nonAdmins = users.filter(u => !u.is_admin)

        if (period === 'all') {
          return nonAdmins
            .sort((a, b) => b.total_points - a.total_points)
            .map(u => ({ user: u, points: u.total_points }))
        }

        // For day/week, filter coupons by time period
        const cutoff = period === 'day'
          ? new Date(now.getTime() - 24 * 60 * 60 * 1000)
          : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

        const periodCoupons = coupons.filter(
          c => new Date(c.created_at) > cutoff
        )

        const pointsByUser: Record<string, number> = {}
        periodCoupons.forEach(c => {
          if (!pointsByUser[c.user_id]) pointsByUser[c.user_id] = 0
          if (c.digital_awarded) pointsByUser[c.user_id] += 1
          if (c.physical_awarded) pointsByUser[c.user_id] += 10
        })

        return nonAdmins
          .map(u => ({ user: u, points: pointsByUser[u.id] ?? 0 }))
          .filter(e => e.points > 0)
          .sort((a, b) => b.points - a.points)
      },

      // ── Dev Reset ─────────────────────────────────────────────────────────

      reset: () => set({
        users: INITIAL_USERS,
        dynamics: INITIAL_DYNAMICS,
        coupons: INITIAL_COUPONS,
        ipLogs: IP_LOGS,
        currentUserId: null,
        isAdmin: false,
      }),
    }),
    {
      name: 'helados-mados-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
