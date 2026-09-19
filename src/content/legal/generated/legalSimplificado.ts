// GENERADO por scripts/legal-build.mjs desde legal/*.md del repo web.
// NO EDITAR A MANO: el build del otro repo falla si este archivo y el .md difieren.
// Para cambiar el texto: edita legal/<doc>.md, sube `version`, y corre `npm run legal:build`.
//
// Modulo aparte a proposito: /bienvenida muestra el aviso simplificado y no debe
// arrastrar los dos documentos completos al bundle inicial.

import { Shield } from 'lucide-react'

import type { LegalSeccion } from '../model'

export const AVISO_SIMPLIFICADO: LegalSeccion =
  {
    id: "aviso-corto",
    titulo: "En corto",
    icono: Shield,
    rol: "simplificado",
    bloques: [
      { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Marcos Roldán Moreno, que opera bajo el nombre Helados Mados, con domicilio en Avenida Centenario No. 1229, Colonia Reacomodo Valentín Gómez Farías, Álvaro Obregón, Ciudad de México, C.P. 01569, es responsable de sus datos personales." }] },
      { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Tratamos su apodo, su correo, su número de WhatsApp y, si usted los da, su nombre, su apellido y su fecha de nacimiento. Ninguno es un dato sensible." }] },
      { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Los usamos para crear su cuenta, entregarle sus cupones, llevar su marcador y evitar que una misma persona abra varias cuentas. Eso es el servicio y no depende de un permiso aparte." }] },
      { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Con su permiso, además, le escribimos por WhatsApp y le felicitamos en su cumpleaños. Puede retirar ese permiso desde su perfil cuando quiera, sin perder la cuenta." }] },
      { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Su apodo y sus puntos son públicos en el marcador; su nombre, su correo, su teléfono y su fecha de nacimiento no. Puede pedirnos que limitemos otros usos escribiendo a " }, { t: 'enlace', v: "contact@heladosmados.com", href: "mailto:contact@heladosmados.com" }, { t: 'texto', v: "." }] },
      { tipo: 'parrafo', alcance: 'ambas', spans: [{ t: 'texto', v: "Lea el " }, { t: 'enlaceLegal', v: "aviso de privacidad integral", doc: "privacidad" }, { t: 'texto', v: ", con sus derechos ARCO y todo el detalle, en esta misma aplicación y en www.heladosmados.com." }] },
    ],
  }

export const AVISO_SIMPLIFICADO_DOC = "privacidad"
