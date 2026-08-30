import React from 'react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import { Shield, AlertTriangle, Clock, Users, Ban, Copyright, RefreshCw, Scale, Mail } from 'lucide-react'

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

          <Section icon={<Shield className="w-5 h-5" />} title="Acuerdo con nuestros términos legales">
            <p className="mb-2">
              Somos Helados Mados ("Compañía", "nosotros", "nuestro"), una empresa registrada en México con domicilio en Angel Reyes 7, Lomas de Puerta Grande, Álvaro Obregón, Ciudad de México, C.P. 01630.
            </p>
            <p className="mb-2">
              Operamos el sitio web www.heladosmados.com (el "Sitio"), así como cualquier otro producto y servicio relacionado que haga referencia o enlace a estos términos legales (colectivamente, los "Servicios").
            </p>
            <p className="mb-2">
              Proveemos una plataforma diseñada para recompensar a nuestros clientes. A través de dinámicas presenciales o en nuestras redes sociales (como transmisiones en vivo), los usuarios pueden obtener una "palabra secreta". Al crear una cuenta en nuestra plataforma e ingresar dicha palabra, se genera un código QR que puede ser utilizado para canjear premios físicos en nuestra sucursal.
            </p>
            <p>
              Al acceder a los Servicios, usted acepta que ha leído, entendido y aceptado estar sujeto a todos estos Términos y Condiciones. Si no está de acuerdo con todos estos términos, se le prohíbe expresamente el uso de los Servicios y debe suspender su uso inmediatamente.
            </p>
          </Section>

          <Section icon={<Clock className="w-5 h-5" />} title="Reglas de participación y canje de premios">
            <p className="mb-2">El uso de la plataforma y el canje de premios están sujetos a las siguientes reglas:</p>
            <ul className="list-disc list-inside flex flex-col gap-1.5 text-sm">
              <li><span className="font-semibold">Sujeto a disponibilidad:</span> todos los premios físicos (helados, paletas, toppings, etc.) están limitados al inventario disponible en la estación al momento del canje. Helados Mados no garantiza la existencia ilimitada de ningún premio y puede agotar el stock en cualquier momento sin previo aviso.</li>
              <li><span className="font-semibold">Límites de canje:</span> solo se permite un (1) canje por usuario por cada palabra secreta activa.</li>
              <li><span className="font-semibold">Vigencia:</span> las palabras secretas tienen una fecha y hora de inicio y fin preestablecidas. No se realizarán canjes ni se generarán códigos QR fuera de esta vigencia.</li>
              <li><span className="font-semibold">Uso personal:</span> los cupones QR generados son de uso estrictamente personal e intransferible. Queda prohibida su venta o comercialización.</li>
              <li><span className="font-semibold">Modificaciones de campañas:</span> Helados Mados se reserva el derecho de modificar, suspender o cancelar cualquier dinámica, entrenamiento o palabra secreta en cualquier momento y sin previo aviso.</li>
            </ul>
          </Section>

          <Section icon={<Users className="w-5 h-5" />} title="Creación de cuenta, privacidad y datos">
            <p className="mb-2">
              Esta plataforma está diseñada bajo un principio de minimización de datos. No recopilamos correos electrónicos, números telefónicos, nombres reales ni ningún otro dato personal sensible.
            </p>
            <p className="mb-2">
              <span className="font-semibold">Identidad del usuario:</span> la única identidad del usuario en la plataforma es su Nombre de Usuario (Apodo / Gamer Tag) y contraseña, creados de manera voluntaria por el propio usuario.
            </p>
            <p className="mb-2">
              <span className="font-semibold">Uso de la información:</span> Helados Mados no vende, comparte ni cede esta información a terceros.
            </p>
            <p>
              <span className="font-semibold">Prevención de fraude:</span> con el fin de evitar abusos y garantizar la equidad en nuestras promociones, el sistema implementa controles técnicos dinámicos. Esto incluye la recolección temporal de direcciones IP, las cuales son procesadas a través de algoritmos criptográficos (hash) de forma inmediata. No almacenamos su dirección IP original, pero utilizamos este identificador encriptado para limitar el número de cuentas o canjes que pueden realizarse desde una misma red, ajustando estos límites según sea necesario para prevenir fraudes.
            </p>
          </Section>

          <Section icon={<AlertTriangle className="w-5 h-5" />} title="Derecho de admisión y política antifraude">
            <p className="mb-2">
              Helados Mados y su personal autorizado se reservan el derecho de denegar, anular o invalidar cualquier cupón, código QR o cuenta de usuario si se identifican:
            </p>
            <ul className="list-disc list-inside flex flex-col gap-1.5 text-sm mb-2">
              <li>Inconsistencias en el uso de la cuenta.</li>
              <li>Conductas maliciosas o uso de bots, scripts o sistemas automatizados.</li>
              <li>Intentos de fraude, manipulación del sistema o suplantación de identidad.</li>
              <li>Cualquier actividad que contravenga el espíritu de la promoción.</li>
            </ul>
            <p>
              Esta acción de invalidación o bloqueo se realizará a la entera discreción de la Compañía y no generará responsabilidad, compensación ni reembolso alguno para el negocio.
            </p>
          </Section>

          <Section icon={<Ban className="w-5 h-5" />} title="Actividades prohibidas">
            <p className="mb-2">Como usuario de los Servicios, usted acepta no:</p>
            <ul className="list-disc list-inside flex flex-col gap-1.5 text-sm">
              <li>Hacer un uso no autorizado de los Servicios, incluyendo la creación de cuentas de usuario por medios automatizados o bajo falsos pretextos.</li>
              <li>Eludir, deshabilitar o interferir de otra manera con las funciones relacionadas con la seguridad de los Servicios.</li>
              <li>Vender o transferir su perfil, o utilizar el código QR de otro usuario.</li>
              <li>Utilizar los Servicios como parte de cualquier esfuerzo para competir con nosotros o para cualquier empresa comercial.</li>
              <li>Descifrar, descompilar, desensamblar o aplicar ingeniería inversa a cualquier software que comprenda o forme parte de los Servicios.</li>
            </ul>
          </Section>

          <Section icon={<Copyright className="w-5 h-5" />} title="Propiedad intelectual">
            Somos los propietarios o licenciatarios de todos los derechos de propiedad intelectual en nuestros Servicios, incluyendo el código fuente, bases de datos, software, diseños, texto y gráficos, así como las marcas comerciales y logotipos contenidos en ellos. Estos elementos se proporcionan "tal cual" para su uso personal y no comercial.
          </Section>

          <Section icon={<RefreshCw className="w-5 h-5" />} title="Modificaciones e interrupciones">
            Nos reservamos el derecho de cambiar, modificar o eliminar el contenido de los Servicios en cualquier momento y por cualquier motivo a nuestra entera discreción y sin previo aviso. No seremos responsables ante usted ni ante ningún tercero por ninguna modificación, suspensión o interrupción de los Servicios.
          </Section>

          <Section icon={<Scale className="w-5 h-5" />} title="Limitación de responsabilidad y descargo">
            <p className="mb-2">
              Los Servicios se proporcionan "tal cual" y "según disponibilidad". Usted acepta que el uso de los Servicios será bajo su propio riesgo. En la medida máxima permitida por la ley, renunciamos a todas las garantías relacionadas con los Servicios.
            </p>
            <p>
              En ningún caso nosotros, nuestros directores, empleados o agentes seremos responsables ante usted o cualquier tercero por daños directos, indirectos, consecuentes, ejemplares, incidentales, especiales o punitivos que surjan de su uso de los Servicios, incluso si hemos sido advertidos de la posibilidad de tales daños.
            </p>
          </Section>

          <Section icon={<Scale className="w-5 h-5" />} title="Ley aplicable y resolución de disputas">
            Estos Términos y Condiciones se regirán e interpretarán de acuerdo con las leyes de México. Helados Mados y usted aceptan irrevocablemente que los tribunales de la Ciudad de México tendrán jurisdicción exclusiva para resolver cualquier disputa que pueda surgir en relación con estos Términos Legales.
          </Section>

          <Section icon={<Mail className="w-5 h-5" />} title="Contáctenos">
            <p className="mb-2">
              Para resolver una queja relacionada con los Servicios o para recibir más información sobre el uso de los mismos, comuníquese con nosotros a:
            </p>
            <p className="font-semibold text-brand-sombra mb-1">Helados Mados</p>
            <p>Angel Reyes 7, Lomas de Puerta Grande</p>
            <p className="mb-2">Álvaro Obregón, Ciudad de México, C.P. 01630, México</p>
            <p>Correo electrónico: contact@heladosmados.com</p>
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
