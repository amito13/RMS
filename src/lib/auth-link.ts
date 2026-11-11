import { supabase } from './supabase';

/**
 * Reads the auth parameters Supabase adds to a redirect link, from both the
 * query string (?code=… for PKCE) and the fragment (#access_token=… for the
 * implicit flow, or #error_description=… when the link is invalid).
 */
export function parseAuthLink(url: string): URLSearchParams {
  const params = new URLSearchParams();
  const [beforeHash, hash = ''] = url.split('#');
  const query = beforeHash.split('?')[1] ?? '';
  for (const part of [query, hash]) {
    new URLSearchParams(part).forEach((value, key) => params.set(key, value));
  }
  return params;
}

export type AuthLinkResult = { ok: true } | { ok: false; message: string };

/** Signs in with the session carried by a password-reset link. */
export async function createSessionFromLink(url: string): Promise<AuthLinkResult> {
  const params = parseAuthLink(url);

  const linkError = params.get('error_description') ?? params.get('error');
  if (linkError) return { ok: false, message: linkError.replace(/\+/g, ' ') };

  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? { ok: false, message: error.message } : { ok: true };
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return error ? { ok: false, message: error.message } : { ok: true };
  }

  return { ok: false, message: 'This link is missing its sign-in details.' };
}
