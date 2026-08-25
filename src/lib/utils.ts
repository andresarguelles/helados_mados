import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return format(new Date(date), "d 'de' MMM, HH:mm", { locale: es })
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
}

export function formatCountdown(endDate: string | Date): string {
  const end = new Date(endDate)
  const now = new Date()
  const diff = end.getTime() - now.getTime()

  if (diff <= 0) return 'Expirado'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h`
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export const EMOJI_MEDALS = ['🥇', '🥈', '🥉']
export const EMOJI_RANKS = ['👑', '⭐', '🌟', '✨', '🎯', '🎪', '🎠', '🎡']

export function getRankEmoji(rank: number): string {
  if (rank < 3) return EMOJI_MEDALS[rank]
  if (rank < 8) return EMOJI_RANKS[rank]
  return `#${rank + 1}`
}

export function getRankColors(rank: number): string {
  if (rank === 0) return 'bg-yellow-400 text-yellow-900'
  if (rank === 1) return 'bg-gray-300 text-gray-700'
  if (rank === 2) return 'bg-amber-600 text-amber-100'
  return 'bg-brand-azul/10 text-brand-azul'
}

export function isDynamicActive(dynamic: { starts_at: string; ends_at: string }): boolean {
  const now = new Date()
  return new Date(dynamic.starts_at) <= now && new Date(dynamic.ends_at) > now
}

export function isDynamicExpired(dynamic: { ends_at: string }): boolean {
  return new Date(dynamic.ends_at) < new Date()
}

export function isDynamicUpcoming(dynamic: { starts_at: string }): boolean {
  return new Date(dynamic.starts_at) > new Date()
}
