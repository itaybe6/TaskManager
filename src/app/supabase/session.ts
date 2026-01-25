let accessToken: string | null = null;

export function setSupabaseAccessToken(token: string | null) {
  accessToken = token;
}

export function getSupabaseAccessToken() {
  return accessToken;
}

