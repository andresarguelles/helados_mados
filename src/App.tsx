import { BrowserRouter } from 'react-router-dom'
import { AppShell } from './AppRoutes'

// Las rutas viven en AppRoutes.tsx: las comparte este BrowserRouter (navegador) con el
// StaticRouter que usa entry-server.tsx en el build, para que ambos monten exactamente
// el mismo árbol.
export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
