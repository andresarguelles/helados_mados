/**
 * Preguntas frecuentes de la home.
 *
 * Texto plano a propósito, sin JSX ni Markdown: la misma cadena se pinta en la página y viaja
 * al JSON-LD `FAQPage`, y Google exige que el marcado diga exactamente lo que ve la persona.
 *
 * Cada respuesta tiene que ser fiel a `legal/terminos.md`. Si una regla de la promoción
 * cambia allá, cambia aquí.
 */

export interface PreguntaFrecuente {
  pregunta: string
  respuesta: string
}

export const FAQ: readonly PreguntaFrecuente[] = [
  {
    pregunta: '¿Dónde sale la palabra secreta?',
    respuesta:
      'La damos a conocer en vivo, durante el TikTok Live de @heladosmados o en la dinámica que anunciemos. Escríbela en la app mientras esa dinámica siga activa: fuera de esa ventana no se canjea nada.',
  },
  {
    pregunta: '¿Cuántos puntos puedo ganar?',
    respuesta:
      'Ganas +1 punto al canjear la palabra secreta, +10 cuando presentas tu cupón QR en la estación y te lo escaneamos, y dos bonos de +5 que se dan una sola vez: uno por completar tu perfil (nombre, apellido, fecha de nacimiento y teléfono) y otro al entrar por primera vez con tu cuenta de Google.',
  },
  {
    pregunta: '¿Dónde canjeo mi cupón?',
    respuesta:
      'En nuestra estación de Avenida Centenario 1229, colonia Reacomodo Valentín Gómez Farías, Álvaro Obregón, CDMX. Presenta tu cupón QR en el mostrador y ahí mismo te lo escaneamos y te entregamos tu medalla.',
  },
  {
    pregunta: '¿Participar cuesta algo?',
    respuesta:
      'No. Canjear la palabra secreta y recoger tu medalla no tiene costo. Los puntos tampoco son dinero: no se compran, no se venden ni se cambian por efectivo.',
  },
  {
    pregunta: '¿Hay algún límite para canjear?',
    respuesta:
      'Sí: un cupón por persona y por dinámica, y la misma palabra no se canjea dos veces. Además, cada dinámica tiene existencias limitadas: si el producto se agota, tu cupón puede ser válido y aun así no habrá medalla que entregarte.',
  },
  {
    pregunta: '¿Quién puede participar?',
    respuesta:
      'Solo personas mayores de 18 años. Al crear tu cuenta declaras que ya los cumpliste, y si nos das tu fecha de nacimiento, el sistema rechaza cualquier cuenta que diga lo contrario.',
  },
  {
    pregunta: '¿Cómo creo mi cuenta?',
    respuesta:
      'Con tu cuenta de Google. Solo te pedimos un apodo, tu WhatsApp a diez dígitos y que confirmes tus 18 años cumplidos. Nunca vemos tu contraseña de Google.',
  },
]
