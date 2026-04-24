import crypto from 'node:crypto';

export type SessionPayload = { sub: string; exp: number };

export const COOKIE_NAME = 'gg_admin';

function b64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str: string): Buffer {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function hmac(secret: string, data: string): string {
  return b64urlEncode(crypto.createHmac('sha256', secret).update(data).digest());
}

export function signSession(payload: SessionPayload, secret: string): string {
  const body = b64urlEncode(Buffer.from(JSON.stringify(payload), 'utf8'));
  const sig = hmac(secret, body);
  return `${body}.${sig}`;
}

export function verifySession(
  token: string | undefined,
  secret: string,
  now: number = Date.now(),
): SessionPayload | null {
  if (!token) return null;
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = hmac(secret, body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let parsed: SessionPayload;
  try {
    parsed = JSON.parse(b64urlDecode(body).toString('utf8')) as SessionPayload;
  } catch {
    return null;
  }
  if (typeof parsed.exp !== 'number' || parsed.exp < now) return null;
  return parsed;
}

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

export function buildSessionCookie(
  token: string,
  maxAgeMs: number,
  secure: boolean,
): string {
  const maxAgeS = Math.max(1, Math.floor(maxAgeMs / 1000));
  const parts = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeS}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function buildClearCookie(secure: boolean): string {
  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function timingSafeEqualStrings(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) {
    // still run compare with same length to reduce timing leak
    const pad = Buffer.alloc(Math.max(ab.length, bb.length));
    crypto.timingSafeEqual(pad, pad);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}
