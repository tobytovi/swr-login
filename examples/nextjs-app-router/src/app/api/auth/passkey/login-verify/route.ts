import { NextResponse } from 'next/server';

/**
 * Mock Passkey login verification endpoint.
 * In production, this would verify the WebAuthn assertion response.
 */
export async function POST(request: Request) {
  const body = await request.json();
  await new Promise((resolve) => setTimeout(resolve, 300));

  if (!body.credential) {
    return NextResponse.json({ error: 'Missing credential' }, { status: 400 });
  }

  return NextResponse.json({
    accessToken: `mock_passkey_jwt_${Date.now()}`,
    refreshToken: `mock_passkey_refresh_${Date.now()}`,
    expiresAt: Date.now() + 3600 * 1000,
    user: {
      id: 'passkey_user_99999',
      name: 'Passkey User',
      email: 'passkey@example.com',
      roles: ['user'],
      permissions: ['read'],
    },
  });
}
