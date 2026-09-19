import { Link } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { useBottomNavVisible } from './BottomNav'
import { SOCIAL_LINKS } from './socials'

export default function Footer() {
  // Cuando la navbar inferior está en pantalla, el hueco entre el footer y ella
  // pasa a ser padding del propio footer (azul) en vez de fondo de página (papel):
  // así no queda una franja blanca asomando debajo del footer.
  const navVisible = useBottomNavVisible()

  return (
    <footer className={cn(
      'bg-brand-azul text-white/85 pt-10 mt-auto',
      navVisible ? 'pb-[calc(5rem+env(safe-area-inset-bottom))]' : 'pb-10'
    )}>
      <div className="max-w-lg mx-auto px-4 flex flex-col items-center gap-4">
        <img
          src="/oficial_letter_logo.svg"
          alt="Helados Mados"
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

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm font-body">
          <Link to="/terminos" className="hover:text-white transition-colors">
            Términos y Condiciones
          </Link>
          <span aria-hidden className="text-white/40">·</span>
          <Link to="/privacidad" className="hover:text-white transition-colors">
            Aviso de Privacidad
          </Link>
        </div>

        <div className="flex flex-col items-center gap-0.5 text-xs text-white/70 font-body">
          <p>Helados Mados · Todos los derechos reservados · 2026</p>
          <p>Developed by Piniada</p>
        </div>
      </div>
    </footer>
  )
}
