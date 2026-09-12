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

export function toDatetimeLocalValue(date: Date) {
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
}

// Parses a 'YYYY-MM-DD' date as a local calendar date, avoiding the UTC-midnight
// shift that `new Date('YYYY-MM-DD')` causes in negative-offset timezones.
function parseLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatDateRange(startISO: string, endISO: string) {
  const start = parseLocalDate(startISO)
  const end = parseLocalDate(endISO)

  if (startISO === endISO) return format(end, "d MMM yyyy", { locale: es })

  const sameYear = start.getFullYear() === end.getFullYear()
  const startFmt = format(start, sameYear ? 'd MMM' : 'd MMM yyyy', { locale: es })
  const endFmt = format(end, 'd MMM yyyy', { locale: es })
  return `${startFmt} – ${endFmt}`
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
