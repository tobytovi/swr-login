import { NextResponse } from 'next/server';

/**
 * Mock Passkey authentication options endpoint.
 * In production, this would generate WebAuthn assertion options.
 */
export async function POST() {
  const challengeBuffer = new Uint8Array(32);
  crypto.getRandomValues(challengeBuffer);
  const challenge = Buffer.from(challengeBuffer).toString('base64url');

  return NextResponse.json({
    challenge,
    rpId: 'localhost',
    timeout: 60000,
    userVerification: 'preferred',
    allowCredentials: [],
  });
}
