// Teléfonos de WhatsApp: normalización a E.164 y validación por país.
//
// Este módulo es el espejo en el cliente de `public.phone_is_valid()` (migración 0021). Los dos
// tienen que cambiar juntos: lo de aquí solo evita el viaje al servidor y da mejores mensajes; lo
// que se aplica de verdad es la función de Postgres, más el CHECK `profiles_phone_valid`.
//
// Antes esto era un E.164 genérico (`^\+[1-9]\d{7,14}$`) que solo pedía entre 8 y 15 dígitos sin
// mirar el país, y por eso se registró una cuenta con 9 dígitos a la que WhatsApp nunca podría
// entregar nada.

export interface PhoneCountry {
  /** Lada internacional, sin el '+'. */
  code: string
  iso: string
  flag: string
  label: string
  /** Dígitos que debe tener el número nacional. En México son 10, ni uno más ni uno menos. */
  nationalDigits: number
}

// Lista blanca: lo que no esté aquí se rechaza, igual que el CASE de `phone_is_valid`. Mientras
// haya un solo país, `PhoneField` lo pinta como prefijo fijo; en cuanto haya dos, se convierte en
// un selector de verdad sin tocar nada más.
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: '52', iso: 'MX', flag: '🇲🇽', label: 'México', nationalDigits: 10 },
]

export const DEFAULT_COUNTRY = PHONE_COUNTRIES[0]

export function countryByCode(code: string): PhoneCountry | null {
  return PHONE_COUNTRIES.find(c => c.code === code) ?? null
}

/**
 * Deja solo los dígitos y recorta al largo del país.
 *
 * El caso del `1` sobrante es real, no teórico: WhatsApp sigue mostrando los móviles mexicanos
 * como +52 1 XXX XXX XXXX (el prefijo de móvil que se eliminó en 2019), así que quien copie su
 * número desde ahí pega 11 dígitos. Rechazarlo se leería como un bug de la app, así que se quita
 * el 1 y se guardan los 10 canónicos. El servidor sí es estricto y rechaza los 11.
 */
export function sanitizeNational(raw: string, country: PhoneCountry = DEFAULT_COUNTRY): string {
  let digits = raw.replace(/\D/g, '')

  if (
    country.iso === 'MX' &&
    digits.length === country.nationalDigits + 1 &&
    digits.startsWith('1')
  ) {
    digits = digits.slice(1)
  }

  return digits.slice(0, country.nationalDigits)
}

/** El número nacional completo y bien formado, o null. Espejo de `phone_is_valid`. */
export function isValidNational(national: string, country: PhoneCountry = DEFAULT_COUNTRY): boolean {
  if (national.length !== country.nationalDigits) return false
  // Ninguna lada mexicana empieza en 0 ni en 1; la función de Postgres exige lo mismo ([2-9]).
  if (country.iso === 'MX' && !/^[2-9]/.test(national)) return false
  return true
}

/** Devuelve el número en E.164 (`+521234567890`), o null si no se puede formar uno válido. */
export function normalizePhone(national: string, country: PhoneCountry = DEFAULT_COUNTRY): string | null {
  const digits = sanitizeNational(national, country)
  return isValidNational(digits, country) ? `+${country.code}${digits}` : null
}

/**
 * Parte un E.164 guardado en sus dos mitades, para poder MOSTRARLO en el campo. Si la lada no es
 * de las aceptadas devuelve null y quien llame decide qué hacer (hoy: enseñarlo tal cual).
 */
export function parsePhone(e164: string | null): { country: PhoneCountry; national: string } | null {
  if (!e164) return null
  const digits = e164.replace(/\D/g, '')

  for (const country of PHONE_COUNTRIES) {
    if (!digits.startsWith(country.code)) continue
    const national = digits.slice(country.code.length)
    if (national.length === country.nationalDigits) return { country, national }
  }
  return null
}

/** Para mostrar: `+52 221 819 7011`. Si no se reconoce, se devuelve tal cual antes que romper. */
export function formatPhone(e164: string | null): string {
  const parsed = parsePhone(e164)
  if (!parsed) return e164 ?? ''

  const { country, national } = parsed
  const groups = national.match(/^(\d{3})(\d{3})(\d{4})$/)
  return groups ? `+${country.code} ${groups[1]} ${groups[2]} ${groups[3]}` : `+${country.code} ${national}`
}
