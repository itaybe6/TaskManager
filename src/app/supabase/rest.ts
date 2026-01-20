type SupabaseConfig = {
  url: string;
  anonKey: string;
};

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
  const anonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export class SupabaseRestError extends Error {
  status: number;
  details?: string;
  constructor(message: string, status: number, details?: string) {
    super(message);
    this.name = 'SupabaseRestError';
    this.status = status;
    this.details = details;
  }
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, string | undefined>) {
  const u = new URL(path, baseUrl);
  if (query) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined) continue;
      sp.set(k, v);
    }
    const qs = sp.toString();
    if (qs) u.search = qs;
  }
  return u.toString();
}

export async function supabaseRest<T>(args: {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string; // e.g. "/rest/v1/tasks"
  query?: Record<string, string | undefined>;
  body?: unknown;
  preferReturnRepresentation?: boolean;
}): Promise<T> {
  const cfg = getSupabaseConfig();
  if (!cfg) {
    throw new SupabaseRestError(
      'Missing Supabase env (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY)',
      0
    );
  }

  const url = buildUrl(cfg.url, args.path, args.query);
  const res = await fetch(url, {
    method: args.method,
    headers: {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${cfg.anonKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(args.preferReturnRepresentation ? { Prefer: 'return=representation' } : {}),
    },
    body: args.body === undefined ? undefined : JSON.stringify(args.body),
  });

  if (!res.ok) {
    let details: string | undefined;
    try {
      details = await res.text();
    } catch {}
    throw new SupabaseRestError(`Supabase REST error (${res.status})`, res.status, details);
  }

  // DELETE with no Prefer might return empty
  if (res.status === 204) return undefined as unknown as T;

  const text = await res.text();
  if (!text) return undefined as unknown as T;
  return JSON.parse(text) as T;
}

