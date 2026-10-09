/**
 * Las pantallas de mostrador: monitores verticales en modo quiosco que nadie toca. En ellas
 * no se pinta la barra inferior ni el aviso de cookies.
 *
 * Archivo mínimo a propósito: lo importa `BottomNav`, que va en todas las páginas, incluidas
 * las prerenderizadas.
 */
export const RUTAS_KIOSCO: readonly string[] = [
  '/admin/leaderboard',
  '/admin/flavors',
  // Las mismas, giradas para una TV que no deja girar la imagen (ver KioscoGirado).
  '/admin/leaderboard_90',
  '/admin/leaderboard_270',
  '/admin/flavors_90',
  '/admin/flavors_270',
]

export function esRutaKiosco(pathname: string): boolean {
  const normalizado = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  return RUTAS_KIOSCO.includes(normalizado.toLowerCase())
}
