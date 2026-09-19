import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import LegalDocument from '../components/legal/LegalDocument'
import { PRIVACIDAD } from '../content/legal/generated/legalContent'

/**
 * Pública y sin guard a propósito: el aviso de privacidad tiene que poder leerse
 * antes de crear la cuenta. El texto sale de `legal/privacidad.md`.
 */
export default function Privacidad() {
  return (
    <div className="min-h-screen flex flex-col bg-brand-papel">
      <Navbar />
      <LegalDocument doc={PRIVACIDAD} />
      <Footer />
    </div>
  )
}
