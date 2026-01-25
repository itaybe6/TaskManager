import { getSupabaseConfig, SupabaseRestError } from './rest';

export type SupabaseAuthUser = {
  id: string;
  email?: string;
};

export type SupabaseAuthSession = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: SupabaseAuthUser;
};

export async function signInWithPassword(args: {
  email: string;
  password: string;
}): Promise<SupabaseAuthSession> {
  const cfg = getSupabaseConfig();
  if (!cfg) {
    throw new SupabaseRestError(
      'Missing Supabase env (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY)',
      0
    );
  }

  const url = new URL('/auth/v1/token', cfg.url);
  url.searchParams.set('grant_type', 'password');

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${cfg.anonKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email: args.email, password: args.password }),
  });

  if (!res.ok) {
    const details = await res.text().catch(() => undefined);
    throw new SupabaseRestError(`Supabase Auth error (${res.status})`, res.status, details);
  }

  return (await res.json()) as SupabaseAuthSession;
}

export async function signOut(accessToken: string): Promise<void> {
  const cfg = getSupabaseConfig();
  if (!cfg) return;

  const url = new URL('/auth/v1/logout', cfg.url);
  await fetch(url.toString(), {
    method: 'POST',
    headers: {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  }).catch(() => {});
}

