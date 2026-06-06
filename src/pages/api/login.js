import { checkPassword, createSession, COOKIE, MAX_AGE } from '../../lib/auth.js';

const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });

export async function POST({ request, cookies }) {
  let d;
  try {
    d = await request.json();
  } catch {
    return json({ ok: false }, 400);
  }
  if (checkPassword(d?.password ?? '')) {
    cookies.set(COOKIE, createSession(), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: MAX_AGE,
      secure: import.meta.env.PROD,
    });
    return json({ ok: true });
  }
  return json({ ok: false });
}
