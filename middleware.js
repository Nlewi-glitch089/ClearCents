import { NextResponse } from 'next/server';

// Protect staff-only routes by checking the `session` cookie's JWT payload for role.
// This middleware decodes the JWT payload without verifying signature (edge runtime safe).
// Note: decoding without verification is not cryptographically secure — acceptable for local/dev.

function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1];
    // base64url -> base64
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // Decode in environments that may not provide Buffer (Edge runtime)
    let jsonStr;
    if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
      jsonStr = Buffer.from(b64, 'base64').toString('utf8');
    } else if (typeof atob === 'function') {
      const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
      const bin = atob(padded);
      jsonStr = decodeURIComponent(Array.prototype.map.call(bin, function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    } else {
      return null;
    }
    return JSON.parse(jsonStr);
  } catch (e) {
    return null;
  }
}

export async function middleware(req) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  // Bypass static, api, and next internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname.startsWith('/favicon.ico') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Staff protection (unchanged)
  const staffPaths = ['/rubric', '/reflection'];
  if (staffPaths.some(p => pathname.startsWith(p))) {
    const cookie = req.cookies.get('session') || '';
    if (!cookie) {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
    const payload = decodeJwtPayload(cookie);
    if (!payload || !payload.role) {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
    const allowed = payload.role === 'coach' || payload.role === 'instructor';
    if (!allowed) {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Mandatory onboarding: if user is signed in but has no onboarding saved, redirect them to onboarding.
  // Skip for auth pages and onboarding itself to avoid loops.
  const skipPaths = ['/auth', '/auth/onboarding', '/profile', '/api'];
  if (skipPaths.some(p => pathname.startsWith(p))) return NextResponse.next();

  // Only enforce onboarding when a short-lived flag cookie is present.
  // This allows visitors and returning users (who didn't just sign up) to browse freely.
  const mustOnboard = req.cookies.get('must_onboard');
  if (!mustOnboard) return NextResponse.next();

  // Require a session for onboarding enforcement
  const cookie = req.cookies.get('session') || '';
  if (!cookie) return NextResponse.next();

  try {
    const origin = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    const res = await fetch(origin + '/api/onboarding', { headers: { cookie: req.headers.get('cookie') || '' } });
    if (res.ok) {
      const data = await res.json();
      // If onboarding not found, redirect to onboarding page
      if (!data.onboarding) {
        url.pathname = '/auth/onboarding';
        return NextResponse.redirect(url);
      }
      // If onboarding exists, clear the must_onboard cookie and continue
      const next = NextResponse.next();
      next.headers.append('Set-Cookie', 'must_onboard=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax');
      return next;
    }
    // If API returned 401 or error, just let the request proceed (avoid blocking)
    return NextResponse.next();
  } catch (e) {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/:path*']
};
