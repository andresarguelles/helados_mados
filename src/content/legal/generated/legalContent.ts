// GENERADO por scripts/legal-build.mjs desde legal/*.md del repo web.
// NO EDITAR A MANO: el build del otro repo falla si este archivo y el .md difieren.
// Para cambiar el texto: edita legal/<doc>.md, sube `version`, y corre `npm run legal:build`.

import { AlertCircle, AlertTriangle, Ban, BarChart3, Calendar, Check, Copyright, Eye, EyeOff, Gift, Key, Mail, MapPin, Package, Pencil, QrCode, RefreshCw, RotateCcw, Scale, Search, Shield, Star, Ticket, Trash2, UserPlus, Users, XCircle, Zap } from 'lucide-react'

import type { LegalDoc } from '../model'

export const LEGAL_DOCS: Record<string, LegalDoc> = {
  privacidad: {
    id: "privacidad",
    titulo: "Aviso de Privacidad",
    icono: Shield,
    version: "2.0.0",
    actualizado: "2026-09-18",
    astHash: "dbfeecc309a38d77e92cad41c7d06282eb495fedb7b7973251af5f8e2ed4fae5",
    secciones: [
      {
        id: "aviso-corto",
        titulo: "En corto",
        icono: Shield,
        rol: "simplificado",
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Helados Mados, con domicilio en Angel Reyes 7, Lomas de Puerta Grande, Álvaro Obregón, Ciudad de México, C.P. 01630, es responsable de sus datos personales." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Tratamos su apodo, su correo, su número de WhatsApp y, si usted los da, su nombre, su apellido y su fecha de nacimiento. Ninguno es un dato sensible." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Los usamos para crear su cuenta, entregarle sus cupones, llevar su marcador y evitar que una misma persona abra varias cuentas. Eso es el servicio y no depende de un permiso aparte." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Con su permiso, además, le escribimos por WhatsApp y le felicitamos en su cumpleaños. Puede retirar ese permiso desde su perfil cuando quiera, sin perder la cuenta." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Su apodo y sus puntos son públicos en el marcador; su nombre, su correo, su teléfono y su fecha de nacimiento no. Puede pedirnos que limitemos otros usos escribiendo a " }, { t: 'enlace', v: "contact@heladosmados.com", href: "mailto:contact@heladosmados.com" }, { t: 'texto', v: "." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Lea el " }, { t: 'enlaceLegal', v: "aviso de privacidad integral", doc: "privacidad" }, { t: 'texto', v: ", con sus derechos ARCO y todo el detalle, en esta misma aplicación y en www.heladosmados.com." }] },
        ],
      },
      {
        id: "responsable",
        titulo: "Quién es el responsable",
        icono: MapPin,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "El responsable del tratamiento de sus datos personales es «PENDIENTE: nombre completo del responsable», persona física con actividad empresarial que opera bajo el nombre comercial Helados Mados, con Registro Federal de Contribuyentes «PENDIENTE: RFC»." }] },
          {
            tipo: 'lista', alcance: 'ambas',
            items: [
              [{ t: 'texto', v: "Tienda: Angel Reyes 7, Lomas de Puerta Grande, Álvaro Obregón, Ciudad de México, C.P. 01630, México" }],
              [{ t: 'texto', v: "Domicilio fiscal: «PENDIENTE: domicilio fiscal»" }],
              [{ t: 'texto', v: "Correo para asuntos de datos personales: " }, { t: 'enlace', v: "contact@heladosmados.com", href: "mailto:contact@heladosmados.com" }],
              [{ t: 'texto', v: "Teléfono: «PENDIENTE: teléfono de contacto»" }],
              [{ t: 'texto', v: "Sitio: " }, { t: 'enlace', v: "www.heladosmados.com", href: "https://www.heladosmados.com" }],
            ],
          },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Este aviso cubre por igual el sitio web y la aplicación para Android. " }, { t: 'fuerte', v: "Es el mismo documento en las dos." }, { t: 'texto', v: " Lo único que cambia son los apartados marcados como propios de una plataforma, que usted ve igualmente desde la otra, con su etiqueta." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Las reglas de la promoción están en los " }, { t: 'enlaceLegal', v: "términos y condiciones", doc: "terminos" }, { t: 'texto', v: "." }] },
        ],
      },
      {
        id: "datos",
        titulo: "Qué datos tratamos",
        icono: Users,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Esta es la lista completa de los datos personales que guardamos de usted. No hay otros." }] },
          {
            tipo: 'lista', alcance: 'ambas',
            items: [
              [{ t: 'fuerte', v: "Identificador de cuenta." }, { t: 'texto', v: " Un número que le asigna el sistema al crearla. Es público en el marcador." }],
              [{ t: 'fuerte', v: "Apodo." }, { t: 'texto', v: " Lo elige usted al darse de alta. Es obligatorio y es público." }],
              [{ t: 'fuerte', v: "Correo electrónico." }, { t: 'texto', v: " Nos lo da Google al iniciar sesión. No existe ninguna pantalla donde usted lo escriba, y por eso todo correo que guardamos está verificado por Google." }],
              [{ t: 'fuerte', v: "Número de WhatsApp." }, { t: 'texto', v: " Lo escribe usted al darse de alta y es obligatorio. Solo aceptamos números de México, a diez dígitos. " }, { t: 'fuerte', v: "No se puede cambiar después." }],
              [{ t: 'fuerte', v: "Su consentimiento para recibir mensajes" }, { t: 'texto', v: ", junto con la fecha y la hora en que lo otorgó. Es obligatorio para crear la cuenta, y se puede retirar en cuanto la cuenta existe." }],
              [{ t: 'fuerte', v: "Nombre y apellido." }, { t: 'texto', v: " Nos los da Google, y usted puede corregirlos o borrarlos. No son obligatorios." }],
              [{ t: 'fuerte', v: "Fecha de nacimiento." }, { t: 'texto', v: " La escribe usted. No es obligatoria." }],
              [{ t: 'fuerte', v: "Foto de perfil." }, { t: 'texto', v: " Google nos da la dirección de internet donde está alojada esa imagen. La guardamos, pero " }, { t: 'fuerte', v: "hoy no la mostramos en ninguna pantalla." }],
              [{ t: 'fuerte', v: "Sus puntos, sus cupones y las marcas de los bonos" }, { t: 'texto', v: " que ya recibió. Los genera el sistema a partir de su actividad." }],
              [{ t: 'fuerte', v: "Un valor derivado de su dirección IP" }, { t: 'texto', v: " cuando canjea una palabra secreta. Tiene su propio apartado más abajo." }],
              [{ t: 'fuerte', v: "El registro de qué versión de estos documentos aceptó usted y cuándo." }],
            ],
          },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Al crear una cuenta le pedimos el apodo, el número de WhatsApp y el consentimiento. Todo lo demás es opcional o nos lo da Google." }] },
          { tipo: 'parrafo', alcance: 'web', spans: [{ t: 'texto', v: "En el sitio web, su navegador guarda además su sesión iniciada, y durante el alta guarda temporalmente algunos datos del proceso que se borran al terminarlo o al cerrar la pestaña. Eso vive en su navegador, no en nuestros servidores." }] },
        ],
      },
      {
        id: "sensibles",
        titulo: "No tratamos datos sensibles",
        icono: XCircle,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'fuerte', v: "No tratamos datos personales sensibles." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "No le pedimos ni guardamos información sobre su salud, su origen racial o étnico, sus creencias religiosas, filosóficas o morales, sus opiniones políticas, su información genética ni su preferencia sexual." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Tampoco tratamos datos financieros o patrimoniales. La plataforma no cobra nada y no procesa pagos." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Si algún día necesitáramos un dato sensible, se lo pediríamos aparte y con su consentimiento expreso y por escrito, como exige la ley." }] },
        ],
      },
      {
        id: "finalidades-necesarias",
        titulo: "Para qué usamos sus datos: finalidades necesarias",
        icono: Check,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Estas finalidades son necesarias para la relación entre usted y nosotros. Sin ellas la plataforma no funciona, así que no dependen de un consentimiento aparte:" }] },
          {
            tipo: 'lista', alcance: 'ambas',
            items: [
              [{ t: 'texto', v: "Crear su cuenta, identificarle y permitirle iniciar sesión." }],
              [{ t: 'texto', v: "Registrar el canje de una palabra secreta, emitir su cupón QR y validarlo en el mostrador de la tienda." }],
              [{ t: 'texto', v: "Llevar la cuenta de sus puntos y mostrar el marcador público de la promoción." }],
              [{ t: 'texto', v: "Impedir el abuso de las promociones: un número de teléfono por cuenta, un cupón por persona y por dinámica, y un máximo de tres canjes por red de internet y dinámica." }],
              [{ t: 'texto', v: "Atender lo que nos pida sobre su cuenta, incluidas sus solicitudes de derechos ARCO." }],
              [{ t: 'texto', v: "Conservar la prueba de qué versión de estos documentos aceptó y cuándo." }],
              [{ t: 'texto', v: "Cumplir con las obligaciones legales que nos correspondan y atender requerimientos fundados y motivados de autoridad competente." }],
            ],
          },
        ],
      },
      {
        id: "finalidades-voluntarias",
        titulo: "Finalidades voluntarias y cómo negarse",
        icono: Gift,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Estas otras finalidades no son necesarias para el servicio. Si dice que no, su cuenta, sus puntos y sus cupones siguen exactamente igual:" }] },
          {
            tipo: 'lista', alcance: 'ambas',
            items: [
              [{ t: 'fuerte', v: "Escribirle por WhatsApp" }, { t: 'texto', v: " sobre dinámicas, palabras secretas y promociones." }],
              [{ t: 'fuerte', v: "Felicitarle o enviarle una promoción en su cumpleaños" }, { t: 'texto', v: ", si nos dio su fecha de nacimiento." }],
              [{ t: 'fuerte', v: "Atenderle por su nombre" }, { t: 'texto', v: " en la tienda, si nos dio su nombre y su apellido." }],
              [{ t: 'fuerte', v: "Medir cómo se usa el sitio web" }, { t: 'texto', v: " para mejorarlo." }],
            ],
          },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Cómo negarse a cada una:" }] },
          {
            tipo: 'lista', alcance: 'ambas',
            items: [
              [{ t: 'texto', v: "Para los mensajes de WhatsApp: no marque la casilla al crear su cuenta, o desmárquela después en su perfil. " }, { t: 'fuerte', v: "No es obligatoria" }, { t: 'texto', v: ": puede tener su cuenta, sus puntos y sus cupones sin aceptar recibir mensajes. Hasta septiembre de 2026 sí lo era, y lo cambiamos al escribir este aviso, porque un permiso que hay que dar a fuerza para poder registrarse no es un permiso libre." }],
              [{ t: 'texto', v: "Para el cumpleaños y para su nombre: no llene esos campos, o bórrelos desde su perfil cuando quiera." }],
              [{ t: 'texto', v: "Para la medición del sitio web: recházela en el aviso de cookies que aparece al entrar." }],
              [{ t: 'texto', v: "Para cualquiera de ellas, en cualquier momento: escríbanos a " }, { t: 'enlace', v: "contact@heladosmados.com", href: "mailto:contact@heladosmados.com" }, { t: 'texto', v: "." }],
            ],
          },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Sobre los mensajes de WhatsApp, otra precisión honesta: hoy la plataforma no tiene ningún sistema conectado para enviarlos. Guardamos su número y su permiso. Si le escribimos, lo hacemos desde fuera de la plataforma, con las herramientas de mensajería de siempre." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Tenga presente que completar su nombre, su apellido, su fecha de nacimiento y su teléfono le da cinco puntos, una sola vez. Es un incentivo, no una obligación. Si no los da, no pierde nada más que esos cinco puntos." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'fuerte', v: "Nunca vendemos sus datos personales, y nunca los usamos para publicidad de terceros." }] },
        ],
      },
      {
        id: "publico",
        titulo: "Lo que es público",
        icono: Eye,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "El marcador de la promoción es público. " }, { t: 'fuerte', v: "Cualquier persona puede consultarlo sin iniciar sesión" }, { t: 'texto', v: ", y los cinco primeros lugares aparecen en la página de inicio del sitio." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "De cada participante, el marcador entrega dos cosas: " }, { t: 'fuerte', v: "su apodo y sus puntos" }, { t: 'texto', v: ". Nada más." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Hasta septiembre de 2026 entregaba además el identificador interno de su cuenta, que no se dibujaba en la pantalla pero sí viajaba en la respuesta del servidor, de modo que cualquier persona con conocimientos técnicos podía leerlo. Lo quitamos al escribir este aviso: ahora el servidor solo indica si una fila es la suya, sin revelar de quién es ninguna de las demás." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "No se publican su nombre, su apellido, su correo, su teléfono, su fecha de nacimiento ni su foto." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Quien todavía no ha elegido apodo no aparece en el marcador, y las cuentas del personal tampoco." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Elija su apodo pensando en esto: si pone su nombre completo, su nombre completo será público." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Hoy no existe forma de tener cuenta y no aparecer en el marcador. Si no quiere figurar, escríbanos: la medida que podemos aplicar de inmediato es cancelar su cuenta." }] },
        ],
      },
      {
        id: "direccion-ip",
        titulo: "Su dirección IP",
        icono: Search,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Cuando usted canjea una palabra secreta, nuestro servidor lee la dirección IP desde la que llega la petición, la combina con un secreto que solo existe en el servidor y guarda " }, { t: 'fuerte', v: "únicamente el resultado de esa operación" }, { t: 'texto', v: ": un valor de longitud fija del que no se puede volver atrás. Su dirección IP en claro nunca llega a nuestra base de datos." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Ese valor sirve para una sola cosa: contar cuántos canjes se han hecho desde una misma red en una misma dinámica, y detenerlos en tres." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Somos precisos con lo que esto es y lo que no es. " }, { t: 'fuerte', v: "Es seudonimización, no anonimización." }, { t: 'texto', v: " Nosotros no podemos obtener su dirección IP a partir del valor guardado. Pero alguien que ya conociera una dirección IP y tuviera el secreto del servidor podría comprobar si esa dirección está en la lista. Por eso lo tratamos como un dato personal y por eso se lo declaramos aquí." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Estos registros " }, { t: 'fuerte', v: "no están ligados a su cuenta" }, { t: 'texto', v: ". No guardan quién es usted: solo un valor derivado de una red, una dinámica y un contador. Por esa misma razón, " }, { t: 'fuerte', v: "no se eliminan cuando usted borra su cuenta" }, { t: 'texto', v: ", porque no sabríamos cuáles son los suyos." }] },
        ],
      },
      {
        id: "cookies",
        titulo: "Cookies y herramientas de medición",
        icono: BarChart3,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'web', spans: [{ t: 'texto', v: "En el sitio web usamos cookies y tecnologías parecidas. Al entrar por primera vez verá un aviso de cookies: las de medición solo se cargan si usted las acepta. Puede cambiar de opinión después desde ese mismo aviso, y puede borrar las cookies desde la configuración de su navegador." }] },
          { tipo: 'parrafo', alcance: 'web', spans: [{ t: 'texto', v: "En el sitio web usamos Google Analytics, de Google LLC, para entender cómo se usa el sitio y mejorarlo. Recoge las páginas que visita, el tiempo que pasa en ellas, el tipo de dispositivo y de navegador, y una ubicación aproximada derivada de su dirección IP, que no es una dirección postal. Esta herramienta solo se carga si usted acepta las cookies de medición." }] },
          { tipo: 'parrafo', alcance: 'web', spans: [{ t: 'texto', v: "En el sitio web hay además dos servicios de Google que se cargan siempre, y que nunca habíamos declarado. Las tipografías del sitio se descargan de Google Fonts, y la página de inicio muestra un mapa de Google con la ubicación de la tienda. Por el solo hecho de mostrarlos, Google recibe su dirección IP. No son herramientas de medición nuestras y no podemos desactivarlas sin dejar de mostrar el mapa y las tipografías." }] },
        ],
      },
      {
        id: "aplicacion",
        titulo: "En la aplicación Android",
        icono: QrCode,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'android', spans: [{ t: 'texto', v: "En la aplicación Android pedimos el permiso de " }, { t: 'fuerte', v: "cámara" }, { t: 'texto', v: ". Sirve para una sola pantalla: el escáner de códigos QR que usa el personal de la tienda. Si usted es cliente, nunca se lo pediremos y no necesita concederlo. El escaneo ocurre dentro del teléfono y el código QR solo contiene el identificador del cupón." }] },
          { tipo: 'parrafo', alcance: 'android', spans: [{ t: 'texto', v: "En la aplicación Android no hay analítica, no hay cookies, no hay notificaciones y no leemos identificadores de su dispositivo." }] },
          { tipo: 'parrafo', alcance: 'android', spans: [{ t: 'texto', v: "En la aplicación Android, los datos que la app guarda en su teléfono, incluida su sesión iniciada, " }, { t: 'fuerte', v: "entran en la copia de seguridad de Android" }, { t: 'texto', v: " si usted la tiene activada. Esa copia viaja a su cuenta de Google, no a nosotros, y se rige por las condiciones de Google. Puede desactivarla desde los ajustes de su teléfono. Nunca lo habíamos declarado y por eso lo decimos aquí." }] },
        ],
      },
      {
        id: "terceros",
        titulo: "Con quién compartimos sus datos",
        icono: Package,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "No vendemos sus datos personales. Los compartimos solo con quien hace falta para que la plataforma funcione, y esta es la lista completa:" }] },
          {
            tipo: 'lista', alcance: 'ambas',
            items: [
              [{ t: 'fuerte', v: "Supabase." }, { t: 'texto', v: " Guarda la base de datos, gestiona el inicio de sesión y ejecuta las funciones del servidor." }],
              [{ t: 'fuerte', v: "Vercel." }, { t: 'texto', v: " Aloja el sitio web. Sus registros técnicos reciben la dirección IP de cada visita, en claro y sin pasar por el procedimiento descrito más arriba." }],
              [{ t: 'fuerte', v: "Google." }, { t: 'texto', v: " Interviene en el inicio de sesión y, en el sitio web, en la medición, las tipografías y el mapa de la tienda." }],
            ],
          },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Supabase y Vercel actúan como encargados: tratan los datos por nuestra cuenta, siguiendo nuestras instrucciones, y no pueden usarlos para fines propios. Para la ley mexicana eso es una remisión y no requiere su consentimiento aparte." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Google es distinto: trata parte de la información conforme a sus propias políticas, así que esa comunicación sí es una transferencia a un tercero. Puede leer su política en " }, { t: 'enlace', v: "policies.google.com/privacy", href: "https://policies.google.com/privacy" }, { t: 'texto', v: "." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Los tres son proveedores extranjeros y su infraestructura puede estar ubicada fuera de México, principalmente en Estados Unidos. Al usar la plataforma, sus datos pueden tratarse fuera del país." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "También podemos entregar datos cuando la ley nos obligue o cuando una autoridad competente nos lo requiera de forma fundada y motivada. Para eso no necesitamos su consentimiento." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Fuera de estos casos, no compartimos sus datos con nadie. No hay redes publicitarias, ni píxeles de seguimiento de redes sociales, ni intermediarios de datos." }] },
        ],
      },
      {
        id: "google",
        titulo: "Los datos que recibimos de Google",
        icono: Key,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Cuando usted entra con Google, Google nos comparte cuatro cosas: su correo electrónico, su nombre, su apellido y la dirección de su foto de perfil." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'fuerte', v: "Nunca recibimos su contraseña de Google" }, { t: 'texto', v: ", ni su agenda, ni sus correos, ni sus archivos, ni ningún otro dato de su cuenta de Google." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "El uso que damos a esa información se apega a la Política de Datos de Usuario de los Servicios de API de Google, incluidos sus requisitos de Uso Limitado. En concreto: usamos esos datos solo para que usted pueda entrar y para mostrarle su propia cuenta, no los vendemos, no los cedemos a intermediarios de datos ni a anunciantes, y no los usamos para publicidad. Puede consultar esa política en " }, { t: 'enlace', v: "el sitio de desarrolladores de Google", href: "https://developers.google.com/terms/api-services-user-data-policy" }, { t: 'texto', v: "." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Si usted desvincula su cuenta de Google, " }, { t: 'fuerte', v: "el correo que ya habíamos guardado se conserva" }, { t: 'texto', v: " en nuestra base de datos. Si quiere que lo eliminemos, pídanoslo o borre su cuenta." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Vincular Google le da cinco puntos, una sola vez. Lo comprobamos contra el registro de identidades del servidor, no contra lo que diga la aplicación." }] },
        ],
      },
      {
        id: "arco",
        titulo: "Sus derechos ARCO",
        icono: Pencil,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Usted tiene cuatro derechos sobre sus datos personales:" }] },
          {
            tipo: 'lista', alcance: 'ambas',
            items: [
              [{ t: 'fuerte', v: "Acceso." }, { t: 'texto', v: " Saber qué datos suyos tenemos y para qué los usamos." }],
              [{ t: 'fuerte', v: "Rectificación." }, { t: 'texto', v: " Corregirlos cuando estén mal, incompletos o desactualizados." }],
              [{ t: 'fuerte', v: "Cancelación." }, { t: 'texto', v: " Pedir que los eliminemos." }],
              [{ t: 'fuerte', v: "Oposición." }, { t: 'texto', v: " Pedir que dejemos de usarlos para una finalidad concreta, por una causa legítima." }],
            ],
          },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Para ejercerlos, escriba a " }, { t: 'enlace', v: "contact@heladosmados.com", href: "mailto:contact@heladosmados.com" }, { t: 'texto', v: ". Es gratuito. Esa dirección es también el canal de la persona designada para atender estas solicitudes." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Su solicitud debe contener:" }] },
          {
            tipo: 'lista', alcance: 'ambas',
            items: [
              [{ t: 'texto', v: "Su nombre y un medio para responderle, que puede ser el mismo correo desde el que escribe." }],
              [{ t: 'texto', v: "Copia de una identificación oficial, para acreditar que es usted. Si actúa por usted otra persona, además el documento que acredite su representación." }],
              [{ t: 'texto', v: "La descripción clara de los datos sobre los que quiere ejercer el derecho. Si es acceso, no hace falta precisarlos." }],
              [{ t: 'texto', v: "Qué derecho quiere ejercer, o qué es lo que pide." }],
              [{ t: 'texto', v: "Si es una rectificación, qué debe decir el dato correcto y, si la tiene, la documentación que lo sustente." }],
            ],
          },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Le comunicaremos nuestra decisión en un plazo máximo de " }, { t: 'fuerte', v: "veinte días hábiles" }, { t: 'texto', v: " desde que recibamos su solicitud. Si procede, la haremos efectiva dentro de los " }, { t: 'fuerte', v: "quince días hábiles" }, { t: 'texto', v: " siguientes a esa respuesta. Ambos plazos pueden ampliarse una sola vez, por el mismo tiempo, cuando el caso lo justifique, y en ese supuesto se lo diremos." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Dos límites que preferimos decirle de entrada:" }] },
          {
            tipo: 'lista', alcance: 'ambas',
            items: [
              [{ t: 'fuerte', v: "Su número de teléfono no se puede rectificar desde su perfil." }, { t: 'texto', v: " El sistema lo fija la primera vez y no admite cambios, ni siquiera para borrarlo. Si se equivocó, pídanoslo por correo y lo corregimos nosotros." }],
              [{ t: 'texto', v: "Hay datos que no podemos cancelar mientras exista un motivo legal para conservarlos. Están en el apartado de conservación." }],
            ],
          },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Ejercer un derecho no le impide ejercer otro, y no hace falta ejercer uno antes que otro." }] },
        ],
      },
      {
        id: "revocacion",
        titulo: "Cómo revocar su consentimiento",
        icono: RotateCcw,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Puede retirar su consentimiento en cualquier momento. Retirarlo no tiene efectos hacia atrás: no deshace lo que hicimos legítimamente mientras lo teníamos." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Así se hace:" }] },
          {
            tipo: 'lista', alcance: 'ambas',
            items: [
              [{ t: 'fuerte', v: "Para los mensajes de WhatsApp:" }, { t: 'texto', v: " entre a su perfil y desmarque la casilla de consentimiento. Es inmediato y no pierde la cuenta, ni los puntos, ni los cupones." }],
              [{ t: 'fuerte', v: "Para la medición del sitio web:" }, { t: 'texto', v: " rechace las cookies de medición en el aviso de cookies." }],
              [{ t: 'fuerte', v: "Para cualquier otra cosa:" }, { t: 'texto', v: " escríbanos a " }, { t: 'enlace', v: "contact@heladosmados.com", href: "mailto:contact@heladosmados.com" }, { t: 'texto', v: " indicando que quiere revocar su consentimiento. Le respondemos en los mismos plazos que una solicitud ARCO, y sin costo." }],
            ],
          },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Una advertencia para que no haya malentendidos: hay finalidades que no dependen de su consentimiento, porque son las que hacen funcionar el servicio que usted nos pidió. Mientras tenga cuenta, no podemos dejar de tratar los datos que la cuenta necesita para existir. Si quiere que dejemos de tratarlos del todo, lo que corresponde es borrar la cuenta." }] },
        ],
      },
      {
        id: "limitar",
        titulo: "Cómo limitar el uso o la divulgación de sus datos",
        icono: EyeOff,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Además de los derechos ARCO, puede pedirnos que limitemos el uso o la divulgación de sus datos sin llegar a borrarlos. Estas son las opciones que hoy existen de verdad:" }] },
          {
            tipo: 'lista', alcance: 'ambas',
            items: [
              [{ t: 'texto', v: "Desmarcar la casilla de WhatsApp en su perfil, para que no le escribamos." }],
              [{ t: 'texto', v: "Borrar desde su perfil su nombre, su apellido y su fecha de nacimiento, y quedarse solo con lo indispensable." }],
              [{ t: 'texto', v: "Rechazar las cookies de medición en el sitio web." }],
              [{ t: 'texto', v: "Pedirnos por correo que limitemos un uso concreto. Lo revisamos y le decimos qué podemos hacer y qué no." }],
            ],
          },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Sobre el marcador público, lo repetimos aquí porque es el caso donde más gente se sorprende: hoy no hay forma de tener cuenta y no aparecer en él." }] },
        ],
      },
      {
        id: "conservacion",
        titulo: "Cuánto conservamos sus datos",
        icono: Trash2,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Conservamos sus datos mientras su cuenta exista." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Puede borrar su cuenta cuando quiera, sin costo:" }] },
          {
            tipo: 'lista', alcance: 'ambas',
            items: [
              [{ t: 'texto', v: "Desde su perfil en la aplicación Android." }],
              [{ t: 'texto', v: "Desde su perfil en el sitio web." }],
              [{ t: 'texto', v: "Desde la página pública de solicitud de eliminación, si ya no puede entrar a su cuenta: «PENDIENTE: URL pública de solicitud de eliminación de cuenta»." }],
              [{ t: 'texto', v: "Escribiéndonos a " }, { t: 'enlace', v: "contact@heladosmados.com", href: "mailto:contact@heladosmados.com" }, { t: 'texto', v: "." }],
            ],
          },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Al borrar su cuenta eliminamos su perfil, con todos los datos de la lista de arriba, y sus cupones. Sus puntos desaparecen." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Dos cosas sobreviven, y aquí está el porqué de cada una:" }] },
          {
            tipo: 'lista', alcance: 'ambas',
            items: [
              [{ t: 'fuerte', v: "Los registros técnicos antiabuso" }, { t: 'texto', v: " derivados de direcciones IP. No podemos borrarlos porque no están ligados a usted: no contienen su nombre, su correo ni su identificador, solo un valor derivado de una red y un contador. No sabríamos cuáles son los suyos." }],
              [{ t: 'fuerte', v: "El registro de que usted aceptó estos documentos" }, { t: 'texto', v: ": su identificador de cuenta, la versión aceptada y la fecha. Es la única prueba de que el consentimiento existió. Lo conservamos bloqueado, sin usarlo para ninguna otra cosa, durante el plazo de prescripción de las acciones legales derivadas de esta relación, y después lo eliminamos. La ley permite expresamente conservar datos con ese fin." }],
            ],
          },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Además guardamos respaldos completos de la base de datos. Un dato que usted borre hoy puede seguir existiendo en un respaldo anterior hasta que ese respaldo se sustituye o se destruye. Esos respaldos no se usan para nada más: están ahí para poder recuperar el servicio si algo se rompe." }] },
        ],
      },
      {
        id: "seguridad",
        titulo: "Cómo protegemos su información",
        icono: Shield,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Tenemos medidas administrativas, técnicas y físicas para proteger sus datos. Sin dar detalles que ayudarían a quien quisiera atacarnos, esto es lo que hay:" }] },
          {
            tipo: 'lista', alcance: 'ambas',
            items: [
              [{ t: 'texto', v: "Todo el tráfico entre su dispositivo y nuestros servidores va cifrado." }],
              [{ t: 'texto', v: "La base de datos aplica reglas de acceso fila por fila: una cuenta solo puede leer y escribir lo suyo." }],
              [{ t: 'texto', v: "Las operaciones que mueven puntos, cupones y existencias se ejecutan en el servidor, no en su teléfono, y comprueban ahí las reglas." }],
              [{ t: 'texto', v: "No guardamos contraseñas en claro. Las cuentas antiguas con contraseña la tienen almacenada cifrada por nuestro proveedor de autenticación, de forma que nadie de Helados Mados puede leerla." }],
              [{ t: 'texto', v: "Su dirección IP se guarda solo como un valor derivado, combinado con un secreto que vive únicamente en el servidor." }],
              [{ t: 'texto', v: "El panel de administración está restringido al personal autorizado, y esa autorización se comprueba en el servidor." }],
            ],
          },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Ningún sistema es infalible. Si ocurre una vulneración de seguridad que afecte de forma significativa sus derechos, se lo comunicaremos para que pueda tomar medidas, como exige la ley." }] },
        ],
      },
      {
        id: "menores",
        titulo: "Menores de edad",
        icono: Calendar,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "La plataforma es solo para mayores de 18 años y no está dirigida a menores de edad." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Al crear su cuenta usted declara que es mayor de edad. Si nos da su fecha de nacimiento, el sistema rechaza cualquiera que implique lo contrario." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "No recabamos de manera consciente datos personales de menores de edad. Si detectamos que una cuenta es de un menor, la cancelamos y eliminamos sus datos." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Si usted es madre, padre o tutor y cree que un menor a su cargo nos dio sus datos, escríbanos a " }, { t: 'enlace', v: "contact@heladosmados.com", href: "mailto:contact@heladosmados.com" }, { t: 'texto', v: " y los eliminaremos." }] },
        ],
      },
      {
        id: "cambios",
        titulo: "Cambios a este aviso",
        icono: RefreshCw,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Podemos cambiar este aviso cuando cambie lo que hacemos con sus datos, cuando cambie la ley o cuando añadamos una función nueva." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Cada versión lleva un número y una fecha, junto a este texto. La versión vigente está siempre publicada en la aplicación y en www.heladosmados.com. Ese es el medio por el que le comunicamos los cambios." }] },
          {
            tipo: 'lista', alcance: 'ambas',
            items: [
              [{ t: 'texto', v: "Si el cambio es menor, por ejemplo una corrección de redacción, se publica aquí con una fecha nueva." }],
              [{ t: 'texto', v: "Si el cambio es de fondo, es decir, si cambia qué datos tratamos o para qué, " }, { t: 'fuerte', v: "le pediremos aceptar el aviso nuevo dentro de la plataforma" }, { t: 'texto', v: ", en una pantalla que verá al entrar, antes de poder seguir usándola." }],
            ],
          },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Guardamos qué versión aceptó usted y cuándo. Ese registro es el que nos permite acreditar su consentimiento, y es también el que sobrevive al borrado de su cuenta, como explicamos más arriba." }] },
        ],
      },
      {
        id: "autoridad",
        titulo: "Ante quién puede reclamar",
        icono: Scale,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Si cree que hemos tratado mal sus datos personales, escríbanos primero a " }, { t: 'enlace', v: "contact@heladosmados.com", href: "mailto:contact@heladosmados.com" }, { t: 'texto', v: ". Casi todo se resuelve así, y más rápido." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Si no queda conforme, puede presentar una solicitud de protección de datos ante la autoridad. Desde el 21 de marzo de 2025 esa autoridad es la " }, { t: 'fuerte', v: "Secretaría Anticorrupción y Buen Gobierno" }, { t: 'texto', v: ", que asumió las funciones del extinto Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos Personales." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Tiene quince días hábiles para hacerlo, contados desde que le comunicamos nuestra respuesta. Si no le respondemos dentro de nuestro plazo, puede presentarla en cuanto ese plazo venza." }] },
        ],
      },
      {
        id: "contacto",
        titulo: "Contacto",
        icono: Mail,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Para cualquier asunto relacionado con sus datos personales, incluidos sus derechos ARCO y la revocación de su consentimiento:" }] },
          {
            tipo: 'lista', alcance: 'ambas',
            items: [
              [{ t: 'texto', v: "Correo: " }, { t: 'enlace', v: "contact@heladosmados.com", href: "mailto:contact@heladosmados.com" }],
              [{ t: 'texto', v: "Tienda: Angel Reyes 7, Lomas de Puerta Grande, Álvaro Obregón, Ciudad de México, C.P. 01630, México" }],
              [{ t: 'texto', v: "Teléfono: «PENDIENTE: teléfono de contacto»" }],
            ],
          },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Las reglas de la promoción, los puntos y la cancelación de cuenta están en los " }, { t: 'enlaceLegal', v: "términos y condiciones", doc: "terminos" }, { t: 'texto', v: "." }] },
        ],
      },
    ],
  },
  terminos: {
    id: "terminos",
    titulo: "Términos y Condiciones",
    icono: Shield,
    version: "2.0.0",
    actualizado: "2026-09-18",
    astHash: "4283c8272a8553f057cc93847240e35935038b9a48bd7856a7871ed6c009b982",
    secciones: [
      {
        id: "aceptacion",
        titulo: "Lo que acepta al usar Helados Mados",
        icono: Shield,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Estos Términos y Condiciones son el acuerdo entre usted y Helados Mados por el uso de nuestra plataforma de promociones." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "La plataforma tiene dos caras: el sitio web www.heladosmados.com y la aplicación para Android. " }, { t: 'fuerte', v: "Este es el mismo documento en las dos." }, { t: 'texto', v: " Todo lo que lea aquí aplica igual en ambas. Lo único que cambia son los apartados marcados como propios de una plataforma, que usted verá igualmente desde la otra, con su etiqueta." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Al crear una cuenta, canjear una palabra secreta o usar cualquier parte de la plataforma, usted acepta estos términos y el " }, { t: 'enlaceLegal', v: "aviso de privacidad", doc: "privacidad" }, { t: 'texto', v: ". Si no está de acuerdo con ellos, no use la plataforma." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Cada documento lleva una versión y una fecha. Guardamos cuál aceptó usted y cuándo. Lo explicamos en el apartado de cambios." }] },
        ],
      },
      {
        id: "responsable",
        titulo: "Quiénes somos",
        icono: MapPin,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Helados Mados es el nombre comercial de «PENDIENTE: nombre completo del responsable», persona física con actividad empresarial, con Registro Federal de Contribuyentes «PENDIENTE: RFC»." }] },
          {
            tipo: 'lista', alcance: 'ambas',
            items: [
              [{ t: 'texto', v: "Tienda: Angel Reyes 7, Lomas de Puerta Grande, Álvaro Obregón, Ciudad de México, C.P. 01630, México" }],
              [{ t: 'texto', v: "Domicilio fiscal: «PENDIENTE: domicilio fiscal»" }],
              [{ t: 'texto', v: "Correo: " }, { t: 'enlace', v: "contact@heladosmados.com", href: "mailto:contact@heladosmados.com" }],
              [{ t: 'texto', v: "Teléfono: «PENDIENTE: teléfono de contacto»" }],
              [{ t: 'texto', v: "Sitio: " }, { t: 'enlace', v: "www.heladosmados.com", href: "https://www.heladosmados.com" }],
            ],
          },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Cuando en este documento decimos \"nosotros\", nos referimos a esa persona." }] },
        ],
      },
      {
        id: "mayoria-de-edad",
        titulo: "Solo para mayores de 18 años",
        icono: Calendar,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "La plataforma es para personas mayores de 18 años. No está dirigida a menores de edad." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Al crear su cuenta, usted marca una casilla declarando que tiene 18 años cumplidos o más. Esa declaración es suya y la tomamos como cierta." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Si nos da su fecha de nacimiento, el sistema rechaza cualquiera que implique que usted es menor de edad." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Si detectamos que una cuenta pertenece a un menor, la cancelamos y eliminamos sus datos. No hay compensación por los puntos o cupones que tuviera." }] },
        ],
      },
      {
        id: "cuenta",
        titulo: "Su cuenta",
        icono: UserPlus,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Las cuentas nuevas se crean únicamente con Google. Al hacerlo, Google nos comparte su correo, su nombre, su apellido y su foto de perfil. " }, { t: 'fuerte', v: "Nunca recibimos su contraseña de Google." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Para terminar el alta le pedimos tres cosas obligatorias y le ofrecemos una opcional:" }] },
          {
            tipo: 'lista', alcance: 'ambas',
            items: [
              [{ t: 'texto', v: "Un apodo. Es el nombre con el que aparecerá ante los demás. Obligatorio." }],
              [{ t: 'texto', v: "Un número de WhatsApp de México, a diez dígitos. Obligatorio." }],
              [{ t: 'texto', v: "Declarar que tiene 18 años cumplidos. Obligatorio." }],
              [{ t: 'texto', v: "Su permiso para escribirle a ese número con avisos de dinámicas y promociones. " }, { t: 'fuerte', v: "Opcional" }, { t: 'texto', v: ": si no lo da, su cuenta funciona igual." }],
            ],
          },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "El teléfono es obligatorio por una razón concreta: " }, { t: 'fuerte', v: "un número, una cuenta" }, { t: 'texto', v: ". Sin esa regla, una misma persona podría abrir varias cuentas de Gmail y llevarse los puntos de una sola transmisión." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Por eso mismo, " }, { t: 'fuerte', v: "el teléfono no se puede cambiar después" }, { t: 'texto', v: ". Una vez guardado queda fijo. Si lo escribió mal, escríbanos a " }, { t: 'enlace', v: "contact@heladosmados.com", href: "mailto:contact@heladosmados.com" }, { t: 'texto', v: " y lo corregimos nosotros. No hay forma de cambiarlo ni de borrarlo desde su perfil dejando la cuenta abierta. Lo decimos claro porque una versión anterior de este documento prometía lo contrario." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "El permiso para recibir mensajes es otra cosa: es opcional, y puede darlo o retirarlo cuando quiera desde su perfil, sin perder la cuenta, los puntos ni los cupones. Guardamos su número aunque no nos dé ese permiso, porque su otra función —que nadie abra varias cuentas— no depende de que usted quiera recibir mensajes." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Su cuenta es personal. Usted es responsable de lo que ocurra con ella. No la comparta ni la venda." }] },
          { tipo: 'parrafo', alcance: 'web', spans: [{ t: 'texto', v: "En el sitio web existe un segundo método de acceso. Las personas que se registraron antes de que las cuentas fueran solo con Google conservan su apodo y su contraseña, y pueden seguir entrando así. La aplicación Android solo ofrece el acceso con Google." }] },
          { tipo: 'parrafo', alcance: 'web', spans: [{ t: 'texto', v: "En el sitio web, si usted tiene una cuenta antigua y quiere empezar a usar Google, vincúlela desde su perfil antes de intentar entrar con Google. Si entra primero con Google se crea una cuenta nueva y vacía, y sus puntos se quedan en la anterior." }] },
        ],
      },
      {
        id: "promocion",
        titulo: "Cómo funciona la promoción",
        icono: Ticket,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Durante una transmisión en TikTok Live u otra dinámica anunciamos una " }, { t: 'fuerte', v: "palabra secreta" }, { t: 'texto', v: "." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Usted la escribe en la plataforma mientras esa dinámica está vigente. Si es correcta, recibe un punto y se genera un " }, { t: 'fuerte', v: "cupón QR" }, { t: 'texto', v: " a su nombre." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Después presenta ese cupón en el mostrador de la tienda. Nuestro personal lo escanea y le entrega el producto de esa dinámica." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Reglas del canje:" }] },
          {
            tipo: 'lista', alcance: 'ambas',
            items: [
              [{ t: 'texto', v: "Un cupón por persona y por dinámica. La misma palabra no se canjea dos veces." }],
              [{ t: 'texto', v: "Cada dinámica tiene fecha y hora de inicio y de fin. Fuera de esa ventana no se canjea nada." }],
              [{ t: 'texto', v: "Se aceptan como máximo tres canjes de una misma dinámica desde una misma red de internet." }],
              [{ t: 'texto', v: "Los cupones son personales e intransferibles. No se venden ni se ceden." }],
              [{ t: 'texto', v: "El cupón se consume al escanearlo. Uno ya canjeado no vuelve a servir." }],
            ],
          },
        ],
      },
      {
        id: "existencias",
        titulo: "Existencias limitadas",
        icono: Package,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Los premios físicos están " }, { t: 'fuerte', v: "sujetos a existencias" }, { t: 'texto', v: ". Cada dinámica tiene una cantidad determinada de producto." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Cuando esa cantidad se agota, el sistema rechaza el canje. Aunque su cupón sea válido, si ya no queda producto de esa dinámica no podemos entregárselo." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Al lanzar cada dinámica anunciamos sus condiciones y su vigencia, como piden los artículos 46 a 48 de la Ley Federal de Protección al Consumidor. Si terminamos o cancelamos una dinámica antes de tiempo, lo anunciamos por el mismo medio por el que la dimos a conocer." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'fuerte', v: "Esto no es un sorteo, ni una rifa, ni un concurso de azar." }, { t: 'texto', v: " No hay tómbola, no hay ganadores elegidos al azar y no hay nada que dependa de la suerte. Quien cumple la condición y llega mientras hay producto, recibe el producto." }] },
        ],
      },
      {
        id: "puntos",
        titulo: "Los puntos",
        icono: Star,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Usted acumula puntos así:" }] },
          {
            tipo: 'lista', alcance: 'ambas',
            items: [
              [{ t: 'fuerte', v: "Un punto" }, { t: 'texto', v: " por canjear una palabra secreta." }],
              [{ t: 'fuerte', v: "Diez puntos" }, { t: 'texto', v: " cuando presenta su cupón QR en el mostrador y lo escaneamos." }],
              [{ t: 'fuerte', v: "Cinco puntos" }, { t: 'texto', v: ", una sola vez, por completar su nombre, su apellido, su fecha de nacimiento y su teléfono." }],
              [{ t: 'fuerte', v: "Cinco puntos" }, { t: 'texto', v: ", una sola vez, por vincular su cuenta de Google." }],
            ],
          },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Y ahora lo importante, dicho sin rodeos:" }] },
          {
            tipo: 'lista', alcance: 'ambas',
            items: [
              [{ t: 'texto', v: "Los puntos " }, { t: 'fuerte', v: "no son dinero" }, { t: 'texto', v: " y no tienen valor monetario." }],
              [{ t: 'fuerte', v: "No se canjean" }, { t: 'texto', v: " por efectivo, por producto ni por ningún otro beneficio. Hoy no existe una tienda de premios ni una recompensa por quedar en primer lugar." }],
              [{ t: 'fuerte', v: "No se transfieren" }, { t: 'texto', v: " entre cuentas, no se venden, no se ceden y no se heredan." }],
              [{ t: 'texto', v: "Hoy los puntos sirven para una sola cosa: ordenar el marcador público de la promoción." }],
              [{ t: 'texto', v: "La sección de Misiones anuncia funciones futuras, como avatares o una cartera digital. Es un anuncio de intención, no un compromiso. Puede cambiar o no llegar a existir." }],
              [{ t: 'texto', v: "Podemos corregir o retirar puntos obtenidos por un error del sistema o de forma indebida." }],
              [{ t: 'texto', v: "Si terminamos la promoción o cerramos la plataforma, los puntos se extinguen sin generar compensación alguna." }],
            ],
          },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "El marcador es público: cualquier persona, sin iniciar sesión, puede ver su apodo y sus puntos. El " }, { t: 'enlaceLegal', v: "aviso de privacidad", doc: "privacidad" }, { t: 'texto', v: " explica exactamente qué se ve y qué no." }] },
        ],
      },
      {
        id: "antifraude",
        titulo: "Derecho de admisión y antifraude",
        icono: AlertTriangle,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Podemos anular un cupón, retirar puntos, suspender o cancelar una cuenta cuando detectemos:" }] },
          {
            tipo: 'lista', alcance: 'ambas',
            items: [
              [{ t: 'texto', v: "Uso de bots, scripts o cualquier sistema automatizado." }],
              [{ t: 'texto', v: "Varias cuentas operadas por la misma persona." }],
              [{ t: 'texto', v: "Intentos de manipular el sistema, suplantar a otra persona o dar datos falsos." }],
              [{ t: 'texto', v: "Reventa, compra o intercambio de cupones o de cuentas." }],
              [{ t: 'texto', v: "Cualquier uso que contradiga el sentido de la promoción." }],
            ],
          },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Esa decisión la tomamos nosotros y no genera compensación ni reembolso. Si cree que nos equivocamos, escríbanos a " }, { t: 'enlace', v: "contact@heladosmados.com", href: "mailto:contact@heladosmados.com" }, { t: 'texto', v: " y lo revisamos." }] },
        ],
      },
      {
        id: "prohibido",
        titulo: "Lo que no se puede hacer",
        icono: Ban,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Al usar la plataforma, usted se compromete a no:" }] },
          {
            tipo: 'lista', alcance: 'ambas',
            items: [
              [{ t: 'texto', v: "Crear cuentas por medios automatizados o con datos falsos." }],
              [{ t: 'texto', v: "Usar el cupón de otra persona o ceder el suyo." }],
              [{ t: 'texto', v: "Eludir o interferir con las medidas de seguridad de la plataforma." }],
              [{ t: 'texto', v: "Extraer datos de forma masiva o automatizada, incluido el marcador público." }],
              [{ t: 'texto', v: "Descompilar el software o aplicarle ingeniería inversa." }],
              [{ t: 'texto', v: "Usar la plataforma para competir con nosotros o para cualquier otro fin comercial ajeno." }],
            ],
          },
        ],
      },
      {
        id: "propiedad",
        titulo: "Propiedad intelectual",
        icono: Copyright,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "El código, el diseño, los textos, las marcas, los logotipos y las imágenes de la plataforma son nuestros o los usamos con licencia." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Se los ofrecemos para su uso personal dentro de la promoción. No puede copiarlos, distribuirlos, modificarlos ni explotarlos comercialmente sin nuestro permiso por escrito." }] },
        ],
      },
      {
        id: "disponibilidad",
        titulo: "Disponibilidad del servicio",
        icono: Zap,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "La plataforma se ofrece " }, { t: 'fuerte', v: "tal cual" }, { t: 'texto', v: " y " }, { t: 'fuerte', v: "según disponibilidad" }, { t: 'texto', v: "." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Puede haber fallas, mantenimientos o interrupciones, incluidas las de nuestros proveedores. Podemos cambiar la plataforma, suspenderla o retirarla." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "No garantizamos que esté disponible en todo momento, ni que una dinámica concreta pueda canjearse en el instante en que usted lo intente." }] },
        ],
      },
      {
        id: "responsabilidad",
        titulo: "Limitación de responsabilidad",
        icono: AlertCircle,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "En la medida máxima que permite la ley, no respondemos por daños indirectos o consecuenciales derivados del uso de la plataforma, ni por la pérdida de puntos o cupones causada por fallas técnicas, por su propio dispositivo o por servicios de terceros." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Nada de lo anterior limita las responsabilidades que la ley mexicana no permite limitar, ni sus derechos como consumidor." }] },
        ],
      },
      {
        id: "borrado",
        titulo: "Cancelar su cuenta",
        icono: Trash2,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Puede borrar su cuenta cuando quiera, sin dar explicaciones y sin costo:" }] },
          {
            tipo: 'lista', alcance: 'ambas',
            items: [
              [{ t: 'texto', v: "Desde su perfil en la aplicación Android." }],
              [{ t: 'texto', v: "Desde su perfil en el sitio web." }],
              [{ t: 'texto', v: "Desde la página pública de solicitud de eliminación, si ya no puede entrar a su cuenta: «PENDIENTE: URL pública de solicitud de eliminación de cuenta»." }],
              [{ t: 'texto', v: "Escribiéndonos a " }, { t: 'enlace', v: "contact@heladosmados.com", href: "mailto:contact@heladosmados.com" }, { t: 'texto', v: "." }],
            ],
          },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Al borrar su cuenta desaparecen su perfil y sus cupones. Sus puntos se pierden y no se pueden recuperar." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Dos cosas sobreviven, y se lo decimos aquí para que no haya sorpresas: los registros técnicos antiabuso, que no están ligados a usted, y el registro de que aceptó estos documentos. El " }, { t: 'enlaceLegal', v: "aviso de privacidad", doc: "privacidad" }, { t: 'texto', v: " explica qué se conserva exactamente, por qué y durante cuánto tiempo." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Nosotros también podemos cancelar su cuenta si usted incumple estos términos." }] },
        ],
      },
      {
        id: "cambios",
        titulo: "Cambios a estos términos",
        icono: RefreshCw,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Podemos cambiar estos términos. Cada cambio se publica aquí con una versión y una fecha nuevas, y la versión vigente está siempre en la aplicación y en el sitio web." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Guardamos un registro de qué versión aceptó usted y cuándo. Ese registro es la prueba de su aceptación." }] },
          {
            tipo: 'lista', alcance: 'ambas',
            items: [
              [{ t: 'texto', v: "Si el cambio es menor, por ejemplo una corrección de redacción, basta con publicarlo aquí. Ese es el medio por el que se lo comunicamos." }],
              [{ t: 'texto', v: "Si el cambio es de fondo, " }, { t: 'fuerte', v: "le pediremos aceptarlo de nuevo dentro de la plataforma" }, { t: 'texto', v: " antes de que pueda seguir usándola. Verá una pantalla con la versión nueva al entrar." }],
            ],
          },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Si no acepta la versión nueva, no podrá seguir usando la plataforma. Siempre podrá escribirnos para borrar su cuenta." }] },
        ],
      },
      {
        id: "ley",
        titulo: "Ley aplicable y tribunales",
        icono: Scale,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Estos términos se rigen por las leyes de México." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Para cualquier controversia, usted y nosotros nos sometemos a los tribunales de la Ciudad de México." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Como consumidor, usted puede acudir además a la Procuraduría Federal del Consumidor." }] },
        ],
      },
      {
        id: "contacto",
        titulo: "Contacto",
        icono: Mail,
        rol: null,
        bloques: [
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Escríbanos a " }, { t: 'enlace', v: "contact@heladosmados.com", href: "mailto:contact@heladosmados.com" }, { t: 'texto', v: " para cualquier duda, queja o corrección." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "También puede encontrarnos en la tienda: Angel Reyes 7, Lomas de Puerta Grande, Álvaro Obregón, Ciudad de México, C.P. 01630, México." }] },
          { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Para todo lo relativo a sus datos personales, incluidos sus derechos ARCO, consulte el " }, { t: 'enlaceLegal', v: "aviso de privacidad", doc: "privacidad" }, { t: 'texto', v: "." }] },
        ],
      },
    ],
  },
}

export const PRIVACIDAD = LEGAL_DOCS.privacidad
export const TERMINOS = LEGAL_DOCS.terminos

export const LEGAL_BUNDLE_HASH = "6d21dd7ad43c7913d407e77f5a0978709b1ea48759c8edf824ff4beedc96f382"
