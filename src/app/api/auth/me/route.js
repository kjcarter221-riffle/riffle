import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserById, getUserStats } from '@/lib/db';

export async function GET() {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ user: null });
    }

    const user = getUserById(authUser.id);
    const stats = getUserStats(authUser.id);

    return NextResponse.json({ user, stats });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ user: null });
  }
}
