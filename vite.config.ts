import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * Imprime al arrancar cuales de las URLs que sirve Vite pueden usarse para entrar con Google.
 *
 * El `redirectTo` que manda el cliente es `window.location.origin + '/auth/callback'`, y Supabase lo
 * compara contra su lista blanca. Pero ademas — verificado contra el servidor — **rechaza cualquier
 * destino `http://` cuyo host no sea localhost o 127.0.0.1, aunque este en la lista blanca**. Cuando
 * lo rechaza cae al Site URL, que es produccion, sin dejar ninguna pista: el sintoma es que el login
 * en local aterriza en heladosmados.com.
 *
 * Por eso no basta con listar los origenes: hay que decir cual sirve y cual no. Abrir el dev server
 * desde el telefono por http://192.168.x.x:3000 NO se arregla agregando esa IP a la lista.
 */
function printSupabaseRedirectUrls(): Plugin {
  return {
    name: "mados:print-supabase-redirect-urls",
    apply: "serve",
    configureServer(server) {
      const printUrls = server.printUrls.bind(server);
      // Se envuelve printUrls en vez de escuchar 'listening' porque resolvedUrls solo esta
      // poblado para cuando Vite imprime sus propias URLs.
      server.printUrls = () => {
        printUrls();

        const all = [
          ...(server.resolvedUrls?.local ?? []),
          ...(server.resolvedUrls?.network ?? []),
        ].map((url) => new URL(url));
        if (all.length === 0) return;

        const usable = all.filter((u) => u.protocol === "https:" || LOOPBACK.has(u.hostname));
        const unusable = all.filter((u) => !usable.includes(u));

        const cyan = "\x1b[36m";
        const dim = "\x1b[2m";
        const bold = "\x1b[1m";
        const yellow = "\x1b[33m";
        const reset = "\x1b[0m";

        console.log(
          `  ${cyan}➜${reset}  ${bold}Supabase${reset} Redirect URLs — solo estas funcionan:`
        );
        for (const u of usable) {
          console.log(`     ${cyan}${u.origin}/auth/callback${reset}`);
        }

        if (unusable.length > 0) {
          console.log(
            `  ${yellow}➜${reset}  ${unusable.map((u) => u.origin).join(", ")} ` +
              `${bold}no ${unusable.length > 1 ? "sirven" : "sirve"}${reset} para entrar con Google:`
          );
          console.log(
            `     ${dim}Supabase rechaza http:// fuera de localhost, aunque lo agregues a la lista.${reset}`
          );
          console.log(
            `     ${dim}Para probar en el telefono:${reset} ${cyan}npm run phone${reset}`
          );
        }
      };
    },
  };
}

const REF_PRODUCCION = "cwmrevxwuzaldzwqjiuc";

/**
 * Fija el entorno antes de compilar (Story 6.8, igual que la app de administracion): `VITE_ENTORNO`
 * vale local, pruebas o produccion (sin la variable, produccion, tambien en `npm run dev`). Se
 * inyecta como `__MADOS_ENTORNO__`, constante que el build pliega: las ramas ajenas a produccion
 * (formulario de correo, franja) no llegan a dist/ en el build de produccion. Local y pruebas
 * nunca pueden apuntar a la Supabase de produccion. Corre en el build del cliente y en `--ssr`.
 */
function entornoDelBuild(): Plugin {
  let entorno = "produccion";
  return {
    name: "mados:entorno-del-build",
    config(config, { mode }) {
      const variables = loadEnv(mode, config.envDir ?? config.root ?? ".", "VITE_");
      const elegido = variables.VITE_ENTORNO || "produccion";
      if (elegido !== "produccion" && elegido !== "local" && elegido !== "pruebas") {
        throw new Error("VITE_ENTORNO debe ser local, pruebas o produccion.");
      }
      if (elegido !== "produccion" && (variables.VITE_SUPABASE_URL ?? "").includes(REF_PRODUCCION)) {
        throw new Error(
          `VITE_ENTORNO=${elegido} no puede apuntar a la Supabase de produccion (VITE_SUPABASE_URL).`
        );
      }
      entorno = elegido;
      return { define: { __MADOS_ENTORNO__: JSON.stringify(entorno) } };
    },
    transformIndexHtml(html) {
      if (entorno === "produccion") return html;
      const rotulo = entorno === "local" ? "LOCAL" : "PRUEBAS";
      return html
        .replace("<html ", `<html data-entorno="${entorno}" `)
        .replace("<title>", `<title>[${rotulo}] `);
    },
  };
}

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), entornoDelBuild(), printSupabaseRedirectUrls()],
  server: {
    port: 3000,
    // Sin esto Vite se mueve al 3001+ si el 3000 esta ocupado, window.location.origin deja de
    // coincidir con la lista blanca de Redirect URLs y el login con Google rebota a produccion
    // sin ninguna pista. Mejor que el arranque falle de frente.
    strictPort: true,
    open: true,
    host: true,
  },
  build: {
    // Solo para el build del cliente: scripts/prerender.mjs lo lee (dist/.vite/manifest.json)
    // para saber que chunk le toca a cada ruta con lazyWithPreload y mandarle un
    // <link rel="modulepreload"> desde su HTML — asi ese chunk baja en paralelo con el
    // principal en vez de esperar a que el JS ya corriendo llegue al import() dinamico. El
    // build --ssr no lo necesita (dist-ssr/ no se despliega); isSsrBuild lo evita ahi.
    manifest: !isSsrBuild,
  },
}));
