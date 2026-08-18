import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Fallback pepper so the function still works out of the box; for production, set a real
// secret via `supabase secrets set IP_HASH_PEPPER=<random-value>` (or the Dashboard) so raw
// IPs can never be reversed from the stored hash even if this source is ever exposed.
const IP_HASH_PEPPER = Deno.env.get("IP_HASH_PEPPER") ?? "helados-mados-dev-pepper-change-me";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

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

  // Supabase's edge network sets x-forwarded-for on the way in; take the first hop.
  // Raw IP never leaves this function or reaches Postgres -- only the salted hash does.
  const forwardedFor = req.headers.get("x-forwarded-for") ?? "";
  const clientIp = forwardedFor.split(",")[0].trim() || "unknown";
  const ipHash = await sha256Hex(`${clientIp}:${IP_HASH_PEPPER}`);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data, error } = await supabase.rpc("redeem_keyword", {
    p_keyword: keyword,
    p_ip_hash: ipHash,
  });

  if (error) {
    return new Response(JSON.stringify({ success: false, reason: "error" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  return new Response(JSON.stringify(data), { status: 200, headers: jsonHeaders });
});
