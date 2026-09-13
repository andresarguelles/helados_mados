import { defineConfig, type Plugin } from "vite";
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

export default defineConfig({
  plugins: [react(), printSupabaseRedirectUrls()],
  server: {
    port: 3000,
    // Sin esto Vite se mueve al 3001+ si el 3000 esta ocupado, window.location.origin deja de
    // coincidir con la lista blanca de Redirect URLs y el login con Google rebota a produccion
    // sin ninguna pista. Mejor que el arranque falle de frente.
    strictPort: true,
    open: true,
    host: true,
  },
});
