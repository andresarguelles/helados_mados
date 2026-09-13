// El redirect de Google recarga la página, así que el estado de React de /canjear (la palabra secreta,
// el paso actual) se pierde. Esto lo deja guardado para que el canje se reanude solo al volver.
// sessionStorage y no localStorage: si el usuario abandona y cierra la pestaña, no queremos revivir
// un canje viejo en la siguiente visita.

const KEY = 'mados:pending-redeem'

export interface PendingRedeem {
  keyword: string
}

export function savePendingRedeem(pending: PendingRedeem): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(pending))
  } catch {
    // Modo privado o almacenamiento bloqueado: el canje simplemente no se reanuda solo.
  }
}

export function readPendingRedeem(): PendingRedeem | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PendingRedeem>
    if (typeof parsed.keyword !== 'string' || !parsed.keyword) return null
    return { keyword: parsed.keyword }
  } catch {
    return null
  }
}

export function clearPendingRedeem(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nada que hacer.
  }
}
