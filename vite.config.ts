import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
