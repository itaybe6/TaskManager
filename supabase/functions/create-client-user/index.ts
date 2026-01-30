import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = {
  email: string;
  password: string;
  displayName?: string;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: Body;
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const email = (payload.email ?? "").trim().toLowerCase();
  const password = (payload.password ?? "").trim();
  const displayName = (payload.displayName ?? "").trim();

  if (!email || !email.includes("@") || password.length < 6) {
    return new Response("Invalid payload", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const service = createClient(supabaseUrl, serviceRoleKey);
  const { data: roleRow, error: roleError } = await service
    .from("users")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (roleError) {
    return new Response(`Role check error: ${roleError.message}`, { status: 500 });
  }
  if (roleRow?.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: displayName || email,
      role: "client",
    },
  });

  if (createError || !created.user) {
    return new Response(`Create user error: ${createError?.message ?? "unknown"}`, { status: 400 });
  }

  return Response.json({ user_id: created.user.id });
});
