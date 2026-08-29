import React from 'react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import { Shield, AlertTriangle, Clock, Users } from 'lucide-react'

export default function Terminos() {
  return (
    <div className="min-h-screen flex flex-col bg-brand-papel">
      <Navbar />

      <div className="flex-1 max-w-lg mx-auto px-4 pt-20 pb-8">
        <div className="flex items-center gap-3 mb-6 pt-4">
          <Shield className="w-8 h-8 text-brand-azul" />
          <h1 className="font-heading text-brand-sombra text-2xl">Términos y Condiciones</h1>
        </div>

        <div className="flex flex-col gap-5">

          <Section icon={<Clock className="w-5 h-5" />} title="Sujeto a disponibilidad">
            Todos los premios físicos (helados, paletas, toppings) están limitados al inventario disponible en la estación al momento del canje. Helados Mados no garantiza existencia ilimitada de ningún premio y puede agotar el stock en cualquier momento sin previo aviso.
          </Section>

          <Section icon={<Shield className="w-5 h-5" />} title="Derecho de admisión">
            Helados Mados y su personal autorizado se reservan el derecho de denegar, anular o invalidar cualquier cupón o cuenta de usuario si se identifican inconsistencias, conductas maliciosas, intentos de fraude, o cualquier actividad que contravenga el espíritu de la promoción. Esta acción no generará responsabilidad alguna para el negocio.
          </Section>

          <Section icon={<Users className="w-5 h-5" />} title="Privacidad y datos">
            Esta plataforma no recopila correos electrónicos, números telefónicos, nombres reales ni ningún dato personal sensible. La única identidad del usuario es su Apodo/Gamer Tag de carácter voluntario, creado por el propio usuario. Helados Mados no vende, comparte ni cede esta información a terceros.
          </Section>

          <Section icon={<AlertTriangle className="w-5 h-5" />} title="Reglas de participación">
            <ul className="list-disc list-inside flex flex-col gap-1.5 text-sm">
              <li>Solo 1 canje por usuario por cada palabra secreta activa.</li>
              <li>Máximo 3 canjes distintos por dirección IP por cada entrenamiento activo.</li>
              <li>Las palabras secretas tienen fecha y hora de inicio y fin. No se realizarán canjes fuera de vigencia.</li>
              <li>Los cupones QR son de uso personal e intransferible.</li>
              <li>Helados Mados puede modificar, suspender o cancelar cualquier entrenamiento en cualquier momento.</li>
            </ul>
          </Section>

          <p className="text-xs text-brand-gris text-center font-body">
            Última actualización: agosto 2026. Uso de la plataforma implica aceptación de estos términos.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="paper-card rounded-3xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-brand-azul">{icon}</span>
        <h2 className="font-heading text-brand-sombra text-base">{title}</h2>
      </div>
      <div className="font-body text-brand-gris text-sm leading-relaxed">{children}</div>
    </div>
  )
}
