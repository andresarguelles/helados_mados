import { Link } from 'react-router-dom'
import { Music2, Heart } from 'lucide-react'
import Paleta from '../ui/Paleta'

export default function Footer() {
  return (
    <footer className="bg-brand-tinta text-white/50 py-10 mt-auto">
      <div className="max-w-lg mx-auto px-4 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          <Paleta className="w-6 h-9" />
          <span className="font-heading text-white text-base">
            Helados<span className="text-brand-fresa">Mados</span>
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm font-body">
          <Link to="/terminos" className="hover:text-white transition-colors">
            Términos y Condiciones
          </Link>
          <a
            href="https://tiktok.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand-fresa transition-colors flex items-center gap-1"
          >
            <Music2 className="w-3.5 h-3.5" />
            TikTok Live
          </a>
        </div>

        <p className="text-xs text-white/25 flex items-center gap-1 font-body">
          Hecho con <Heart className="w-3 h-3 text-brand-fresa fill-brand-fresa" /> en México · 2026
        </p>
      </div>
    </footer>
  )
}
