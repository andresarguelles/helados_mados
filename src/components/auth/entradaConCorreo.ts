import { lazyWithPreload } from '../../lib/lazyWithPreload'

/**
 * Fuera de producción (Story 6.8) se entra con correo y contraseña. La condición es una constante
 * que el build pliega: en producción esto vale null y el import() desaparece, así que ni el
 * formulario ni signInWithPassword llegan a dist/.
 *
 * Con `lazyWithPreload` para que el prerender (entry-server.tsx) y la hidratación (main.tsx) lo
 * precarguen: con un `lazy` suelto, prerender deja el formulario en un segmento oculto
 * (`<!--$?-->`) y seo:check rechaza la página.
 */
export const EntrarConCorreo =
  __MADOS_ENTORNO__ !== 'produccion' ? lazyWithPreload(() => import('./EntrarConCorreo')) : null
