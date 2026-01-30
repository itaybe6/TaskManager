import { getSupabaseConfig, SupabaseRestError } from './rest';
import { getSupabaseAccessToken } from './session';

type CreateClientAuthUserArgs = {
  email: string;
  password: string;
  displayName: string;
};

type CreateClientAuthUserResponse = {
  user_id: string;
};

export async function createClientAuthUser(
  args: CreateClientAuthUserArgs
): Promise<CreateClientAuthUserResponse> {
  const cfg = getSupabaseConfig();
  if (!cfg) {
    throw new SupabaseRestError(
      'Missing Supabase env (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY)',
      0
    );
  }

  const url = new URL('/functions/v1/create-client-user', cfg.url);
  const token = getSupabaseAccessToken();
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${token ?? cfg.anonKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(args),
  });

  if (!res.ok) {
    const details = await res.text().catch(() => undefined);
    throw new SupabaseRestError(`Supabase function error (${res.status})`, res.status, details);
  }

  return (await res.json()) as CreateClientAuthUserResponse;
}
