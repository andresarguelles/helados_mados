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
    version: "2.2.1",
    actualizado: "2026-09-26",
    astHash: "67bb968e551db7a7b2205f80c0aef2e87fbc2dcbf23524832d7d7561ca1e226e",
  },
  terminos: {
    id: "terminos",
    titulo: "Términos y Condiciones",
    version: "2.2.0",
    actualizado: "2026-09-19",
    astHash: "9aa39da1218e502be4a6d5f5a50996fcb54fe20db14027aae279cfe76f4aa99a",
  },
}
