import { NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/db';
import { createToken, setAuthCookie } from '@/lib/auth';

export async function POST(request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
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
