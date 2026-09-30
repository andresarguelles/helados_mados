import { ReactNode } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * Casilla con el aspecto de la marca sobre un `<input type="checkbox">` real, oculto a la vista
 * pero no al teclado ni al lector de pantalla. Todo el texto es su `<label>`, así que tocar
 * cualquier parte de la frase la marca: antes solo respondía el cuadrito de 20 px.
 *
 * Los enlaces dentro del texto (Términos, Aviso) NO la cambian: el navegador no activa el control
 * de un `<label>` cuando el clic cae en un elemento interactivo. Así nadie acepta sin querer al
 * abrir el documento que va a aceptar.
 */
export default function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
}) {
  return (
    <label className="group relative flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-brand-azul peer-focus-visible:ring-offset-2',
          checked ? 'bg-brand-azul border-brand-sombra' : 'border-brand-sombra/30 group-hover:border-brand-azul'
        )}
      >
        {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
      </span>
      <span className="text-xs text-brand-gris font-body leading-relaxed">{children}</span>
    </label>
  )
}
