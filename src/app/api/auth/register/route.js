import { NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/db';
import { createToken, setAuthCookie } from '@/lib/auth';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';

export async function POST(request) {
  try {
    // Rate limit by IP
    const ip = getClientIP(request);
    const rateCheck = checkRateLimit(`register:${ip}`, RATE_LIMITS.auth);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': Math.ceil(rateCheck.resetIn / 1000).toString() } }
      );
    }

    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const existing = await getUserByEmail(email.toLowerCase());
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const userId = await createUser(email.toLowerCase(), password, name || email.split('@')[0]);
    const user = { id: userId, email: email.toLowerCase(), subscription_status: 'free' };
    const token = createToken(user);

    const response = NextResponse.json({
      success: true,
      user: { id: userId, email: email.toLowerCase(), name: name || email.split('@')[0], subscription_status: 'free' }
    });

    response.headers.set('Set-Cookie', setAuthCookie(token));
    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
