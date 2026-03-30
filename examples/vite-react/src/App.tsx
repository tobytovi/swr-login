import { JWTAdapter } from '@swr-login/adapter-jwt';
import { GitHubOAuthPlugin } from '@swr-login/plugin-oauth-github';
import { GoogleOAuthPlugin } from '@swr-login/plugin-oauth-google';
import { PasswordPlugin } from '@swr-login/plugin-password';
import {
  AuthGuard,
  SWRLoginProvider,
  useLogin,
  useLogout,
  useSession,
  useUser,
} from '@swr-login/react';
import type React from 'react';
import { useState } from 'react';

// ─── Configuration ───────────────────────────────────────────

const config = {
  adapter: JWTAdapter({ storage: 'localStorage' }),
  plugins: [
    PasswordPlugin({ loginUrl: '/api/auth/login', logoutUrl: '/api/auth/logout' }),
    GoogleOAuthPlugin({
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? 'your-google-client-id',
      tokenEndpoint: '/api/auth/google/callback',
    }),
    GitHubOAuthPlugin({
      clientId: import.meta.env.VITE_GITHUB_CLIENT_ID ?? 'your-github-client-id',
      tokenEndpoint: '/api/auth/github/callback',
    }),
  ],
  fetchUser: async (token: string) => {
    const res = await fetch('/api/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch user');
    return res.json();
  },
  onLogin: (user: { name?: string }) => console.log('Logged in:', user.name),
  onLogout: () => console.log('Logged out'),
};

// ─── Login Page ──────────────────────────────────────────────

function LoginPage() {
  const {
    login: passwordLogin,
    isLoading: isPasswordLoading,
    error: passwordError,
  } = useLogin('password');
  const { login: googleLogin } = useLogin('oauth-google');
  const { login: githubLogin } = useLogin('oauth-github');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await passwordLogin({ username, password });
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', fontFamily: 'system-ui' }}>
      <h1>🔐 swr-login Demo</h1>

      <form onSubmit={handlePasswordLogin}>
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
          />
        </div>
        <button type="submit" disabled={isPasswordLoading} style={{ width: '100%', padding: 10 }}>
          {isPasswordLoading ? 'Signing in...' : 'Sign in with Password'}
        </button>
      </form>

      {passwordError && <p style={{ color: 'red', marginTop: 8 }}>{passwordError.message}</p>}

      <hr style={{ margin: '20px 0' }} />

      <button
        type="button"
        onClick={() => googleLogin({})}
        style={{ width: '100%', padding: 10, marginBottom: 8, cursor: 'pointer' }}
      >
        🔵 Sign in with Google
      </button>

      <button
        type="button"
        onClick={() => githubLogin({})}
        style={{ width: '100%', padding: 10, cursor: 'pointer' }}
      >
        ⚫ Sign in with GitHub
      </button>
    </div>
  );
}

// ─── Dashboard (protected) ───────────────────────────────────

function Dashboard() {
  const { user } = useUser();
  const { logout, isLoading } = useLogout();
  const { accessToken, expiresAt } = useSession();

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1>Dashboard</h1>
      <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
        <p>
          <strong>Name:</strong> {user?.name ?? 'N/A'}
        </p>
        <p>
          <strong>Email:</strong> {user?.email ?? 'N/A'}
        </p>
        <p>
          <strong>ID:</strong> {user?.id}
        </p>
        <p>
          <strong>Token:</strong> {accessToken?.slice(0, 20)}...
        </p>
        <p>
          <strong>Expires:</strong> {expiresAt ? new Date(expiresAt).toLocaleString() : 'N/A'}
        </p>
      </div>

      <AuthGuard
        roles={['admin']}
        fallback={<p style={{ color: '#999' }}>Admin panel requires admin role.</p>}
      >
        <div style={{ padding: 16, background: '#fff3cd', borderRadius: 8, marginTop: 16 }}>
          <h3>Admin Panel</h3>
          <p>You have admin access!</p>
        </div>
      </AuthGuard>

      <button
        type="button"
        onClick={() => logout()}
        disabled={isLoading}
        style={{ marginTop: 16, padding: '10px 24px', cursor: 'pointer' }}
      >
        {isLoading ? 'Signing out...' : 'Sign Out'}
      </button>
    </div>
  );
}

// ─── App Root ────────────────────────────────────────────────

function AppContent() {
  const { isAuthenticated, isLoading } = useUser();

  if (isLoading) {
    return <div style={{ textAlign: 'center', marginTop: 100 }}>Loading...</div>;
  }

  return isAuthenticated ? <Dashboard /> : <LoginPage />;
}

export default function App() {
  return (
    <SWRLoginProvider config={config}>
      <AppContent />
    </SWRLoginProvider>
  );
}
