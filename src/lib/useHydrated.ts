/**
 * Distingue el primer render (el que sale del servidor, o el del cliente antes de que
 * React haya podido "engancharse" a ese HTML) de todos los siguientes.
 *
 * Por qué no basta con `typeof window !== 'undefined'`: eso es verdad desde el primer
 * render en el cliente, pero ese primer render TIENE que producir el mismo árbol que el
 * HTML que ya está en la página o React lo marca como error de hidratación (#418/#423).
 * `useSyncExternalStore` con un snapshot de servidor distinto del snapshot inicial del
 * cliente es justo el patrón que React documenta para esto: la primera vuelta (servidor
 * y cliente) lee `false`, y en cuanto el commit termina se dispara una re-suscripción que
 * la cambia a `true` — ya sin nada que hidratar de por medio.
 *
 * Lo usa `CookieBanner`, que de otro modo leería `localStorage` durante el render.
 */
import { useSyncExternalStore } from 'react'

// No hay nada que suscribir de verdad: el único cambio posible es "ya hidrataste", que
// ocurre una sola vez y React lo detecta solo al re-renderizar tras el commit inicial.
const suscribir = () => () => {}

export function useHydrated(): boolean {
  return useSyncExternalStore(suscribir, () => true, () => false)
}
