import { NextResponse } from 'next/server';
import { getUserByEmail, createPasswordResetToken } from '@/lib/db';
import { sendEmail, getPasswordResetEmail } from '@/lib/email';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';

export async function POST(request) {
  try {
    // Strict rate limiting for password reset requests
    const ip = getClientIP(request);
    const rateCheck = checkRateLimit(`forgot:${ip}`, RATE_LIMITS.strict);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': Math.ceil(rateCheck.resetIn / 1000).toString() } }
      );
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Always return success to prevent email enumeration attacks
    const successResponse = NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.'
    });

    // Look up user
    const user = await getUserByEmail(email.toLowerCase());
    if (!user) {
      // Return success even if user doesn't exist (security)
      return successResponse;
    }

    // Create reset token
    const token = await createPasswordResetToken(user.id);

    // Build reset URL
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${origin}/reset-password?token=${token}`;

    // Send email
    const emailContent = getPasswordResetEmail(resetUrl, user.name);
    await sendEmail({
      to: user.email,
      ...emailContent
    });

    return successResponse;
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
