import { NextResponse } from 'next/server';

/**
 * Mock Passkey registration options endpoint.
 * In production, this would generate WebAuthn registration options.
 */
export async function POST() {
  const challengeBuffer = new Uint8Array(32);
  crypto.getRandomValues(challengeBuffer);
  const challenge = Buffer.from(challengeBuffer).toString('base64url');

  return NextResponse.json({
    challenge,
    rp: { id: 'localhost', name: 'swr-login Demo' },
    user: {
      id: Buffer.from('mock-user-id').toString('base64url'),
      name: 'demo@example.com',
      displayName: 'Demo User',
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 },
    ],
    timeout: 60000,
    authenticatorSelection: {
      userVerification: 'preferred',
      residentKey: 'preferred',
    },
  });
}
