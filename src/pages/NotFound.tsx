import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-brand-azul bg-dots-azul flex flex-col items-center justify-center px-4 text-center gap-6">
      <img src="/mados-logo-full.svg" alt="Helados Mados" className="h-9 w-auto" />

      <img
        src="/astronauta_mados_nuevo.svg"
        alt=""
        className="w-32 h-auto animate-bounce"
      />

      <div className="flex flex-col gap-2">
        <h1 className="text-white text-5xl">404</h1>
        <p className="text-white/85 font-body text-sm max-w-xs">
          Esta página se perdió en órbita. No encontramos lo que buscás.
        </p>
      </div>

      <Link to="/" className="btn-fresa shadow-sticker-white hover:shadow-sticker-lg">
        <Home className="w-4 h-4" />
        Volver al inicio
      </Link>
    </div>
  )
}
