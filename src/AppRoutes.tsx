import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import Home from './pages/Home'
import Login from './pages/Login'
import Redeem from './pages/Redeem'
import AuthCallback from './pages/AuthCallback'
import EliminarCuenta from './pages/EliminarCuenta'
import NotFound from './pages/NotFound'
import BottomNav from './components/layout/BottomNav'
import CookieBanner from './components/legal/CookieBanner'
import LegalGate from './components/legal/LegalGate'
import { useStore } from './lib/store'
import { trackPageview } from './lib/analytics'
import { applyHead } from './seo/head'
import { seoForPath } from './seo/routes'
import { lazyWithPreload } from './lib/lazyWithPreload'

// Perfil/Cupones/Ranking/Misiones/Bienvenida solo se sirven por spa.html (rewrite de
// Vercel, ver vercel.json): nunca se prerenderizan ni se hidratan, así que ser su propio
// chunk no cuesta un salto de red adicional en ninguna ruta pública.
const Perfil = lazy(() => import('./pages/Perfil'))
const Cupones = lazy(() => import('./pages/Cupones'))
const Ranking = lazy(() => import('./pages/Ranking'))
const Misiones = lazy(() => import('./pages/Misiones'))
const Bienvenida = lazy(() => import('./pages/Bienvenida'))

// Terminos/Privacidad SÍ se prerenderizan (son indexables), pero arrastran
// LegalDocument + legalContent.ts —el AST completo de los dos documentos, ~52 KB
// minificados— que no tiene nada que hacer en el bundle de entrada de la home. Con
// `lazyWithPreload` en vez de un import directo, ese peso pasa a su propio chunk; y con
// `.preload()` esperado antes de `hydrateRoot` (ver main.tsx) la hidratación de esa ruta
// sigue sin pasar por Suspense, exactamente como si el import siguiera siendo directo.
const Terminos = lazyWithPreload(() => import('./pages/Terminos'))
const Privacidad = lazyWithPreload(() => import('./pages/Privacidad'))

const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminScanner = lazy(() => import('./pages/admin/AdminScanner'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
// Pantallas de mostrador (monitores verticales en modo quiosco), ver lib/kiosco.ts.
const AdminLeaderboard = lazy(() => import('./pages/admin/AdminLeaderboard'))
const AdminFlavors = lazy(() => import('./pages/admin/AdminFlavors'))
// Las mismas dos, giradas para una TV que no deja girar la imagen (Fire TV).
const KioscoGirado = lazy(() => import('./components/kiosco/KioscoGirado'))
// El panel de control de esas dos pantallas.
const AdminEstacion = lazy(() => import('./pages/admin/AdminEstacion'))

/**
 * Qué precargar antes de hidratar cada ruta prerenderizada que cuelga de
 * `lazyWithPreload` (ver main.tsx). Un mapa y no strings sueltos: si mañana otra ruta
 * prerenderizada gana su propio chunk pesado, se registra aquí una vez y main.tsx no
 * necesita saber cuáles son.
 */
export const preloadByPath: Readonly<Record<string, () => Promise<unknown>>> = {
  '/terminos': Terminos.preload,
  '/privacidad': Privacidad.preload,
}

function AdminFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-azul">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>
  )
}

// Mismo fallback que el de admin pero sobre papel. Lo usan dos clases de ruta distintas:
// las de miembro (Perfil/Cupones/Ranking/Misiones/Bienvenida), que nunca se prerenderizan
// y solo llegan por /spa con createRoot; y Terminos/Privacidad, que sí se prerenderizan
// pero pueden llegar a mostrarlo si alguien navega ahí en el cliente ANTES de que su
// `preload()` termine (un <Link> normal, sin pasar por /auth/callback) — el HTML servido
// por el prerender nunca lo enseña, solo una navegación en caliente sin la precarga lista.
function PaperFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-papel">
      <Loader2 className="w-8 h-8 animate-spin text-brand-azul" />
    </div>
  )
}

function RouteTracker() {
  const location = useLocation()

  useEffect(() => {
    // El head tiene que quedar puesto ANTES de mandar el pageview: page_view lee
    // document.title (ver trackPageview en lib/analytics.ts), y si el orden se invirtiera
    // GA recibiría el título de la ruta anterior.
    applyHead(seoForPath(location.pathname))
    trackPageview(location.pathname + location.search)
  }, [location.pathname, location.search])

  return null
}

function ProtectedAdmin({ children }: { children: React.ReactNode }) {
  const isAdmin = useStore(s => s.isAdmin)
  const authReady = useStore(s => s.authReady)
  if (!authReady) return null
  if (!isAdmin) return <Navigate to="/admin" replace />
  return <>{children}</>
}

function ProtectedMember({ children }: { children: React.ReactNode }) {
  const profile = useStore(s => s.profile)
  const authReady = useStore(s => s.authReady)
  if (!authReady) return null
  if (!profile) return <Navigate to="/login" replace />
  // Un registro con Google a medias no tiene apodo, y el apodo es la identidad pública del ranking.
  if (!profile.username) return <Navigate to="/bienvenida" replace />
  // Va DENTRO y no envolviendo las rutas: /terminos y /privacidad tienen que seguir siendo
  // alcanzables mientras la compuerta está puesta, o estaríamos pidiendo aceptar a ciegas.
  return <LegalGate>{children}</LegalGate>
}

// Un solo árbol de rutas para los dos routers: BrowserRouter (App.tsx, en el navegador) y
// StaticRouter (entry-server.tsx, en el build). `createRoutesFromChildren` en
// entry-server.tsx también lo recorre para sacar la lista de paths reales, así que un
// <Route> nuevo aquí es simultáneamente la fuente de verdad de la app y del manifiesto SEO.
export const routeElements = (
  <>
    <Route path="/" element={<Home />} />
    <Route path="/login" element={<Login />} />
    <Route path="/canjear" element={<Redeem />} />
    {/* Aterrizaje del redirect de Google (entrar y crear cuenta). */}
    <Route path="/auth/callback" element={<AuthCallback />} />
    {/* Fuera de ProtectedMember a propósito: es justo donde se elige el apodo que falta. */}
    <Route path="/bienvenida" element={
      <Suspense fallback={<PaperFallback />}><Bienvenida /></Suspense>
    } />
    <Route path="/perfil" element={
      <Suspense fallback={<PaperFallback />}>
        <ProtectedMember><Perfil /></ProtectedMember>
      </Suspense>
    } />
    <Route path="/cupones" element={
      <Suspense fallback={<PaperFallback />}>
        <ProtectedMember><Cupones /></ProtectedMember>
      </Suspense>
    } />
    <Route path="/ranking" element={
      <Suspense fallback={<PaperFallback />}>
        <ProtectedMember><Ranking /></ProtectedMember>
      </Suspense>
    } />
    <Route path="/misiones" element={
      <Suspense fallback={<PaperFallback />}>
        <ProtectedMember><Misiones /></ProtectedMember>
      </Suspense>
    } />
    {/* Ruta histórica: /cuenta se dividió en /perfil y /cupones */}
    <Route path="/cuenta" element={<Navigate to="/perfil" replace />} />
    {/* Públicas y sin guard: el aviso tiene que leerse antes de crear la cuenta.
        `lazyWithPreload` (no un import directo): así LegalDocument + legalContent.ts —el
        AST completo de los dos documentos— no viaja en el bundle de entrada de la home.
        El Suspense es el mismo boundary en servidor y cliente (misma routeElements), así
        que sus marcadores <!--$--> casan al hidratar; y como main.tsx espera `.preload()`
        antes de hidratar esta ruta, en la práctica nunca llega a mostrar el fallback ahí.
        Si SÍ se navega aquí en caliente desde otra ruta sin haber precargado, PaperFallback
        es lo que se ve un instante mientras baja el chunk. */}
    <Route path="/terminos" element={
      <Suspense fallback={<PaperFallback />}><Terminos /></Suspense>
    } />
    <Route path="/privacidad" element={
      <Suspense fallback={<PaperFallback />}><Privacidad /></Suspense>
    } />
    {/* El nombre que la gente teclea. */}
    <Route path="/aviso-de-privacidad" element={<Navigate to="/privacidad" replace />} />
    {/* Publica y sin guard: Google Play exige una URL donde cualquiera pueda encontrar
        como borrar su cuenta sin instalar la app, y el aviso la nombra por su direccion.
        Import directo (no lazyWithPreload): no importa nada pesado —ni LegalDocument ni
        legalContent.ts—, así que no hay nada que sacar del bundle de entrada aquí. */}
    <Route path="/eliminar-cuenta" element={<EliminarCuenta />} />
    <Route path="/admin" element={
      <Suspense fallback={<AdminFallback />}><AdminLogin /></Suspense>
    } />
    <Route path="/admin/dashboard" element={
      <Suspense fallback={<AdminFallback />}>
        <ProtectedAdmin><AdminDashboard /></ProtectedAdmin>
      </Suspense>
    } />
    <Route path="/admin/scanner" element={
      <Suspense fallback={<AdminFallback />}>
        <ProtectedAdmin><AdminScanner /></ProtectedAdmin>
      </Suspense>
    } />
    <Route path="/admin/users" element={
      <Suspense fallback={<AdminFallback />}>
        <ProtectedAdmin><AdminUsers /></ProtectedAdmin>
      </Suspense>
    } />
    <Route path="/admin/estacion" element={
      <Suspense fallback={<AdminFallback />}>
        <ProtectedAdmin><AdminEstacion /></ProtectedAdmin>
      </Suspense>
    } />
    <Route path="/admin/leaderboard" element={
      <Suspense fallback={<AdminFallback />}>
        <ProtectedAdmin><AdminLeaderboard /></ProtectedAdmin>
      </Suspense>
    } />
    <Route path="/admin/flavors" element={
      <Suspense fallback={<AdminFallback />}>
        <ProtectedAdmin><AdminFlavors /></ProtectedAdmin>
      </Suspense>
    } />
    {/* Versiones giradas, ver KioscoGirado. El guard va aquí y no solo dentro del iframe: sin
        sesión, el login tiene que abrirse en la ventana de arriba, porque Google no se deja
        cargar dentro de un iframe. */}
    <Route path="/admin/leaderboard_90" element={
      <Suspense fallback={<AdminFallback />}>
        <ProtectedAdmin><KioscoGirado ruta="/admin/leaderboard" grados={90} /></ProtectedAdmin>
      </Suspense>
    } />
    <Route path="/admin/leaderboard_270" element={
      <Suspense fallback={<AdminFallback />}>
        <ProtectedAdmin><KioscoGirado ruta="/admin/leaderboard" grados={270} /></ProtectedAdmin>
      </Suspense>
    } />
    <Route path="/admin/flavors_90" element={
      <Suspense fallback={<AdminFallback />}>
        <ProtectedAdmin><KioscoGirado ruta="/admin/flavors" grados={90} /></ProtectedAdmin>
      </Suspense>
    } />
    <Route path="/admin/flavors_270" element={
      <Suspense fallback={<AdminFallback />}>
        <ProtectedAdmin><KioscoGirado ruta="/admin/flavors" grados={270} /></ProtectedAdmin>
      </Suspense>
    } />
    <Route path="*" element={<NotFound />} />
  </>
)

/**
 * Todo lo que cuelga del router, sin el router mismo: lo envuelve `<BrowserRouter>` en
 * App.tsx y `<StaticRouter>` en entry-server.tsx, para que el build prerenderice
 * exactamente lo mismo que hidrata el navegador.
 */
export function AppShell() {
  const initAuth = useStore(s => s.initAuth)

  useEffect(() => {
    const unsubscribe = initAuth()
    return unsubscribe
    // Este efecto nunca corre en el servidor (el prerender no ejecuta efectos), así que
    // ahí `authReady` se queda en `false` y `profile` en `null` — el mismo estado inicial
    // con el que arranca el cliente antes de hidratar. Consistente por construcción.
  }, [initAuth])

  return (
    <>
      <RouteTracker />
      <Routes>{routeElements}</Routes>
      <BottomNav />
      {/* Dentro del Router (cualquiera de los dos) y no envolviéndolo: el aviso enlaza a
          /privacidad y manda la vista actual al aceptar, así que necesita Link y
          useLocation. */}
      <CookieBanner />
    </>
  )
}
