import { NextResponse } from 'next/server';

/**
 * Mock "get current user" endpoint.
 * In production, this would decode/verify the JWT and return the user profile.
 */
export async function GET(request: Request) {
  const authorization = request.headers.get('Authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authorization.slice(7);

  // Simulate token validation
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Decode mock username from token
  const match = token.match(/mock_jwt_(.+?)_\d+/);
  let username = 'demo';
  if (match?.[1]) {
    try {
      username = atob(match[1]);
    } catch {
      username = 'demo';
    }
  }

  return NextResponse.json({
    id: `user_${btoa(username).slice(0, 8)}`,
    name: username.split('@')[0],
    email: username.includes('@') ? username : `${username}@example.com`,
    roles: username === 'admin' ? ['admin', 'user'] : ['user'],
    permissions: username === 'admin' ? ['read', 'write', 'admin'] : ['read'],
    avatar: null,
    createdAt: new Date().toISOString(),
  });
}
