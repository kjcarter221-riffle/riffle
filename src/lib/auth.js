import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'riffle-jwt-secret-change-in-production-please';

export function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      subscription_status: user.subscription_status
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('riffle_auth');
    if (!token) return null;
    return verifyToken(token.value);
  } catch {
    return null;
  }
}

export function setAuthCookie(token) {
  return `riffle_auth=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${30 * 24 * 60 * 60}; Secure`;
}

export function clearAuthCookie() {
  return 'riffle_auth=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0';
}

export function isPro(user) {
  return user?.subscription_status === 'pro' || user?.subscription_status === 'active';
}
