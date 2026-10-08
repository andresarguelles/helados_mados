import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// El canje de la palabra secreta. Reenvia el JWT de quien llama y la palabra al RPC
// `redeem_keyword`, que es quien valida y da el punto.
//
// Hasta la migracion 0035 esta funcion existia para leer la IP del llamador y guardar un hash
// con pepper, que topaba los canjes en 3 por red. Eso se elimino: con el acceso solo con Google
// y el telefono unico ya no protegia nada, y nunca fue un candado real. La funcion se queda
// porque es el endpoint que llaman la web y la app de Android, y su contrato (codigos y razones
// en el cuerpo, tambien en los no-2xx, que Android lee) no cambia.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const jsonHeaders = { "Content-Type": "application/json", ...corsHeaders };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, reason: "method_not_allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ success: false, reason: "not_authenticated" }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  let keyword: string;
  try {
    const body = await req.json();
    keyword = String(body?.keyword ?? "").trim();
  } catch {
    return new Response(JSON.stringify({ success: false, reason: "invalid" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }
  if (!keyword) {
    return new Response(JSON.stringify({ success: false, reason: "invalid" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data, error } = await supabase.rpc("redeem_keyword", { p_keyword: keyword });

  if (error) {
    return new Response(JSON.stringify({ success: false, reason: "error" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  return new Response(JSON.stringify(data), { status: 200, headers: jsonHeaders });
});
