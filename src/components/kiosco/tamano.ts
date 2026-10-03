/**
 * Un tamaño de letra que hace caber `texto` en una sola línea a lo ancho de su contenedor.
 *
 * Usa `cqw`, así que algún ancestro tiene que declarar `[container-type:inline-size]` (y no
 * una celda de tabla: la contención de tamaño no aplica a las cajas internas de una tabla).
 * `em` es el ancho medio de un carácter de la fuente, medido con capturas: Bungee ~0.7,
 * Baloo 2 en minúsculas y mayúsculas ~0.55. Sin `minimoVh`, encoge lo que haga falta; con él,
 * por debajo de ese tamaño se rinde y deja trabajar al `truncate`.
 */
export function tamanoQueCabe(texto: string, { maximoVh, minimoVh, em }: { maximoVh: number; minimoVh?: number; em: number }): string {
  const ajustado = `calc(100cqw / ${(Math.max(texto.length, 1) * em).toFixed(2)})`
  return minimoVh === undefined
    ? `min(${maximoVh}vh, ${ajustado})`
    : `clamp(${minimoVh}vh, ${ajustado}, ${maximoVh}vh)`
}
