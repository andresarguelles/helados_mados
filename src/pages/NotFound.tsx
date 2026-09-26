import { Link } from 'react-router-dom'
import { Home, Zap } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-brand-azul bg-dots-azul flex flex-col items-center justify-center px-4 text-center gap-6">
      <main className="flex flex-col items-center gap-6">
        <img src="/mados-logo-full.svg" alt="Helados Mados" width={81} height={36} className="h-9 w-auto" />

        <img
          src="/astronauta_mados_nuevo.svg"
          alt=""
          width={128}
          height={159}
          className="w-32 h-auto animate-float"
        />

        <div className="flex flex-col gap-2">
          <h1 className="text-white text-5xl">404</h1>
          <p className="text-white/85 font-body text-sm max-w-xs">
            Esta página se perdió en órbita. No encontramos lo que buscas.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2.5">
          <Link to="/" className="btn-fresa shadow-sticker-white hover:shadow-sticker-lg">
            <Home className="w-4 h-4" />
            Volver al inicio
          </Link>
          <Link to="/canjear" className="btn-tinta">
            <Zap className="w-4 h-4" />
            Canjear palabra secreta
          </Link>
        </div>
      </main>
    </div>
  )
}
