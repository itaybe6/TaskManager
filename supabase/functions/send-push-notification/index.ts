import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type WebhookPayload = {
  notification_id: string;
  recipient_user_id: string;
  title: string;
  body?: string | null;
  data?: unknown;
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const expectedSecret = Deno.env.get("WEBHOOK_SECRET") ?? "";
  const gotSecret = req.headers.get("x-webhook-secret") ?? "";
  if (expectedSecret && gotSecret !== expectedSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: tokens, error } = await supabase
    .from("user_push_tokens")
    .select("expo_push_token")
    .eq("user_id", payload.recipient_user_id);

  if (error) {
    return new Response(`DB error: ${error.message}`, { status: 500 });
  }

  const expoTokens = (tokens ?? [])
    .map((t: any) => t.expo_push_token as string)
    .filter(Boolean);

  if (!expoTokens.length) {
    // No devices registered; not an error.
    return Response.json({ ok: true, sent: 0, reason: "no_tokens" });
  }

  const messages = expoTokens.map((to) => ({
    to,
    sound: "default",
    title: payload.title,
    body: payload.body ?? "",
    data: {
      notificationId: payload.notification_id,
      ...(typeof payload.data === "object" && payload.data ? payload.data : {}),
    },
  }));

  const expoRes = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });

  const expoText = await expoRes.text();
  if (!expoRes.ok) {
    return new Response(`Expo error: ${expoRes.status} ${expoText}`, { status: 502 });
  }

  return Response.json({ ok: true, sent: expoTokens.length, expo: safeJson(expoText) });
});

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

