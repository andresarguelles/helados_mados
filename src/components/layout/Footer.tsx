import { Link } from 'react-router-dom'
import { IceCream2, Music2, Heart } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-brand-navy text-white/60 py-8 mt-auto">
      <div className="max-w-lg mx-auto px-4 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-coral rounded-lg flex items-center justify-center">
            <IceCream2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-heading font-black text-white text-base">
            Helados<span className="text-brand-coral">Mados</span>
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <Link to="/terminos" className="hover:text-white transition-colors">
            Términos y Condiciones
          </Link>
          <a
            href="https://tiktok.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand-coral transition-colors flex items-center gap-1"
          >
            <Music2 className="w-3.5 h-3.5" />
            TikTok Live
          </a>
        </div>

        <p className="text-xs text-white/30 flex items-center gap-1">
          Hecho con <Heart className="w-3 h-3 text-brand-coral fill-brand-coral" /> en México · 2026
        </p>
      </div>
    </footer>
  )
}
