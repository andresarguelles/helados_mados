/**
 * Catálogo DE MUESTRA para maquetar la pantalla de mostrador `/admin/flavors`. No es el menú
 * real de la Estación: se reemplaza por los sabores verdaderos cuando la pantalla quede
 * aprobada. Un sabor que aparece aquí es un sabor que hay; el que se acaba, se quita.
 *
 * La imagen de cada sabor NO se pone a mano: `npm --prefix tools/brand-assets run sabores`
 * la renderiza en `public/sabores/<id>.jpg` a partir de `color`. Todas comparten forma, luz y
 * encuadre; lo único que cambia es el color, y por eso se ven como una serie. Agregar un sabor
 * es agregar su línea aquí y volver a correr ese script.
 *
 * Solo lo importa esa pantalla (un chunk lazy de admin) y el script: no viaja en ninguna
 * página pública.
 */

export type BaseSabor = 'leche' | 'agua'

export interface Sabor {
  id: string
  nombre: string
  base: BaseSabor
  /** Color del helado, hex sRGB. Pinta el render y sirve de fondo si falta la imagen. */
  color: string
}

export const SABORES: readonly Sabor[] = [
  { id: 'vainilla', nombre: 'Vainilla', base: 'leche', color: '#F1E3BC' },
  { id: 'chocolate', nombre: 'Chocolate', base: 'leche', color: '#5B3524' },
  { id: 'fresa', nombre: 'Fresa', base: 'leche', color: '#F0A6B4' },
  { id: 'nuez', nombre: 'Nuez', base: 'leche', color: '#CDA77A' },
  { id: 'pistache', nombre: 'Pistache', base: 'leche', color: '#BFCB8A' },
  { id: 'mamey', nombre: 'Mamey', base: 'leche', color: '#E9805A' },
  { id: 'galleta', nombre: 'Galleta', base: 'leche', color: '#CFC6B8' },
  { id: 'cajeta', nombre: 'Cajeta', base: 'leche', color: '#B97A3E' },
  { id: 'limon', nombre: 'Limón', base: 'agua', color: '#EEF0B5' },
  { id: 'mango', nombre: 'Mango', base: 'agua', color: '#F6B23C' },
  { id: 'tamarindo', nombre: 'Tamarindo', base: 'agua', color: '#9C5A33' },
  { id: 'jamaica', nombre: 'Jamaica', base: 'agua', color: '#A8274A' },
]
