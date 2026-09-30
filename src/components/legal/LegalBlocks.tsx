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

function Span({ span, pestanaNueva }: { span: LegalSpan; pestanaNueva: boolean }) {
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
        <Link
          to={rutaLegal(span.doc)}
          className={CLASE_ENLACE}
          {...(pestanaNueva ? { target: '_blank' } : {})}
        >
          {span.v}
        </Link>
      )

    default: {
      const _exhaustivo: never = span
      return _exhaustivo
    }
  }
}

function Spans({ spans, pestanaNueva }: { spans: LegalSpan[]; pestanaNueva: boolean }) {
  return (
    <>
      {spans.map((span, i) => (
        <Span key={i} span={span} pestanaNueva={pestanaNueva} />
      ))}
    </>
  )
}

function contenidoDelBloque(bloque: LegalBloque, pestanaNueva: boolean) {
  switch (bloque.tipo) {
    case 'parrafo':
      return (
        <p>
          <Spans spans={bloque.spans} pestanaNueva={pestanaNueva} />
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
              <Spans spans={item} pestanaNueva={pestanaNueva} />
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

function Bloque({
  bloque,
  conPastilla,
  pestanaNueva,
}: {
  bloque: LegalBloque
  conPastilla: boolean
  pestanaNueva: boolean
}) {
  // El alcance NUNCA oculta: el bloque se pinta igual, con una pastilla que avisa
  // de que ese parrafo describe la otra plataforma. Ver `legal/README.md`.
  if (bloque.alcance === 'ambas' || !conPastilla) return contenidoDelBloque(bloque, pestanaNueva)

  return (
    <div className="flex flex-col gap-1.5">
      <span className="legal-scope">{ETIQUETA_ALCANCE[bloque.alcance]}</span>
      {contenidoDelBloque(bloque, pestanaNueva)}
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

// text-brand-gris a secas se queda por debajo de AA sobre los fondos papel
// (~4.48:1); /70 lo sube por encima de 4.5:1 en todos los usos.
//
// `enlacesLegalesEnPestanaNueva` es para cuando se pinta dentro de un formulario a
// medio llenar (el alta): ahi, seguir el enlace al aviso integral en la misma pestana
// desmonta la pagina y se pierde lo ya escrito.
export default function LegalBlocks({
  bloques,
  enlacesLegalesEnPestanaNueva = false,
}: {
  bloques: LegalBloque[]
  enlacesLegalesEnPestanaNueva?: boolean
}) {
  return (
    <div className="font-body text-brand-sombra/70 text-sm leading-relaxed flex flex-col gap-3">
      {bloques.map((bloque, i) => (
        <Bloque
          key={i}
          bloque={bloque}
          conPastilla={llevaPastilla(bloques, i)}
          pestanaNueva={enlacesLegalesEnPestanaNueva}
        />
      ))}
    </div>
  )
}
