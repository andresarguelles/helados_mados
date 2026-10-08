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
    version: "3.0.0",
    actualizado: "2026-10-07",
    astHash: "523d3bffc30ef495d8644cc0d5a26699f74fb4e8e0e38b65f551593b1f66cbcd",
  },
  terminos: {
    id: "terminos",
    titulo: "Términos y Condiciones",
    version: "2.4.0",
    actualizado: "2026-10-07",
    astHash: "a5ae366b55614362e3bdfef7bd363d5ec03d934858bac4c396474aff02d13581",
  },
}
