// Normalización de teléfonos a E.164, que es el único formato que acepta el CHECK
// `profiles_phone_e164` de la base. Vive aquí y no dentro de un modal porque lo necesitan tanto el
// alta (`/bienvenida`) como la edición de perfil.

// El grueso del público del Live es de México, así que un número sin prefijo internacional se asume
// mexicano.
const DEFAULT_COUNTRY_CODE = '52'

export const E164 = /^\+[1-9]\d{7,14}$/

/** Devuelve el número en E.164, o null si no se puede formar uno válido. */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const hasCountryCode = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return null

  const e164 = hasCountryCode ? `+${digits}` : `+${DEFAULT_COUNTRY_CODE}${digits}`
  return E164.test(e164) ? e164 : null
}
