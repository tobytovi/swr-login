'use client';

import { AuthGuard, useUser, useSession } from '@swr-login/react';
import Link from 'next/link';

function DashboardContent() {
  const { user } = useUser();
  const { accessToken } = useSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          This page is protected by <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded font-mono">AuthGuard</code>.
          Unauthenticated users are redirected to sign in.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-3xl mb-2">👤</div>
          <h3 className="font-semibold text-gray-900">{user?.name ?? 'User'}</h3>
          <p className="text-sm text-gray-500">{user?.email ?? 'No email'}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-3xl mb-2">🔑</div>
          <h3 className="font-semibold text-gray-900">Token Active</h3>
          <p className="text-sm text-gray-500 font-mono break-all">
            {accessToken ? `${accessToken.slice(0, 16)}...` : 'N/A'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-3xl mb-2">🛡️</div>
          <h3 className="font-semibold text-gray-900">Roles</h3>
          <div className="flex flex-wrap gap-1 mt-1">
            {user?.roles?.map((role: string) => (
              <span key={role} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                {role}
              </span>
            )) ?? <span className="text-xs text-gray-400">None</span>}
          </div>
        </div>
      </div>

      {/* Admin-only section */}
      <AuthGuard
        roles={['admin']}
        fallback={
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-6 text-center text-gray-500 text-sm">
            🔒 Admin analytics require the <code className="font-mono">admin</code> role.
          </div>
        }
      >
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-amber-900 mb-3">📊 Admin Analytics</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/70 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-amber-700">1,234</div>
              <div className="text-xs text-amber-600">Total Users</div>
            </div>
            <div className="bg-white/70 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-amber-700">567</div>
              <div className="text-xs text-amber-600">Active Today</div>
            </div>
            <div className="bg-white/70 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-amber-700">89%</div>
              <div className="text-xs text-amber-600">Retention</div>
            </div>
          </div>
        </div>
      </AuthGuard>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="text-5xl mb-4">🔐</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-500 mb-6">Please sign in to access the dashboard.</p>
          <Link
            href="/"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            Go to Sign In
          </Link>
        </div>
      }
      loadingComponent={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <DashboardContent />
    </AuthGuard>
  );
}
