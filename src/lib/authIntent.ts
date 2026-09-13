// A dónde volver después de un viaje a Google, y si ese viaje era para vincular.
//
// Por qué no va en la URL: el `redirectTo` que se manda a Supabase tiene que coincidir EXACTAMENTE
// con una entrada de la lista blanca de Redirect URLs, y la comparación incluye el query string.
// Un `?next=...` rompe la coincidencia contra una entrada exacta, GoTrue descarta el redirect_to y
// cae al Site URL — que en este proyecto es producción, así que en desarrollo el login aterrizaba
// en heladosmados.com. Manteniendo el redirectTo limpio, la lista blanca es trivial y de paso
// desaparece la superficie de open-redirect: `next` ya no lo controla quien arma la URL.

const KEY = 'mados:auth-intent'

export interface AuthIntent {
  /** Ruta interna a la que volver. */
  next: string
  /** true cuando el viaje fue para vincular Google a una cuenta que ya existía. */
  linking: boolean
}

/** sessionStorage es editable desde devtools, así que `next` se valida igual al leerlo. */
function isInternalPath(value: unknown): value is string {
  return typeof value === 'string'
    && value.startsWith('/')
    && !value.startsWith('//')
}

export function saveAuthIntent(intent: AuthIntent): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(intent))
  } catch {
    // Modo privado o almacenamiento bloqueado: se pierde el destino y AuthCallback usa su default.
  }
}

export function readAuthIntent(): AuthIntent | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AuthIntent>
    if (!isInternalPath(parsed.next)) return null
    return { next: parsed.next, linking: parsed.linking === true }
  } catch {
    return null
  }
}

export function clearAuthIntent(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nada que hacer.
  }
}
