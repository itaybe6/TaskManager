import { getSupabaseConfig, SupabaseRestError } from './rest';
import { getSupabaseAccessToken } from './session';

function encodePathSegments(path: string) {
  return path
    .split('/')
    .filter(Boolean)
    .map((s) => encodeURIComponent(s))
    .join('/');
}

export async function uploadAvatarFromUri(args: {
  userId: string;
  uri: string;
  contentType?: string;
  bucket?: string;
}): Promise<{ bucket: string; objectPath: string; publicUrl: string }> {
  const cfg = getSupabaseConfig();
  if (!cfg) {
    throw new SupabaseRestError(
      'Missing Supabase env (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY)',
      0
    );
  }

  const bucket = (args.bucket ?? 'avatars').trim();
  const ext = args.contentType?.includes('png') ? 'png' : 'jpg';
  const objectPath = `${args.userId}/${Date.now()}.${ext}`;

  // Expo: fetch(file://...) returns a Blob (works on web + native).
  const fileRes = await fetch(args.uri);
  if (!fileRes.ok) {
    throw new SupabaseRestError(`Failed to read selected image (${fileRes.status})`, fileRes.status);
  }
  const blob = await fileRes.blob();

  const token = getSupabaseAccessToken();
  const uploadUrl = new URL(`/storage/v1/object/${bucket}/${encodePathSegments(objectPath)}`, cfg.url);

  const upRes = await fetch(uploadUrl.toString(), {
    method: 'POST',
    headers: {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${token ?? cfg.anonKey}`,
      'x-upsert': 'true',
      'Content-Type': args.contentType ?? blob.type ?? 'application/octet-stream',
      Accept: 'application/json',
    },
    body: blob,
  });

  if (!upRes.ok) {
    const details = await upRes.text().catch(() => undefined);
    throw new SupabaseRestError(`Supabase Storage upload error (${upRes.status})`, upRes.status, details);
  }

  const publicUrl = new URL(
    `/storage/v1/object/public/${bucket}/${encodePathSegments(objectPath)}`,
    cfg.url
  ).toString();

  return { bucket, objectPath, publicUrl };
}

