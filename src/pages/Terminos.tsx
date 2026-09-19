import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import LegalDocument from '../components/legal/LegalDocument'
import { TERMINOS } from '../content/legal/generated/legalContent'

/**
 * El texto ya no vive aquí: sale de `legal/terminos.md` por generación, y el mismo
 * AST lo pinta la app Android. Para cambiar una palabra se edita el `.md`.
 */
export default function Terminos() {
  return (
    <div className="min-h-screen flex flex-col bg-brand-papel">
      <Navbar />
      <LegalDocument doc={TERMINOS} />
      <Footer />
    </div>
  )
}
