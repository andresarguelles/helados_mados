import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { preloadByPath } from './AppRoutes'
import './index.css'

const container = document.getElementById('root')!

// `scripts/prerender.mjs` marca el root de cada ruta prerenderizada con
// `data-ssr-path="<path>"` (el mismo valor de `route.path` que usa `outputFileFor`, ver
// src/seo/routes.ts). `404.html` y `spa.html` se escriben con el root vacío y SIN ese
// atributo a propósito: ninguna URL real coincide nunca con ellos, así que esas dos
// páginas siempre montan desde cero. Cuando sí coincide, el HTML del servidor ya está
// puesto y hay que hidratar, no volver a crear el árbol.
//
// La comparación es literal, no insensible a mayúsculas, aunque React Router sí matchea
// así: `data-ssr-path` siempre sale de SEO_ROUTES, ya en su forma canónica. Una URL
// escrita con otra capitalización simplemente no hidrata (cae al createRoot de abajo),
// nunca produce una hidratación a medias.
const ssrPath = container.dataset.ssrPath
const here = location.pathname.replace(/\/+$/, '') || '/'

const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// La bandera vive en sessionStorage para que una precarga que falla siempre no deje la
// pestaña recargando en bucle. Si el almacén no está disponible (Safari privado), no se
// recarga: sin forma de recordar el intento, el bucle sería posible.
const CLAVE_RECARGA = 'mados:recarga-por-chunk'

function recargarUnaVez(): boolean {
  try {
    if (sessionStorage.getItem(CLAVE_RECARGA) === '1') return false
    sessionStorage.setItem(CLAVE_RECARGA, '1')
    return true
  } catch {
    return false
  }
}

function olvidarRecarga() {
  try {
    sessionStorage.removeItem(CLAVE_RECARGA)
  } catch {
    // Sin almacén no hay bandera que borrar.
  }
}

async function montar() {
  if (ssrPath && ssrPath === here) {
    // Si esta ruta cuelga de un lazyWithPreload (hoy /terminos y /privacidad, ver
    // preloadByPath en AppRoutes.tsx), hay que esperar a que su chunk YA esté en memoria
    // antes de llamar a hydrateRoot. Si la hidratación arrancara con ese boundary todavía
    // "pendiente" y algo lo actualizara a medio camino (initAuth resolviendo, por
    // ejemplo), React puede rendirse con ese árbol y remontarlo desde cero en el
    // cliente — el parpadeo de vuelta al fallback que el prerender existe para evitar.
    // Las rutas sin entrada en el mapa (la mayoría) no esperan nada.
    try {
      await preloadByPath[here]?.()
      olvidarRecarga()
    } catch (error) {
      // El chunk no bajó (red caída, CDN, un bloqueador). El navegador guarda el fallo de
      // ese import(), así que reintentar sin recargar vuelve a fallar, y montar igual haría
      // que React lance el mismo error y deje la página EN BLANCO. Se recarga una sola vez;
      // si vuelve a fallar, se deja el HTML prerenderizado tal cual: se lee completo y sus
      // enlaces son <a href> de verdad, así que el sitio sigue navegable sin JavaScript.
      console.error('[precarga]', error)
      if (recargarUnaVez()) location.reload()
      return
    }

    ReactDOM.hydrateRoot(container, app, {
      onRecoverableError: (error, errorInfo) => {
        console.error('[hidratación]', error, errorInfo.componentStack)
      },
    })
  } else {
    ReactDOM.createRoot(container).render(app)
  }
}

void montar()
