import { getSupabaseConfig, SupabaseRestError } from './rest';
import { getSupabaseAccessToken } from './session';

export function encodePathSegments(path: string) {
  return path
    .split('/')
    .filter(Boolean)
    .map((s) => {
      // Expanded cleaning: remove ALL invisible Unicode control characters, 
      // bidi markers, and other non-printable characters that upset S3/Supabase.
      const cleaned = s.replace(/[\u2000-\u206F\uFEFF\u202A-\u202E\u2066-\u2069]/g, '').trim();
      return encodeURIComponent(cleaned);
    })
    .join('/');
}

export function getPublicUrl(bucket: string, objectPath: string): string {
  const cfg = getSupabaseConfig();
  if (!cfg) return '';
  return `${cfg.url}/storage/v1/object/public/${bucket}/${encodePathSegments(objectPath)}`;
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
  const uploadUrl = `${cfg.url}/storage/v1/object/${bucket}/${encodePathSegments(objectPath)}`;

  const upRes = await fetch(uploadUrl, {
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
    console.error('Supabase Storage 400 details:', details);
    throw new SupabaseRestError(`Supabase Storage upload error (${upRes.status})`, upRes.status, details);
  }

  const publicUrl = new URL(
    `/storage/v1/object/public/${bucket}/${encodePathSegments(objectPath)}`,
    cfg.url
  ).toString();

  return { bucket, objectPath, publicUrl };
}

export async function uploadFileFromUri(args: {
  bucket: string;
  objectPath: string;
  uri: string;
  contentType?: string;
}): Promise<{ bucket: string; objectPath: string; publicUrl: string }> {
  const cfg = getSupabaseConfig();
  if (!cfg) {
    throw new SupabaseRestError(
      'Missing Supabase env (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY)',
      0
    );
  }

  const { bucket, objectPath, uri, contentType } = args;

  // Expo: fetch(file://...) returns a Blob (works on web + native).
  const fileRes = await fetch(uri);
  if (!fileRes.ok) {
    throw new SupabaseRestError(`Failed to read selected file (${fileRes.status})`, fileRes.status);
  }
  const blob = await fileRes.blob();

  const token = getSupabaseAccessToken();
  const uploadUrl = `${cfg.url}/storage/v1/object/${bucket}/${encodePathSegments(objectPath)}`;
  const upRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${token ?? cfg.anonKey}`,
      'x-upsert': 'true',
      'Content-Type': contentType ?? blob.type ?? 'application/octet-stream',
      Accept: 'application/json',
    },
    body: blob,
  });

  if (!upRes.ok) {
    const details = await upRes.text().catch(() => undefined);
    console.error('Supabase Storage 400 details:', details);
    throw new SupabaseRestError(`Supabase Storage upload error (${upRes.status})`, upRes.status, details);
  }

  const publicUrl = new URL(
    `/storage/v1/object/public/${bucket}/${encodePathSegments(objectPath)}`,
    cfg.url
  ).toString();

  return { bucket, objectPath, publicUrl };
}
