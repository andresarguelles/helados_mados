/**
 * Punto de entrada del prerender — solo se usa en build. `vite build --ssr` lo compila a
 * `dist-ssr/entry-server.js`, y `scripts/prerender.mjs` lo importa desde ahí para escribir
 * el HTML real de cada ruta pública en `dist/`.
 *
 * Nunca importa `./index.css`: ese CSS lo sirve el bundle del cliente por su propio
 * <link>, ya presente en dist/index.html cuando este módulo corre; duplicarlo aquí no
 * cambiaría nada del HTML que se escribe a disco.
 */
import { StrictMode } from 'react'
import { prerender } from 'react-dom/static'
import { StaticRouter, createRoutesFromChildren } from 'react-router-dom'
import { AppShell, routeElements } from './AppRoutes'
import {
  SEO_ROUTES,
  NOT_FOUND,
  SPA_SHELL,
  SITE_URL,
  seoForPath,
  canonicalFor,
  outputFileFor,
} from './seo/routes'
import { buildHeadTags, headTagsToHtml } from './seo/head'
import { buildSitemapXml } from './seo/sitemap'

// Lo que necesitan scripts/prerender.mjs (y de ahí, scripts/seo-check.mjs): un solo punto
// de entrada al manifiesto SEO desde el bundle compilado, sin que esos scripts tengan que
// resolver src/seo/*.ts por su cuenta.
export {
  SEO_ROUTES,
  NOT_FOUND,
  SPA_SHELL,
  SITE_URL,
  seoForPath,
  canonicalFor,
  outputFileFor,
  buildHeadTags,
  headTagsToHtml,
  buildSitemapXml,
}

// El origin del proyecto de Supabase, para el <link rel="preconnect"> que inyecta
// scripts/prerender.mjs. Se lee en build (este módulo corre en Node, no en el
// navegador), del mismo VITE_SUPABASE_URL que usa src/lib/supabaseClient.ts.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
if (!supabaseUrl) {
  throw new Error(
    'Falta VITE_SUPABASE_URL en el entorno de build: el prerender lo necesita para el preconnect a Supabase.'
  )
}
export const SUPABASE_ORIGIN = new URL(supabaseUrl).origin

// Los mismos <Route> que monta el cliente (src/AppRoutes.tsx), recorridos una sola vez
// para sacar la lista de paths reales. Nunca se parsea el código fuente para adivinarla:
// si mañana hay un <Route> nuevo, esta lista lo ve solo.
export const appRoutePaths: string[] = createRoutesFromChildren(routeElements)
  .map((route) => route.path)
  .filter((path): path is string => typeof path === 'string')

/**
 * Prerenderiza una URL a HTML completo.
 *
 * `prerender` (de `react-dom/static`) y no `renderToString`, porque solo `prerender`
 * espera a Suspense: las páginas de miembro y `qrcode.react` cuelgan de un `React.lazy`,
 * y `renderToString` habría emitido el fallback (`<!--$!-->`) en vez del contenido real.
 */
export async function render(url: string): Promise<string> {
  const errores: unknown[] = []

  const { prelude } = await prerender(
    <StrictMode>
      <StaticRouter location={url}>
        <AppShell />
      </StaticRouter>
    </StrictMode>,
    {
      onError(error) {
        errores.push(error)
      },
      // 10 s: de sobra para un render sin red (no hay `fetch` durante el prerender,
      // los efectos que sí la usan no corren en el servidor) y corto para que un build
      // colgado falle rápido en vez de agotar el timeout de CI.
      signal: AbortSignal.timeout(10000),
    }
  )

  const html = await new Response(prelude).text()

  // El build tiene que fallar de frente: una página a medias en producción es mucho peor
  // que un build en rojo que hay que arreglar antes de desplegar.
  if (errores.length > 0) {
    throw new Error(
      `entry-server: ${errores.length} error(es) al prerenderizar "${url}":\n` +
        errores
          .map((error) => (error instanceof Error ? error.stack ?? error.message : String(error)))
          .join('\n')
    )
  }

  return html
}
