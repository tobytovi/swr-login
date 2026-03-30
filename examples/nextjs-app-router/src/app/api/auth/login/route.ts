import { NextResponse } from 'next/server';

/**
 * Mock password login endpoint.
 * In production, this would validate credentials against a database.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { username, password } = body;

  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock validation
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
  }

  // Accept any credentials for demo (in prod, validate against DB)
  if (password.length < 3) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Mock successful auth response
  const mockToken = `mock_jwt_${btoa(username)}_${Date.now()}`;
  const expiresAt = Date.now() + 3600 * 1000; // 1 hour

  return NextResponse.json({
    accessToken: mockToken,
    refreshToken: `mock_refresh_${Date.now()}`,
    expiresAt,
    user: {
      id: `user_${btoa(username).slice(0, 8)}`,
      name: username.split('@')[0],
      email: username.includes('@') ? username : `${username}@example.com`,
      roles: username === 'admin' ? ['admin', 'user'] : ['user'],
      permissions: username === 'admin' ? ['read', 'write', 'admin'] : ['read'],
    },
  });
}
