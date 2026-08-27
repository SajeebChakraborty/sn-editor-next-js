/**
 * HS256 JWT helpers that work in Next.js Edge middleware and Node.
 */

function b64urlToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToB64url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export type JwtPayload = {
  sub?: string;
  email?: string;
  name?: string;
  role?: string;
  plan?: string;
  exp?: number;
  iat?: number;
};

export function authSecret(): string {
  return process.env.AUTH_SECRET?.trim() || 'sn-editor-dev-auth-secret-change-in-production';
}

async function hmacKey(secret: string, usage: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usage,
  );
}

export async function signHs256Jwt(
  payload: Omit<JwtPayload, 'exp' | 'iat'> & Record<string, unknown>,
  maxAgeSec: number,
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + maxAgeSec };
  const h = bytesToB64url(new TextEncoder().encode(JSON.stringify(header)));
  const p = bytesToB64url(new TextEncoder().encode(JSON.stringify(body)));
  const key = await hmacKey(authSecret(), ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${h}.${p}`)));
  return `${h}.${p}.${bytesToB64url(sig)}`;
}

export async function verifyHs256Jwt(token: string, secret = authSecret()): Promise<JwtPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts as [string, string, string];
  try {
    const key = await hmacKey(secret, ['verify']);
    const ok = await crypto.subtle.verify(
      'HMAC',
      key,
      b64urlToBytes(signature),
      new TextEncoder().encode(`${header}.${payload}`),
    );
    if (!ok) return null;
    const json = JSON.parse(new TextDecoder().decode(b64urlToBytes(payload))) as JwtPayload;
    if (typeof json.exp === 'number' && json.exp * 1000 < Date.now()) return null;
    return json;
  } catch {
    return null;
  }
}
