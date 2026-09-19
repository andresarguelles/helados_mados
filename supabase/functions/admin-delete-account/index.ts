import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Baja de cuenta ejecutada por un administrador, a peticion del titular.
//
// El disparador es un correo a contacto@heladosmados.com pidiendo la baja. El admin entra
// al panel, encuentra a la persona y la elimina. Es el derecho de Cancelacion de ARCO
// ejercido por la via que el propio aviso de privacidad publica.
//
// POR QUE ES UNA FUNCION APARTE Y NO UNA RAMA DE delete-account
//
// Aquella lleva escrita su invariante: "quien pide la baja sale del JWT, NUNCA del cuerpo".
// Hoy eso no es una promesa, es una propiedad de la forma: no existe ningun parametro por
// el que entre una victima, y se verifica leyendo el archivo. Meterle una rama de admin la
// convertiria en una funcion cuya seguridad depende de que un `if` siga en el orden
// correcto para siempre — y es el endpoint que TODOS los clientes invocan con CUALQUIER
// JWT de usuario. El radio de explosion de equivocarse ahi es el padron entero.
//
// LA INVARIANTE DE ESTA FUNCION, que es distinta y hay que enunciarla igual de claro:
// la victima sale del cuerpo porque no hay otra forma, pero QUIEN EJECUTA sale del JWT y
// nunca del cuerpo. Quien ejecuta es justo lo que la bitacora tiene que poder afirmar.

const CATEGORIAS = ["admin_a_peticion", "admin_prueba"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const jsonHeaders = { "Content-Type": "application/json", ...corsHeaders };

// Los rechazos de negocio van con 200 y un cuerpo util, no con 4xx. supabase-js se come el
// cuerpo de los 4xx, y aqui hay cinco razones distintas que TIENEN que llegar a la pantalla
// del admin para que sepa que hacer. El precedente del repo es redeem-keyword.
const rechazo = (reason: string) =>
  new Response(JSON.stringify({ success: false, reason }), { status: 200, headers: jsonHeaders });

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

  let userId = "";
  let confirmacion = "";
  let via = "";
  try {
    const body = await req.json();
    userId = String(body?.userId ?? "").trim();
    confirmacion = String(body?.confirmacion ?? "").trim();
    via = String(body?.via ?? "").trim();
  } catch {
    return rechazo("invalid");
  }
  if (!userId) return rechazo("invalid");
  if (!CATEGORIAS.includes(via)) return rechazo("invalid_via");

  const comoUsuario = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  // Quien EJECUTA sale del JWT. Nunca del cuerpo.
  const { data: userData, error: userError } = await comoUsuario.auth.getUser();
  const adminId = userData?.user?.id;
  if (userError || !adminId) {
    return new Response(JSON.stringify({ success: false, reason: "not_authenticated" }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  // El guard de ruta del cliente es comodidad; la frontera es esta comprobacion.
  const { data: quienLlama } = await comoUsuario
    .from("profiles")
    .select("is_admin")
    .eq("id", adminId)
    .single();

  if (!quienLlama?.is_admin) return rechazo("forbidden");

  // A partir de aqui hace falta service role: la policy de profiles solo deja ver la fila
  // propia o, siendo admin, cualquiera — pero el borrado de auth.users necesita la llave.
  const comoServicio = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: objetivo } = await comoServicio
    .from("profiles")
    .select("id, username, email, is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (!objetivo) return rechazo("not_found");

  // Solo hay dos admins, is_admin no se puede reotorgar desde la app, y un clic dejaria al
  // negocio fuera de su propio panel. La baja de personal se queda en la consola SQL.
  // Esto cubre tambien el caso de un admin borrandose a si mismo.
  if (objetivo.is_admin) return rechazo("target_is_admin");

  // La confirmacion es el apodo DEL OBJETIVO, no una cadena fija, y eso cambia una
  // propiedad del sistema: el chequeo pasa a depender de a quien se borra. Un cliente mal
  // cableado que arrastre un userId viejo mientras pinta el nombre de otra persona no puede
  // borrar a quien no es. Con una cadena fija ese error seria indetectable y fatal.
  //
  // Comparacion sin distinguir mayusculas porque la columna es citext: rechazar
  // "astroprueba" seria incoherente con la nocion de igualdad de la propia base.
  const esperado = objetivo.username ?? objetivo.email;
  if (!esperado) return rechazo("no_identifier");
  if (confirmacion.toLowerCase() !== String(esperado).toLowerCase()) {
    return rechazo("confirmation_mismatch");
  }

  const { error: deleteError } = await comoServicio.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error("admin-delete-account fallo", { userId, adminId, message: deleteError.message });
    return new Response(JSON.stringify({ success: false, reason: "error" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  // La bitacora se escribe DESPUES: la fila solo debe existir si la baja ocurrio. Como la
  // tabla no tiene FKs ni columnas que puedan violarse, su unico fallo realista es que no
  // exista — un error de orden de despliegue, no de runtime. Si aun asi fallara, se registra
  // y se devuelve exito: el derecho ya se honro, y devolver error solo provocaria un
  // reintento contra un usuario que ya no existe.
  const { error: bitacoraError } = await comoServicio.from("account_deletions").insert({
    user_id: userId,
    username: objetivo.username,
    via,
    executed_by: adminId,
  });
  if (bitacoraError) {
    console.error("account_deletions sin fila", { userId, adminId, message: bitacoraError.message });
  }

  return new Response(JSON.stringify({ success: true, username: objetivo.username }), {
    status: 200,
    headers: jsonHeaders,
  });
});
