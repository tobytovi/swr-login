/**
 * Session fetcher for AuthHookRegistry.fetchSession.
 * Replace with a real API call in production.
 */

export interface AidemyUser {
  id: string;
  name: string;
  role: 'teacher' | 'student';
  email?: string;
}

export async function fetchUserSession(token: {
  accessToken: string | null;
}): Promise<AidemyUser | null> {
  if (!token.accessToken) return null;

  // In production: fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token.accessToken}` } })
  await new Promise((res) => setTimeout(res, 200));

  return {
    id: 'user-from-session',
    name: 'Demo User',
    role: 'student',
    email: 'demo@aidemy.example',
  };
}
