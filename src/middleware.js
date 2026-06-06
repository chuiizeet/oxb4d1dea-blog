import { verifySession, COOKIE } from './lib/auth.js';

// Protege /editor y /api/* (excepto /logout, que es una página aparte).
export function onRequest(context, next) {
  const { url, cookies, redirect } = context;
  const guarded =
    (url.pathname.startsWith('/editor') || url.pathname.startsWith('/api/')) &&
    url.pathname !== '/api/login';
  if (guarded) {
    const ok = verifySession(cookies.get(COOKIE)?.value);
    if (!ok) {
      if (url.pathname.startsWith('/api/')) {
        return new Response('No autorizado', { status: 401 });
      }
      return redirect('/login');
    }
  }
  return next();
}
