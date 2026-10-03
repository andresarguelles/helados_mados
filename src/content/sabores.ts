/**
 * El catálogo de sabores de la Estación: lo que puede aparecer en la pantalla de mostrador
 * `/admin/flavors` y en el panel `/admin/estacion`. Que un sabor se vea o no en pantalla lo
 * decide el personal desde el panel (tabla `estacion`); aquí está la lista completa.
 *
 * La imagen de cada sabor NO se pone a mano: `npm --prefix tools/brand-assets run sabores`
 * la renderiza en `public/sabores/<id>.jpg` a partir de `color`. Todas comparten forma, luz y
 * encuadre; lo único que cambia es el color, y por eso se ven como una serie. Agregar un sabor
 * es agregar su línea aquí y volver a correr ese script. El orden de las líneas no importa:
 * `SABORES` sale en orden alfabético.
 *
 * `base` va a la vista del público y hay quien no toma lácteos: se confirma con la tienda,
 * nunca se supone.
 *
 * Solo lo importan las pantallas de admin (chunks lazy) y el script: no viaja en ninguna
 * página pública.
 */

export type BaseSabor = 'leche' | 'agua'

export interface Sabor {
  id: string
  nombre: string
  base: BaseSabor
  /**
   * Color del helado, hex sRGB. Una lista (hasta 3) pinta bandas, para los sabores que en
   * realidad son varios, como el napolitano. Pinta el render y sirve de fondo si falta la
   * imagen.
   */
  color: string | readonly string[]
}

const CATALOGO: Sabor[] = [
  { id: 'algodon-de-azucar', nombre: 'Algodón de Azúcar', base: 'leche', color: '#F5B8D8' },
  { id: 'beso-de-angel', nombre: 'Beso de Ángel', base: 'leche', color: '#F4DCD6' },
  { id: 'cereza', nombre: 'Cereza', base: 'agua', color: '#C8324C' },
  { id: 'chicle-azul', nombre: 'Chicle Azul', base: 'agua', color: '#6EC3EE' },
  { id: 'chocolate-abuelita', nombre: 'Chocolate Abuelita', base: 'leche', color: '#6B3A26' },
  { id: 'cola-de-tigre', nombre: 'Cola de Tigre', base: 'leche', color: '#EE9A3F' },
  { id: 'ferrero-rocher', nombre: 'Ferrero Rocher', base: 'leche', color: '#8A5A3B' },
  { id: 'huevo-kinder', nombre: 'Huevo Kinder', base: 'leche', color: '#C79F78' },
  { id: 'limon', nombre: 'Limón', base: 'agua', color: '#E4EDB0' },
  { id: 'mamey', nombre: 'Mamey', base: 'leche', color: '#E9805A' },
  { id: 'mango', nombre: 'Mango', base: 'agua', color: '#F6B23C' },
  // Chocolate, vainilla y fresa: el napolitano son tres helados, así que lleva tres bandas.
  { id: 'napolitano', nombre: 'Napolitano', base: 'leche', color: ['#5B3524', '#F1E3BC', '#F0A6B4'] },
  { id: 'nescafe', nombre: 'Nescafé', base: 'leche', color: '#A9805C' },
  { id: 'nuez', nombre: 'Nuez', base: 'leche', color: '#CDA77A' },
  { id: 'oreo', nombre: 'Oreo', base: 'leche', color: '#CFC6B8' },
  { id: 'pan-de-muerto', nombre: 'Pan de Muerto', base: 'leche', color: '#E8C38F' },
  { id: 'pay-de-limon', nombre: 'Pay de Limón', base: 'leche', color: '#F2E6A6' },
  { id: 'picafresa', nombre: 'Picafresa', base: 'agua', color: '#EE5D7E' },
  { id: 'pistache', nombre: 'Pistache', base: 'leche', color: '#BFCB8A' },
  { id: 'queso', nombre: 'Queso', base: 'leche', color: '#F5EDD8' },
  { id: 'queso-con-zarzamora', nombre: 'Queso con Zarzamora', base: 'leche', color: '#CDA2C6' },
  { id: 'tamarindo', nombre: 'Tamarindo', base: 'agua', color: '#9C5A33' },
  { id: 'vainilla', nombre: 'Vainilla', base: 'leche', color: '#F1E3BC' },
  { id: 'yogurt-de-fresa', nombre: 'Yogurt de Fresa', base: 'leche', color: '#F6C9D2' },
]

/** El catálogo en orden alfabético (español: la Á va con la A, la ch con la c). */
export const SABORES: readonly Sabor[] = [...CATALOGO].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

/**
 * Cómo los reparte /admin/flavors: con más de `maximoPorPagina` visibles, en páginas que rotan
 * cada `segundosPorPagina`. Lo lee también el panel, para avisarlo.
 */
export const PAGINAS_DE_SABORES = { maximoPorPagina: 12, segundosPorPagina: 10 } as const

/** Los colores de un sabor, siempre como lista. */
export function coloresDe(sabor: Sabor): readonly string[] {
  return typeof sabor.color === 'string' ? [sabor.color] : sabor.color
}

/** Fondo de respaldo mientras carga la imagen o si falta: el color, o sus bandas. */
export function fondoDe(sabor: Sabor): string {
  const colores = coloresDe(sabor)
  if (colores.length === 1) return colores[0]
  const ancho = 100 / colores.length
  const tramos = colores.map((c, i) => `${c} ${(i * ancho).toFixed(2)}% ${((i + 1) * ancho).toFixed(2)}%`)
  return `linear-gradient(90deg, ${tramos.join(', ')})`
}
