import { Link } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { useBottomNavVisible } from './BottomNav'
import { SOCIAL_LINKS } from './socials'
import { abrirPreferenciasCookies } from '../legal/CookieBanner'
import { medicionConfigurada } from '../../lib/analytics'
import { NEGOCIO } from '../../content/negocio'

export default function Footer() {
  // Cuando la navbar inferior está en pantalla, el hueco entre el footer y ella
  // pasa a ser padding del propio footer (azul) en vez de fondo de página (papel):
  // así no queda una franja blanca asomando debajo del footer.
  const navVisible = useBottomNavVisible()

  return (
    <footer className={cn(
      // /85 quedaba justo por debajo de AA (contraste ~4.48:1 sobre el azul de marca);
      // /90 lo deja por encima de 4.5:1 sin que se note el cambio a simple vista.
      'bg-brand-azul text-white/90 pt-10 mt-auto',
      navVisible ? 'pb-[calc(5rem+env(safe-area-inset-bottom))]' : 'pb-10'
    )}>
      <div className="max-w-lg mx-auto px-4 flex flex-col items-center gap-4">
        <img
          src="/oficial_letter_logo.svg"
          alt="Helados Mados"
          width={63}
          height={28}
          className="h-7 w-auto"
          style={{ filter: 'brightness(0) invert(1)' }}
        />

        <div className="flex items-center gap-4">
          {SOCIAL_LINKS.map(({ href, label, Icon }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="hover:text-brand-rosa transition-colors"
            >
              <Icon className="w-5 h-5" />
            </a>
          ))}
        </div>

        {/* NAP completo: el mismo nombre, dirección y teléfono que la ficha de Google Maps. */}
        <address className="not-italic flex flex-col items-center gap-0.5 text-sm font-body text-center">
          <span>{NEGOCIO.direccion.calle}, {NEGOCIO.direccion.colonia}</span>
          <span>{NEGOCIO.direccion.alcaldia}, {NEGOCIO.direccion.ciudadCorta}, C.P. {NEGOCIO.direccion.codigoPostal}</span>
          <span className="flex flex-wrap items-center justify-center gap-x-2">
            <a href={`tel:${NEGOCIO.telefonoE164}`} className="hover:text-white transition-colors">
              {NEGOCIO.telefono}
            </a>
            <span aria-hidden className="text-white/40">·</span>
            <a href={`mailto:${NEGOCIO.email}`} className="hover:text-white transition-colors">
              {NEGOCIO.email}
            </a>
          </span>
        </address>

        <nav aria-label="Enlaces del pie" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm font-body">
          <Link to="/" className="hover:text-white transition-colors">
            Inicio
          </Link>
          <span aria-hidden className="text-white/40">·</span>
          <Link to="/canjear" className="hover:text-white transition-colors">
            Canjear palabra secreta
          </Link>
          <span aria-hidden className="text-white/40">·</span>
          <Link to="/terminos" className="hover:text-white transition-colors">
            Términos y Condiciones
          </Link>
          <span aria-hidden className="text-white/40">·</span>
          <Link to="/privacidad" className="hover:text-white transition-colors">
            Aviso de Privacidad
          </Link>
          <span aria-hidden className="text-white/40">·</span>
          <Link to="/eliminar-cuenta" className="hover:text-white transition-colors">
            Eliminar mi cuenta
          </Link>
          {/* Revocar tiene que costar lo mismo que aceptar, y el pie es donde se busca.
              Es un botón y no un enlace porque no lleva a ninguna parte: reabre la barra. */}
          {medicionConfigurada() && (
            <>
              <span aria-hidden className="text-white/40">·</span>
              <button
                type="button"
                onClick={abrirPreferenciasCookies}
                className="hover:text-white transition-colors underline-offset-2 hover:underline"
              >
                Cookies
              </button>
            </>
          )}
        </nav>

        <div className="flex flex-col items-center gap-0.5 text-xs text-white/90 font-body">
          <p>{NEGOCIO.nombre} · Todos los derechos reservados · 2026</p>
          <p>Developed by Piniada</p>
        </div>
      </div>
    </footer>
  )
}
