import { NextResponse } from 'next/server';
import { verifyPasswordResetToken, usePasswordResetToken } from '@/lib/db';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';

// GET - Verify token is valid
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false, error: 'Token required' }, { status: 400 });
    }

    const tokenData = await verifyPasswordResetToken(token);
    if (!tokenData) {
      return NextResponse.json({ valid: false, error: 'Invalid or expired reset link' });
    }

    return NextResponse.json({ valid: true, email: tokenData.email });
  } catch (error) {
    console.error('Verify token error:', error);
    return NextResponse.json({ valid: false, error: 'Failed to verify token' }, { status: 500 });
  }
}

// POST - Reset password
export async function POST(request) {
  try {
    // Rate limit password reset attempts
    const ip = getClientIP(request);
    const rateCheck = checkRateLimit(`reset:${ip}`, RATE_LIMITS.auth);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': Math.ceil(rateCheck.resetIn / 1000).toString() } }
      );
    }

    const { token, password } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Reset token required' }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const success = await usePasswordResetToken(token, password);
    if (!success) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
