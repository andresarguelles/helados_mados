/**
 * Pinta los bloques y los spans del AST legal. Vive aparte de `LegalDocument`
 * porque el aviso simplificado (`AVISO_SIMPLIFICADO`) reutiliza solo esto: una
 * `LegalSeccion` suelta dentro del alta, sin cabecera, sin indice y sin anclas.
 *
 * Los dos `switch` terminan en un `never`. Si el modelo crece y este renderer no
 * se entera, `tsc` rompe el build: es preferible a dejar de pintar en silencio un
 * parrafo que el usuario esta aceptando. El hash prueba que los datos son iguales
 * en web y en Android; esto prueba que los dos lados los pintan enteros.
 */
import { Link } from 'react-router-dom'
import { ETIQUETA_ALCANCE } from '../../content/legal/model'
import type { LegalBloque, LegalSpan } from '../../content/legal/model'

/**
 * Solo existen dos documentos y el generador valida que el `doc` de un
 * `enlaceLegal` sea uno de ellos, asi que aqui no hay caso de error que tratar.
 */
function rutaLegal(doc: string): string {
  return doc === 'privacidad' ? '/privacidad' : '/terminos'
}

const CLASE_ENLACE = 'text-brand-azul font-bold underline'

function Span({ span }: { span: LegalSpan }) {
  switch (span.t) {
    case 'texto':
      return <>{span.v}</>

    case 'fuerte':
      return <strong className="font-semibold">{span.v}</strong>

    case 'enlace': {
      // `mailto:` y `tel:` no abren pestaña: forzarla deja una en blanco detrás.
      const nuevaPestana = span.href.startsWith('https://')
      return (
        <a
          href={span.href}
          className={CLASE_ENLACE}
          {...(nuevaPestana ? { target: '_blank', rel: 'noreferrer' } : {})}
        >
          {span.v}
        </a>
      )
    }

    case 'enlaceLegal':
      return (
        <Link to={rutaLegal(span.doc)} className={CLASE_ENLACE}>
          {span.v}
        </Link>
      )

    default: {
      const _exhaustivo: never = span
      return _exhaustivo
    }
  }
}

function Spans({ spans }: { spans: LegalSpan[] }) {
  return (
    <>
      {spans.map((span, i) => (
        <Span key={i} span={span} />
      ))}
    </>
  )
}

function contenidoDelBloque(bloque: LegalBloque) {
  switch (bloque.tipo) {
    case 'parrafo':
      return (
        <p>
          <Spans spans={bloque.spans} />
        </p>
      )

    case 'lista':
      // `list-outside` y no `list-inside`: varios items del aviso ocupan tres o
      // cuatro lineas, y con `inside` la continuacion vuelve al margen de la
      // vineta y el bloque deja de leerse como lista.
      return (
        <ul className="list-disc list-outside pl-5 flex flex-col gap-1.5">
          {bloque.items.map((item, i) => (
            <li key={i}>
              <Spans spans={item} />
            </li>
          ))}
        </ul>
      )

    default: {
      const _exhaustivo: never = bloque
      return _exhaustivo
    }
  }
}

function Bloque({ bloque, conPastilla }: { bloque: LegalBloque; conPastilla: boolean }) {
  // El alcance NUNCA oculta: el bloque se pinta igual, con una pastilla que avisa
  // de que ese parrafo describe la otra plataforma. Ver `legal/README.md`.
  if (bloque.alcance === 'ambas' || !conPastilla) return contenidoDelBloque(bloque)

  return (
    <div className="flex flex-col gap-1.5">
      <span className="legal-scope">{ETIQUETA_ALCANCE[bloque.alcance]}</span>
      {contenidoDelBloque(bloque)}
    </div>
  )
}

/**
 * La pastilla se pinta cuando el alcance CAMBIA respecto al bloque anterior, no en
 * cada bloque. Una valla `:::alcance` del Markdown puede contener varios parrafos y
 * el AST aplana el alcance sobre todos: sin esta regla, la seccion de cookies salia
 * con tres "SOLO EN EL SITIO WEB" seguidas.
 *
 * Es una regla de PRESENTACION derivada del AST, no un cambio del modelo, y por eso
 * Android puede reproducirla exactamente. Ojo: si se toca aqui, se toca alli.
 */
const llevaPastilla = (bloques: LegalBloque[], i: number) =>
  bloques[i].alcance !== 'ambas' && (i === 0 || bloques[i - 1].alcance !== bloques[i].alcance)

export default function LegalBlocks({ bloques }: { bloques: LegalBloque[] }) {
  return (
    <div className="font-body text-brand-gris text-sm leading-relaxed flex flex-col gap-3">
      {bloques.map((bloque, i) => (
        <Bloque key={i} bloque={bloque} conPastilla={llevaPastilla(bloques, i)} />
      ))}
    </div>
  )
}
