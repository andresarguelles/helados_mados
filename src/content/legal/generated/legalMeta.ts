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
    version: "4.0.0",
    actualizado: "2026-10-11",
    astHash: "c904d96697b56c4fec74d7d4a42d62e0e029190cebba6783a3a21269bea1749e",
  },
  terminos: {
    id: "terminos",
    titulo: "Términos y Condiciones",
    version: "3.0.0",
    actualizado: "2026-10-11",
    astHash: "36edde269300ed1cf7ae20e1bc4f7db7dbbe62964f6a342f2bb90f8ba55b77e6",
  },
}
