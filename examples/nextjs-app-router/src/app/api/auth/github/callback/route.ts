import { NextResponse } from 'next/server';

/**
 * Mock GitHub OAuth callback endpoint.
 * In production, this would exchange the code with GitHub and fetch user profile.
 */
export async function POST(request: Request) {
  const body = await request.json();

  // Simulate code exchange
  await new Promise((resolve) => setTimeout(resolve, 600));

  if (!body.code) {
    return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
  }

  return NextResponse.json({
    accessToken: `mock_github_jwt_${Date.now()}`,
    refreshToken: `mock_github_refresh_${Date.now()}`,
    expiresAt: Date.now() + 3600 * 1000,
    user: {
      id: 'github_user_67890',
      name: 'octocat',
      email: 'octocat@github.com',
      roles: ['user'],
      permissions: ['read'],
      avatar: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
    },
  });
}
