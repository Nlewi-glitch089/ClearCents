import jwt from 'jsonwebtoken';

export function signToken(payload) {
  if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET not set');
  return jwt.sign(payload, process.env.SESSION_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET not set');
  return jwt.verify(token, process.env.SESSION_SECRET);
}

export function createAuthCookie(token) {
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
  const secure = process.env.NODE_ENV === 'production';
  const parts = [
    `session=${token}`,
    `HttpOnly`,
    `Path=/`,
    `Max-Age=${maxAge}`,
    `SameSite=Strict`
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [k, ...v] = part.split('=');
    if (!k) continue;
    cookies[k.trim()] = v.join('=').trim();
  }
  return cookies;
}
