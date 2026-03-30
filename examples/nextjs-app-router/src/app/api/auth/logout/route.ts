import { NextResponse } from 'next/server';

/**
 * Mock logout endpoint.
 * In production, this would invalidate the session/token server-side.
 */
export async function POST() {
  // Simulate server-side session cleanup
  await new Promise((resolve) => setTimeout(resolve, 200));

  return NextResponse.json({ success: true });
}
