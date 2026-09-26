import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Parses a 'YYYY-MM-DD' date as a local calendar date, avoiding the UTC-midnight
// shift that `new Date('YYYY-MM-DD')` causes in negative-offset timezones.
function parseLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// `cn()` vive aquí y lo importa prácticamente cada componente, así que todo lo que
// `utils.ts` importe viaja en el bundle inicial de cualquier ruta — incluida la home.
// Por eso este archivo no importa `date-fns` (~25 KB minificados con el locale `es`):
// `Intl.DateTimeFormat('es-MX', …)` produce el mismo texto para 'd MMM'/'d MMM yyyy'
// con el motor de fechas nativo del navegador, sin descargar nada. Verificado con un
// script de comparación (12 meses × varios días, mismo año, año cruzado, bisiesto):
// 0 diferencias contra la implementación anterior con date-fns + locale es.
const fmtConAnio = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtSinAnio = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' })

export function formatDateRange(startISO: string, endISO: string) {
  const start = parseLocalDate(startISO)
  const end = parseLocalDate(endISO)

  if (startISO === endISO) return fmtConAnio.format(end)

  const sameYear = start.getFullYear() === end.getFullYear()
  const startFmt = sameYear ? fmtSinAnio.format(start) : fmtConAnio.format(start)
  const endFmt = fmtConAnio.format(end)
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
