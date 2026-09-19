/**
 * Un documento legal completo: cabecera, linea de version, indice y secciones.
 *
 * El ancho es `max-w-lg` y no se toca: Android usa `widthIn(max = 512.dp)`, que es
 * exactamente lo mismo. Que la medida de linea coincida es lo que permite comparar
 * las dos plataformas a ojo, y esa comparacion es la verificacion de todo esto.
 */
import { ArrowUp } from 'lucide-react'
import { pieDeVersion } from '../../content/legal/model'
import type { LegalDoc, LegalSeccion } from '../../content/legal/model'
import LegalBlocks from './LegalBlocks'

export default function LegalDocument({ doc }: { doc: LegalDoc }) {
  const IconoDoc = doc.icono

  return (
    // `pt-20` deja pasar la navbar fija; por eso cada ancla necesita `scroll-mt-20`.
    <div className="flex-1 w-full max-w-lg mx-auto px-4 pt-20 pb-8">
      <header className="mb-6 pt-4">
        <div className="flex items-center gap-3">
          <IconoDoc className="w-8 h-8 shrink-0 text-brand-azul" />
          <h1 className="font-heading text-brand-sombra text-2xl">{doc.titulo}</h1>
        </div>
        {/* La linea que se compara a ojo contra la de Android. Va a todo el ancho
            y no sangrada bajo el icono: a 375px, sangrada, el hash cae solo a la
            segunda linea y parece un error. */}
        <p className="font-mono text-xs text-brand-gris mt-2">{pieDeVersion(doc)}</p>
      </header>

      <nav id="indice" aria-labelledby="indice-titulo" className="paper-card rounded-3xl p-5 scroll-mt-20 mb-5">
        <h2 id="indice-titulo" className="font-heading text-brand-sombra text-base mb-3">
          Contenido
        </h2>
        <ol className="flex flex-col gap-2">
          {doc.secciones.map((seccion, i) => (
            <li key={seccion.id} className="flex gap-2.5">
              <span className="font-mono text-xs text-brand-gris pt-0.5 shrink-0 tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <a href={`#${seccion.id}`} className="font-body text-sm text-brand-azul hover:underline">
                {seccion.titulo}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex flex-col gap-5">
        {doc.secciones.map(seccion => (
          <Seccion key={seccion.id} seccion={seccion} />
        ))}
      </div>
    </div>
  )
}

function Seccion({ seccion }: { seccion: LegalSeccion }) {
  const IconoSeccion = seccion.icono

  return (
    // El `id` es una URL citable: lo fija el `.md` y es estable entre versiones.
    <section id={seccion.id} className="paper-card rounded-3xl p-5 scroll-mt-20">
      <div className="flex items-center gap-2 mb-3">
        <IconoSeccion className="w-5 h-5 shrink-0 text-brand-azul" />
        <h2 className="font-heading text-brand-sombra text-base">{seccion.titulo}</h2>
      </div>

      <LegalBlocks bloques={seccion.bloques} />

      <a
        href="#indice"
        className="mt-4 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide
                   text-brand-gris hover:text-brand-azul transition-colors"
      >
        <ArrowUp className="w-3 h-3" />
        Volver al índice
      </a>
    </section>
  )
}
