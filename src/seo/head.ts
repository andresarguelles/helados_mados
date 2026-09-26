/**
 * El `<head>` de una ruta, construido desde su entrada en el manifiesto (`routes.ts`).
 *
 * Un solo `buildHeadTags` alimenta dos consumidores que no se pueden desalinear: el HTML
 * prerenderizado (`scripts/prerender.mjs`, vía `headTagsToHtml`) y el `<head>` que se
 * reescribe al navegar en el cliente (`applyHead`). Ninguno usa `<title>`/`<meta>` de
 * React 19 en componentes: eso duplicaría estas etiquetas.
 *
 * Este módulo tiene que poder importarse tanto en Node (build SSR) como en el navegador,
 * así que nada aquí toca `document` fuera de `applyHead`, que hace un no-op sin él.
 */
import { NEGOCIO } from '../content/negocio'
import { canonicalFor, SITE_URL } from './routes'
import type { HeadTag, SeoRoute } from './types'

const OG_IMAGE_DEFAULT = '/og/og-default.png'
const OG_IMAGE_ALT_DEFAULT = `${NEGOCIO.nombre}: ${NEGOCIO.eslogan}`

function metaTag(key: string, attrs: Record<string, string>): HeadTag {
  return { tag: 'meta', key, attrs }
}

/** Arma todas las etiquetas del `<head>` de una ruta, en el orden en que se pintan. */
export function buildHeadTags(route: SeoRoute): HeadTag[] {
  const description = route.description ?? route.title
  const url = canonicalFor(route.path)
  const ogType = route.ogType ?? 'website'
  const ogImagePath = route.ogImage ?? OG_IMAGE_DEFAULT
  const ogImage = `${SITE_URL}${ogImagePath}`
  const ogImageAlt = route.ogImageAlt ?? OG_IMAGE_ALT_DEFAULT
  const robotsContent = route.index ? 'index,follow,max-image-preview:large' : route.robots ?? 'noindex'

  const tags: HeadTag[] = [
    { tag: 'title', key: 'title', text: route.title },
    metaTag('description', { name: 'description', content: description }),
    metaTag('robots', { name: 'robots', content: robotsContent }),
  ]

  // El canonical solo se emite en las indexables: publicarlo en una ruta `noindex` la
  // pondría a competir consigo misma por la señal que el canonical existe para dar.
  if (route.index) {
    tags.push({ tag: 'link', key: 'canonical', attrs: { rel: 'canonical', href: url } })
  }

  tags.push(
    metaTag('og:site_name', { property: 'og:site_name', content: NEGOCIO.nombre }),
    metaTag('og:locale', { property: 'og:locale', content: 'es_MX' }),
    metaTag('og:type', { property: 'og:type', content: ogType }),
    metaTag('og:title', { property: 'og:title', content: route.title }),
    metaTag('og:description', { property: 'og:description', content: description })
  )

  // og:url solo en indexables y siempre igual al canonical: en `*` (NOT_FOUND) `canonicalFor`
  // ni siquiera produce una URL real, y una noindex no necesita anunciar una URL "oficial".
  if (route.index) {
    tags.push(metaTag('og:url', { property: 'og:url', content: url }))
  }

  tags.push(
    metaTag('og:image', { property: 'og:image', content: ogImage }),
    metaTag('og:image:width', { property: 'og:image:width', content: '1200' }),
    metaTag('og:image:height', { property: 'og:image:height', content: '630' }),
    metaTag('og:image:alt', { property: 'og:image:alt', content: ogImageAlt }),
    metaTag('twitter:card', { name: 'twitter:card', content: 'summary_large_image' }),
    metaTag('twitter:title', { name: 'twitter:title', content: route.title }),
    metaTag('twitter:description', { name: 'twitter:description', content: description }),
    metaTag('twitter:image', { name: 'twitter:image', content: ogImage })
  )

  for (const [i, ld] of (route.jsonLd ?? []).entries()) {
    tags.push({
      tag: 'script',
      key: `ld-json-${i}`,
      attrs: { type: 'application/ld+json' },
      text: JSON.stringify(ld),
    })
  }

  return tags
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function attrsToHtml(attrs: Record<string, string>): string {
  return Object.entries(attrs)
    .map(([name, value]) => ` ${name}="${escapeAttr(value)}"`)
    .join('')
}

/** Serializa las etiquetas a la cadena de HTML que va dentro de `<head>…</head>`. */
export function headTagsToHtml(tags: HeadTag[]): string {
  return tags
    .map(tag => {
      const dataSeo = ` data-seo="${escapeAttr(tag.key)}"`
      if (tag.tag === 'title') {
        return `<title${dataSeo}>${escapeText(tag.text)}</title>`
      }
      if (tag.tag === 'script') {
        // Un valor con "</script" adentro del JSON cerraría la etiqueta antes de tiempo
        // si se sirviera tal cual; < no se interpreta como apertura de etiqueta.
        const json = tag.text.replace(/</g, '\\u003c')
        return `<script${dataSeo}${attrsToHtml(tag.attrs)}>${json}</script>`
      }
      // meta / link: sin hijos, se cierran solas.
      return `<${tag.tag}${dataSeo}${attrsToHtml(tag.attrs)} />`
    })
    .join('\n')
}

/**
 * Cliente: reescribe el `<head>` en sitio al navegar. No-op sin `document` (build SSR).
 * `document.title` es el camino estándar para el único `<title>` del documento; el resto
 * de las etiquetas se localiza por `[data-seo="<key>"]`, se actualiza o se crea, y lo que
 * ya no aplica a la ruta nueva (p. ej. el canonical o el JSON-LD de una que se volvió
 * `noindex`) se elimina — nunca se toca una etiqueta sin `data-seo` (favicon, manifest,
 * theme-color, el comentario de GA).
 */
export function applyHead(route: SeoRoute): void {
  if (typeof document === 'undefined') return

  const tags = buildHeadTags(route)
  const vigentes = new Set(tags.map(tag => tag.key))

  document.querySelectorAll('[data-seo]').forEach(el => {
    const key = el.getAttribute('data-seo')
    if (key !== null && !vigentes.has(key)) el.remove()
  })

  for (const tag of tags) {
    if (tag.tag === 'title') {
      document.title = tag.text
      continue
    }

    let el = document.querySelector(`[data-seo="${tag.key}"]`)
    if (!el) {
      el = document.createElement(tag.tag)
      el.setAttribute('data-seo', tag.key)
      document.head.appendChild(el)
    }
    for (const [name, value] of Object.entries(tag.attrs)) {
      el.setAttribute(name, value)
    }
    if (tag.tag === 'script') {
      el.textContent = tag.text
    }
  }
}
