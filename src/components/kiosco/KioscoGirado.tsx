import { usePantallaEncendida } from './KioscoShell'

/**
 * Una pantalla de mostrador dibujada de lado, para una TV horizontal montada en vertical cuyo
 * sistema no deja girar la imagen (el Fire TV Stick). `grados` es el giro horario del
 * contenido: con 90 la parte de arriba de la vista queda del lado derecho de la TV sin girar,
 * con 270 del izquierdo. Cuál toca depende de hacia dónde se montó la TV.
 *
 * Un iframe y no un `rotate` sobre la vista: las pantallas miden todo en `vh`, y `vh` siempre
 * es el alto real de la TV (1080), no el alto girado (1920); girada tal cual, saldría al 56 %.
 * Dentro del iframe el viewport es el del iframe —100vh de ancho por 100vw de alto—, así que
 * la vista de siempre se dibuja como en un monitor vertical, sin tocarla. Es del mismo origen:
 * comparte la sesión y escucha el Realtime de `estacion` igual que la vista sin girar.
 */
export default function KioscoGirado({ ruta, grados }: { ruta: string; grados: 90 | 270 }) {
  usePantallaEncendida()

  return (
    // Del azul de las pantallas: mientras carga el iframe no destella blanco.
    <div className="fixed inset-0 overflow-hidden bg-brand-azul">
      {/* El centro del iframe al centro de la TV, y ahí gira sobre sí mismo: girado, ocupa
          justo 100vw × 100vh. */}
      <iframe
        src={ruta}
        title="Pantalla de mostrador"
        className="absolute top-1/2 left-1/2 w-[100vh] h-[100vw] border-0"
        style={{ transform: `translate(-50%, -50%) rotate(${grados}deg)` }}
      />
    </div>
  )
}
