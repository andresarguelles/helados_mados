/**
 * Los datos del negocio, en un solo lugar.
 *
 * Google cruza el nombre, la dirección y el teléfono (NAP) de la web con los de la ficha de
 * Google Maps y con el resto de la red: si difieren en una coma, pierden peso como señal de
 * negocio local. Por eso el pie, la sección de ubicación de la home y el JSON-LD leen todos
 * de aquí, y nadie vuelve a teclear la dirección.
 *
 * La fuente de verdad legal sigue siendo `legal/*.md` (responsable, RFC, domicilio fiscal);
 * esto es la cara pública de los mismos datos. Si uno cambia, cambian los dos.
 */

export const SITE_URL = 'https://www.heladosmados.com'

export const NEGOCIO = {
  nombre: 'Helados Mados',
  eslogan: 'Despega por un helado',
  url: SITE_URL,
  email: 'contacto@heladosmados.com',
  /** Para mostrar. */
  telefono: '55 1073 7537',
  /** Para `tel:` y para schema.org: E.164. */
  telefonoE164: '+525510737537',
  direccion: {
    calle: 'Avenida Centenario 1229',
    colonia: 'Reacomodo Valentín Gómez Farías',
    alcaldia: 'Álvaro Obregón',
    ciudad: 'Ciudad de México',
    ciudadCorta: 'CDMX',
    codigoPostal: '01569',
    pais: 'MX',
  },
  /** El pin verificado de la estación. Coordenadas y no texto: Google resuelve el texto, no el pin. */
  geo: { lat: 19.35916671342604, lng: -99.2322540358465 },
  /** La ficha de Google Maps (CID sacado del embed de la home). */
  mapaUrl: 'https://maps.google.com/?cid=7040349459736209734',
  comoLlegarUrl:
    'https://www.google.com/maps/dir/?api=1&destination=19.35916671342604,-99.2322540358465',
  redes: {
    tiktok: 'https://www.tiktok.com/@heladosmados',
    instagram: 'https://www.instagram.com/heladosmados',
    facebook: 'https://www.facebook.com/profile.php?id=61557533391525',
    youtube: 'https://www.youtube.com/@heladosmados',
  },
} as const

/** Todas las presencias oficiales: alimenta `sameAs` del JSON-LD. */
export const PERFILES_OFICIALES: readonly string[] = [
  NEGOCIO.redes.tiktok,
  NEGOCIO.redes.instagram,
  NEGOCIO.redes.facebook,
  NEGOCIO.redes.youtube,
  NEGOCIO.mapaUrl,
]
