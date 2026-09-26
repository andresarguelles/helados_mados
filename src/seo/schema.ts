/**
 * Constructores de datos estructurados (JSON-LD), en schema.org.
 *
 * Cada función devuelve un objeto ya completo (con su propio `@context`) y con URLs
 * absolutas: un `<script type="application/ld+json">` nunca hereda `<base>` ni el origen
 * de la página, así que una URL relativa ahí simplemente no resuelve para el rastreador.
 *
 * No importan nada de `./routes`: reciben la URL absoluta ya resuelta (con `canonicalFor`)
 * como parámetro, para que este archivo y `routes.ts` puedan importarse uno al otro sin
 * depender en círculo — `routes.ts` sí importa de aquí.
 */
import { NEGOCIO, PERFILES_OFICIALES, SITE_URL } from '../content/negocio'
import { FAQ } from '../content/faq'

/** Un cruce de migas ya resuelto a URL absoluta (lo arma `routes.ts` a partir de `Migas[]`). */
export interface MigaAbsoluta {
  name: string
  url: string
}

/**
 * El `@graph` de la home: `WebSite` + `IceCreamShop` (el negocio) + `WebPage` de la home,
 * y `FAQPage` si ya hay preguntas cargadas en `src/content/faq.ts` (lo llena A4; mientras
 * esté vacío, se omite el nodo entero en vez de publicar un FAQPage sin preguntas).
 *
 * Un solo objeto con `@graph` en vez de varios `<script>` sueltos: así los nodos se
 * enlazan entre sí por `@id` (el `publisher` de `WebSite` y el `about` de `WebPage`
 * apuntan al mismo `IceCreamShop`) sin repetir sus datos.
 */
export function schemaHome(params: { url: string; title: string; description: string }): object {
  const websiteId = `${SITE_URL}/#website`
  const negocioId = `${SITE_URL}/#negocio`

  const nodes: object[] = [
    {
      '@type': 'WebSite',
      '@id': websiteId,
      name: NEGOCIO.nombre,
      alternateName: 'heladosmados',
      url: `${SITE_URL}/`,
      inLanguage: 'es-MX',
      publisher: { '@id': negocioId },
    },
    {
      '@type': 'IceCreamShop',
      '@id': negocioId,
      name: NEGOCIO.nombre,
      url: `${SITE_URL}/`,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png` },
      image: `${SITE_URL}/og/og-default.png`,
      telephone: `+52 ${NEGOCIO.telefono}`,
      email: NEGOCIO.email,
      address: {
        '@type': 'PostalAddress',
        streetAddress: `${NEGOCIO.direccion.calle}, Col. ${NEGOCIO.direccion.colonia}`,
        addressLocality: NEGOCIO.direccion.alcaldia,
        addressRegion: NEGOCIO.direccion.ciudad,
        postalCode: NEGOCIO.direccion.codigoPostal,
        addressCountry: NEGOCIO.direccion.pais,
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: NEGOCIO.geo.lat,
        longitude: NEGOCIO.geo.lng,
      },
      hasMap: NEGOCIO.mapaUrl,
      // Ciudad de México, no la alcaldía: es el área que de verdad cubren las estaciones móviles.
      areaServed: { '@type': 'City', name: NEGOCIO.direccion.ciudad },
      servesCuisine: 'Helados',
      // Todas las presencias oficiales, mapa incluido: `PERFILES_OFICIALES` ya está pensado
      // para alimentar exactamente este campo (ver el comentario en content/negocio.ts).
      sameAs: [...PERFILES_OFICIALES],
      slogan: NEGOCIO.eslogan,
      // Sin openingHoursSpecification, priceRange ni delivery: decisión del dueño (ver el plan).
    },
    {
      '@type': 'WebPage',
      '@id': `${params.url}#webpage`,
      url: params.url,
      name: params.title,
      description: params.description,
      inLanguage: 'es-MX',
      isPartOf: { '@id': websiteId },
      about: { '@id': negocioId },
    },
  ]

  if (FAQ.length > 0) {
    nodes.push({
      '@type': 'FAQPage',
      // Texto idéntico al que se ve en pantalla: Google exige que el marcado no invente
      // ni recorte lo que la persona realmente lee.
      mainEntity: FAQ.map(item => ({
        '@type': 'Question',
        name: item.pregunta,
        acceptedAnswer: { '@type': 'Answer', text: item.respuesta },
      })),
    })
  }

  return { '@context': 'https://schema.org', '@graph': nodes }
}

/**
 * `WebPage` de una ruta secundaria (no la home, que ya lleva la suya dentro del `@graph`).
 * `dateModified` solo en las legales, y siempre desde `LEGAL_DOCS.<doc>.actualizado` —
 * nunca la fecha del build (lo resuelve quien llama, en `routes.ts`).
 */
export function schemaWebPage(params: {
  url: string
  name: string
  description?: string
  dateModified?: string
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${params.url}#webpage`,
    url: params.url,
    name: params.name,
    inLanguage: 'es-MX',
    isPartOf: { '@id': `${SITE_URL}/#website` },
    ...(params.description ? { description: params.description } : {}),
    ...(params.dateModified ? { dateModified: params.dateModified } : {}),
  }
}

/** `BreadcrumbList` de Inicio → página, con las migas ya resueltas a URL absoluta. */
export function schemaBreadcrumbList(items: readonly MigaAbsoluta[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}
