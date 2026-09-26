// Todo lo que necesita date-fns vive aquí, separado de `utils.ts` (que importa `cn()`,
// usado en cada componente de la app). `date-fns` + locale `es` pesan ~25 KB minificados;
// si vivieran en `utils.ts` viajarían en el bundle inicial de cualquier ruta, aunque esa
// ruta nunca formatee una fecha. Solo `CouponCard` (dentro de /cupones) y el panel de admin
// —ambos ya lazy— importan de aquí, así que `date-fns` queda fuera del bundle de entrada.
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export function formatDate(date: string | Date) {
  return format(new Date(date), "d 'de' MMM, HH:mm", { locale: es })
}

export function toDatetimeLocalValue(date: Date) {
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
}
