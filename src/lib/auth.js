import crypto from 'node:crypto';

const SECRET = import.meta.env.SESSION_SECRET ?? process.env.SESSION_SECRET ?? '';
export const COOKIE = 'sid';
export const MAX_AGE = 60 * 60 * 24 * 30; // 30 días

function sign(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${mac}`;
}

export function createSession() {
  return sign({ exp: Date.now() + MAX_AGE * 1000 });
}

export function verifySession(token) {
  if (!token || !SECRET) return false;
  const i = token.lastIndexOf('.');
  if (i < 0) return false;
  const data = token.slice(0, i);
  const mac = token.slice(i + 1);
  const expected = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(data, 'base64url').toString());
    return typeof exp === 'number' && exp > Date.now();
  } catch {
    return false;
  }
}

export function checkPassword(pw) {
  const real = import.meta.env.EDITOR_PASSWORD ?? process.env.EDITOR_PASSWORD ?? '';
  return real.length > 0 && pw === real;
}
