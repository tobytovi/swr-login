'use client';

import { AuthGuard, useLogout, useSession, useUser } from '@swr-login/react';

export function UserProfile() {
  const { user } = useUser();
  const { logout, isLoading: isLogoutLoading } = useLogout();
  const { accessToken, expiresAt } = useSession();

  return (
    <div className="space-y-6">
      {/* User Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-lg font-bold">
            {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{user?.name ?? 'Unknown User'}</h2>
            <p className="text-sm text-gray-500">{user?.email ?? 'No email'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <span className="text-gray-500 block mb-1">User ID</span>
            <span className="font-mono text-gray-900 text-xs break-all">{user?.id ?? 'N/A'}</span>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <span className="text-gray-500 block mb-1">Roles</span>
            <div className="flex flex-wrap gap-1">
              {user?.roles?.map((role: string) => (
                <span
                  key={role}
                  className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium"
                >
                  {role}
                </span>
              )) ?? <span className="text-gray-400 text-xs">None</span>}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <span className="text-gray-500 block mb-1">Token</span>
            <span className="font-mono text-gray-900 text-xs break-all">
              {accessToken ? `${accessToken.slice(0, 24)}...` : 'N/A'}
            </span>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <span className="text-gray-500 block mb-1">Expires</span>
            <span className="text-gray-900 text-xs">
              {expiresAt ? new Date(expiresAt).toLocaleString() : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Admin Panel (role-guarded) */}
      <AuthGuard
        roles={['admin']}
        fallback={
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
            <p className="text-gray-500 text-sm">
              🔒 Admin panel requires the <code className="text-gray-700 font-mono">admin</code>{' '}
              role.
            </p>
          </div>
        }
      >
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-amber-900 mb-2">⚡ Admin Panel</h3>
          <p className="text-amber-700 text-sm">
            You have admin access. Here you can manage users, view analytics, and configure system
            settings.
          </p>
        </div>
      </AuthGuard>

      {/* Sign Out */}
      <button
        type="button"
        onClick={() => logout()}
        disabled={isLogoutLoading}
        className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition"
      >
        {isLogoutLoading ? 'Signing out...' : 'Sign Out'}
      </button>
    </div>
  );
}
