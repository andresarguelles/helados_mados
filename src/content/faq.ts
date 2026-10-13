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
      'La damos a conocer en vivo, durante el TikTok Live de @heladosmados o en la dinámica que anunciemos. Escríbela en la app mientras esa dinámica siga activa para generar tu cupón: fuera de esa ventana no se generan ni se canjean cupones.',
  },
  {
    pregunta: '¿Cuántos puntos puedo ganar?',
    respuesta:
      'Ganas +1 punto al generar tu cupón con la palabra secreta y +10 cuando lo canjeas en la estación, donde te escaneamos el QR. Registrarte o llenar tus datos no da puntos: toda cuenta empieza en cero.',
  },
  {
    pregunta: '¿Dónde canjeo mi cupón?',
    respuesta:
      'En nuestra estación de Avenida Centenario 1229, colonia Reacomodo Valentín Gómez Farías, Álvaro Obregón, CDMX. Muestra tu cupón QR en el mostrador: ahí mismo te lo escaneamos y te entregamos el premio de esa dinámica.',
  },
  {
    pregunta: '¿Participar cuesta algo?',
    respuesta:
      'No. Generar tu cupón y canjearlo no tiene costo. Los puntos tampoco son dinero: no se compran, no se venden ni se cambian por efectivo.',
  },
  {
    pregunta: '¿Hay algún límite?',
    respuesta:
      'Sí: un cupón por persona y por dinámica; con la misma palabra no se genera un segundo cupón. Además, cada dinámica tiene existencias limitadas: si el producto se agota, tu cupón puede ser válido y aun así no habrá premio que entregarte.',
  },
  {
    pregunta: '¿Quién puede participar?',
    respuesta:
      'Solo personas mayores de 18 años. Al crear tu cuenta declaras que ya los cumpliste.',
  },
  {
    pregunta: '¿Cómo creo mi cuenta?',
    respuesta:
      'Con tu cuenta de Google. Solo te pedimos un apodo y que confirmes tus 18 años cumplidos. Tu WhatsApp es opcional, y lo agregas, cambias o borras cuando quieras desde tu perfil. Nunca vemos tu contraseña de Google.',
  },
]
