import { NextResponse } from 'next/server';

/**
 * Mock Google OAuth callback endpoint.
 * In production, this would exchange the authorization code for tokens with Google.
 */
export async function POST(request: Request) {
  const body = await request.json();

  // Simulate code exchange
  await new Promise((resolve) => setTimeout(resolve, 600));

  if (!body.code) {
    return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
  }

  return NextResponse.json({
    accessToken: `mock_google_jwt_${Date.now()}`,
    refreshToken: `mock_google_refresh_${Date.now()}`,
    expiresAt: Date.now() + 3600 * 1000,
    user: {
      id: 'google_user_12345',
      name: 'Google User',
      email: 'user@gmail.com',
      roles: ['user'],
      permissions: ['read'],
      avatar: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
    },
  });
}
