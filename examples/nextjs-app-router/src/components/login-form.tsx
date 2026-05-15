'use client';

import { type FormEvent, useState } from 'react';
import { useLoginMethod } from 'swr-login';
import type { PasswordHandle } from 'swr-login/methods/password';

export function LoginForm() {
  const handle = useLoginMethod<{ use(): PasswordHandle }>('swr-login/password') as
    | PasswordHandle
    | undefined;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  if (!handle) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await handle.submit({ username, password });
    } catch {
      // Error is captured in handle.error
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
          Username
        </label>
        <input
          id="username"
          type="text"
          placeholder="demo@example.com"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          required
        />
      </div>

      {handle.error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {handle.error.message}
        </div>
      )}

      <button
        type="submit"
        disabled={handle.state === 'pending'}
        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition"
      >
        {handle.state === 'pending' ? 'Signing in...' : 'Sign in with Password'}
      </button>
    </form>
  );
}
