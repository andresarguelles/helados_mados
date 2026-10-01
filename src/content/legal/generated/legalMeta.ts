// GENERADO por scripts/legal-build.mjs desde legal/*.md del repo web.
// NO EDITAR A MANO: el build del otro repo falla si este archivo y el .md difieren.
// Para cambiar el texto: edita legal/<doc>.md, sube `version`, y corre `npm run legal:build`.
//
// Modulo aparte a proposito: quien solo necesita el titulo, la version, la fecha o
// el hash de un documento no debe arrastrar el AST completo de los dos documentos
// (ni sus iconos de lucide-react) al bundle inicial. Mismo patron que
// legalSimplificado.ts.

import type { LegalMeta } from '../model'

export const LEGAL_META: Record<string, LegalMeta> = {
  privacidad: {
    id: "privacidad",
    titulo: "Aviso de Privacidad",
    version: "2.2.3",
    actualizado: "2026-09-30",
    astHash: "98cbed9a0e0e089afa6dab1be2e705ce809e6de405942743e44e3d878c27a734",
  },
  terminos: {
    id: "terminos",
    titulo: "Términos y Condiciones",
    version: "2.3.0",
    actualizado: "2026-09-30",
    astHash: "6d6dcd515bd781ba537a8cd1c351ffff82e82957b9656becf0ab758498472205",
  },
}
