import { Link } from 'react-router-dom'
import { Music2, Heart } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-brand-azul text-white/85 py-10 mt-auto">
      <div className="max-w-lg mx-auto px-4 flex flex-col items-center gap-4">
        <img
          src="/oficial_letter_logo.svg"
          alt="Helados Mados"
          className="h-7 w-auto"
          style={{ filter: 'brightness(0) invert(1)' }}
        />

        <div className="flex items-center gap-6 text-sm font-body">
          <Link to="/terminos" className="hover:text-white transition-colors">
            Términos y Condiciones
          </Link>
          <a
            href="https://www.tiktok.com/@heladosmados"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand-rosa transition-colors flex items-center gap-1"
          >
            <Music2 className="w-3.5 h-3.5" />
            TikTok Live
          </a>
        </div>

        <p className="text-xs text-white/70 flex items-center gap-1 font-body">
          Hecho con <Heart className="w-3 h-3 text-brand-rosa fill-brand-rosa" /> en México · 2026
        </p>
      </div>
    </footer>
  )
}
