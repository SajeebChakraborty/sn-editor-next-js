import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authSecret, verifyHs256Jwt } from '@/lib/jwtHs256';

const SESSION_COOKIE = 'sn_session';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const isApi = pathname.startsWith('/api/');

  if (!token) {
    if (isApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const login = new URL('/login', req.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  const payload = await verifyHs256Jwt(token, authSecret());
  if (!payload || typeof payload.sub !== 'string' || !payload.sub) {
    if (isApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const login = new URL('/login', req.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  const role = payload.role === 'admin' ? 'admin' : 'user';
  if ((pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) && role !== 'admin') {
    if (isApi) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/editor/:path*',
    '/video/:path*',
    '/admin/:path*',
    '/billing/:path*',
    '/api/projects/:path*',
    '/api/assets/:path*',
    '/api/brand-kits/:path*',
    '/api/jobs/:path*',
    '/api/ai/:path*',
    '/api/admin/:path*',
    '/api/billing/checkout',
    '/api/billing/confirm',
  ],
};
