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
    version: "4.1.0",
    actualizado: "2026-10-12",
    astHash: "d972e4595bb26b6f55d795f14a90c6c245a5622c765a0061dc519be6a4dc89c5",
  },
  terminos: {
    id: "terminos",
    titulo: "Términos y Condiciones",
    version: "3.1.0",
    actualizado: "2026-10-13",
    astHash: "7a78b9e785f96d037a759b81e72ea4a6f7bad35afd800c5cfb6f7b0ad7760893",
  },
}
