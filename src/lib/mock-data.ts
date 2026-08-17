import { v4 as uuidv4 } from 'uuid'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface User {
  id: string
  username: string
  password: string        // plain text for mock (hash in prod)
  total_points: number
  is_admin: boolean
  created_at: string
}

export interface Dynamic {
  id: string
  keyword: string
  physical_stock: number
  physical_redeemed: number
  starts_at: string
  ends_at: string
  description: string
  prize_label: string
  created_at: string
}

export interface Coupon {
  id: string
  user_id: string
  dynamic_id: string
  status: 'active' | 'redeemed' | 'expired'
  digital_awarded: boolean
  physical_awarded: boolean
  redeemed_at: string | null
  created_at: string
}

export interface IpLog {
  ip: string
  dynamic_id: string
  count: number
}

// ─── Initial Mock Data ────────────────────────────────────────────────────────

const now = new Date()
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

export const INITIAL_USERS: User[] = [
  { id: 'u1', username: 'IceKingXL', password: 'helado123', total_points: 145, is_admin: false, created_at: lastWeek.toISOString() },
  { id: 'u2', username: 'Fresa2024', password: 'fresa123', total_points: 122, is_admin: false, created_at: lastWeek.toISOString() },
  { id: 'u3', username: 'MintLover', password: 'mint1234', total_points: 98, is_admin: false, created_at: lastWeek.toISOString() },
  { id: 'u4', username: 'VainilaGod', password: 'vainila1', total_points: 87, is_admin: false, created_at: lastWeek.toISOString() },
  { id: 'u5', username: 'ChocoDreams', password: 'choco123', total_points: 76, is_admin: false, created_at: lastWeek.toISOString() },
  { id: 'u6', username: 'TropicalRay', password: 'tropic12', total_points: 65, is_admin: false, created_at: lastWeek.toISOString() },
  { id: 'u7', username: 'LimónFresh', password: 'limon123', total_points: 54, is_admin: false, created_at: lastWeek.toISOString() },
  { id: 'u8', username: 'BerryBlast', password: 'berry123', total_points: 43, is_admin: false, created_at: lastWeek.toISOString() },
  { id: 'admin', username: 'admin', password: 'mados2024admin', total_points: 0, is_admin: true, created_at: lastWeek.toISOString() },
]

export const INITIAL_DYNAMICS: Dynamic[] = [
  {
    id: 'd1',
    keyword: 'LIMONADA',
    physical_stock: 30,
    physical_redeemed: 12,
    starts_at: yesterday.toISOString(),
    ends_at: tomorrow.toISOString(),
    description: 'Paleta de limón gratis',
    prize_label: '🍋 Paleta de Limón Gratis',
    created_at: yesterday.toISOString(),
  },
  {
    id: 'd2',
    keyword: 'FRESA',
    physical_stock: 50,
    physical_redeemed: 50,
    starts_at: lastWeek.toISOString(),
    ends_at: yesterday.toISOString(),
    description: 'Bola de fresa gratis',
    prize_label: '🍓 Bola de Fresa Gratis',
    created_at: lastWeek.toISOString(),
  },
  {
    id: 'd3',
    keyword: 'MANGO',
    physical_stock: 20,
    physical_redeemed: 0,
    starts_at: tomorrow.toISOString(),
    ends_at: nextWeek.toISOString(),
    description: 'Helado de mango con chamoy',
    prize_label: '🥭 Helado de Mango con Chamoy',
    created_at: now.toISOString(),
  },
]

export const INITIAL_COUPONS: Coupon[] = [
  {
    id: 'c1',
    user_id: 'u1',
    dynamic_id: 'd2',
    status: 'redeemed',
    digital_awarded: true,
    physical_awarded: true,
    redeemed_at: lastWeek.toISOString(),
    created_at: lastWeek.toISOString(),
  },
]

export const IP_LOGS: IpLog[] = []

export const generateId = () => uuidv4()
