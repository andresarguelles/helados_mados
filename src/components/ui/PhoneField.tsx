import { cn } from '../../lib/utils'
import { Lock } from 'lucide-react'
import {
  DEFAULT_COUNTRY,
  isValidNational,
  sanitizeNational,
  type PhoneCountry,
} from '../../lib/phone'

interface PhoneFieldProps {
  id: string
  label: string
  /** Solo los dígitos nacionales; la lada la pone el componente. */
  value: string
  onChange: (national: string) => void
  country?: PhoneCountry
  /** El teléfono es de una sola escritura: ya guardado, se muestra pero no se edita. */
  locked?: boolean
  hint?: string
  autoFocus?: boolean
}

/**
 * Campo de WhatsApp con la lada siempre presente y el número nacional aparte.
 *
 * Partirlo en dos es lo que arregla el problema de origen: cuando el usuario escribía todo junto
 * no había forma de saber si los dígitos de más o de menos eran de la lada o del número, y un
 * `+52` con 9 dígitos pasaba como válido. Aquí la lada no se teclea y el contador dice en todo
 * momento cuántos dígitos faltan.
 *
 * Con un solo país en `PHONE_COUNTRIES`, la lada se pinta como prefijo fijo — un desplegable de
 * una sola opción sería un clic que no decide nada, y esto se usa en `/bienvenida`, donde ya hay
 * abandono real. En cuanto haya un segundo país, aquí es donde se convierte en selector.
 */
export default function PhoneField({
  id,
  label,
  value,
  onChange,
  country = DEFAULT_COUNTRY,
  locked = false,
  hint,
  autoFocus,
}: PhoneFieldProps) {
  const complete = isValidNational(value, country)
  const remaining = country.nationalDigits - value.length

  return (
    <div>
      <label htmlFor={id} className="font-heading text-brand-sombra text-xs mb-1.5 block">
        {label}
      </label>

      <div
        className={cn(
          'field-input flex items-center gap-2 p-0 overflow-hidden',
          locked && 'opacity-60 cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'flex items-center gap-1.5 self-stretch pl-4 pr-3 font-body text-brand-sombra',
            'border-r-2 border-brand-sombra/10 bg-brand-sombra/[0.03]'
          )}
          // La lada no es un dato que el usuario escriba, así que tampoco debe ser foco de tabulación.
          aria-label={`Código de país: ${country.label}`}
        >
          <span aria-hidden="true">{country.flag}</span>
          <span className="tabular-nums">+{country.code}</span>
        </span>

        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={value}
          onChange={e => onChange(sanitizeNational(e.target.value, country))}
          readOnly={locked}
          placeholder="5512345678"
          maxLength={country.nationalDigits}
          autoFocus={autoFocus}
          aria-describedby={`${id}-hint`}
          className={cn(
            'flex-1 min-w-0 bg-transparent py-3 pr-3 font-body tabular-nums tracking-wide',
            'text-brand-sombra placeholder:text-brand-sombra/35 focus:outline-none',
            locked && 'cursor-not-allowed'
          )}
        />

        {locked && <Lock className="w-4 h-4 text-brand-gris shrink-0 mr-3" aria-hidden="true" />}
      </div>

      <p id={`${id}-hint`} className="text-[11px] text-brand-gris font-body mt-1.5">
        {locked ? (
          hint ?? 'Tu número ya quedó registrado y no se puede cambiar.'
        ) : complete ? (
          <span className="text-brand-azul">Listo, {country.nationalDigits} dígitos ✓</span>
        ) : value.length === 0 ? (
          (hint ?? `Escribe los ${country.nationalDigits} dígitos de tu WhatsApp, sin la lada.`)
        ) : (
          <>
            {value.length} de {country.nationalDigits} dígitos
            {remaining > 0 && ` — te ${remaining === 1 ? 'falta' : 'faltan'} ${remaining}`}
          </>
        )}
      </p>
    </div>
  )
}
