import '../../styles/entorno.css'
import { cn } from '../../lib/utils'

/**
 * Franja fija de 24 px arriba de todo que dice en qué entorno está el sitio (Story 6.8). Solo se
 * monta fuera de producción, desde main.tsx, con import() dentro de una condición sobre
 * `__MADOS_ENTORNO__`. No recibe toques (`pointer-events: none` en entorno.css).
 */
export function FranjaEntorno() {
  const local = __MADOS_ENTORNO__ === 'local'
  return (
    <div
      className={cn(
        'franja-entorno font-heading',
        local ? 'bg-brand-azul text-white' : 'bg-brand-amarillo text-brand-sombra'
      )}
      role="status"
    >
      {local ? 'LOCAL' : 'PRUEBAS'}
    </div>
  )
}
