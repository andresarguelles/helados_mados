import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Baja de cuenta a peticion del titular: el derecho de Cancelacion de ARCO, y ademas un
// requisito duro de Google Play para publicar cualquier app con registro.
//
// Por que una edge function y no una RPC: borrar de `auth.users` necesita la service role,
// y esa llave no puede vivir en Postgres al alcance de una funcion que invoca el cliente.
// Aqui si, porque los secretos de la funcion nunca salen del servidor.
//
// Lo que se va en cascada: auth.users -> profiles -> coupons.
// Lo que SOBREVIVE, y esta declarado en el aviso de privacidad:
//   - ip_redemption_logs: no esta ligada al usuario (solo guarda hashes de red y un
//     contador), asi que no sabriamos cuales son suyos aunque quisieramos.
//   - legal_acceptances: es la prueba de que hubo consentimiento. Si se fuera con la
//     cuenta, la baja destruiria justo la evidencia. Queda bloqueada, sin FK, con un
//     user_id que ya no resuelve a nadie.
//
// Esta baja NO se anota en account_deletions, y es deliberado: el titular actuo por si
// mismo, el acto es la solicitud, y no hay un tercero del que defenderse. Guardar su UUID
// despues de que pidio desaparecer seria retencion sin finalidad. La bitacora existe para
// las bajas que ejecuta el personal, que es donde si hace falta poder demostrar quien
// actuo y por que. Ver admin-delete-account.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const jsonHeaders = { "Content-Type": "application/json", ...corsHeaders };

const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: jsonHeaders });

// El cliente tiene que mandarla tal cual. No es seguridad — el JWT ya lo es — sino un
// seguro contra un cliente mal cableado: ninguna peticion accidental borra una cuenta.
const CONFIRMACION = "ELIMINAR MI CUENTA";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return responder({ success: false, reason: "method_not_allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return responder({ success: false, reason: "not_authenticated" }, 401);
  }

  let confirmacion = "";
  try {
    const body = await req.json();
    confirmacion = String(body?.confirmacion ?? "");
  } catch {
    return responder({ success: false, reason: "invalid" }, 400);
  }
  if (confirmacion !== CONFIRMACION) {
    return responder({ success: false, reason: "confirmation_required" }, 400);
  }

  // Quien pide la baja sale del JWT, NUNCA del cuerpo. Aceptar un id del cliente aqui
  // convertiria esta funcion en un borrador de cuentas ajenas con solo cambiar un campo.
  const comoUsuario = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData, error: userError } = await comoUsuario.auth.getUser();
  const userId = userData?.user?.id;
  if (userError || !userId) {
    return responder({ success: false, reason: "not_authenticated" }, 401);
  }

  // Un admin que se borra a si mismo deja la tienda sin quien escanee cupones, y el rol no
  // se puede reasignar desde la app. Que pase por otro admin primero.
  const { data: perfil } = await comoUsuario
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();

  if (perfil?.is_admin) {
    return responder({ success: false, reason: "admin_cannot_delete" }, 403);
  }

  const comoServicio = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { error: deleteError } = await comoServicio.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error("delete-account fallo", { userId, message: deleteError.message });
    return responder({ success: false, reason: "error" }, 500);
  }

  return responder({ success: true });
});
