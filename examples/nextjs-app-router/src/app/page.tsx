'use client';

import { LoginForm } from '@/components/login-form';
import { SocialLoginButtons } from '@/components/social-login-buttons';
import { UserProfile } from '@/components/user-profile';
import { useUser } from '@swr-login/react';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Welcome back!</h1>
        <UserProfile />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h1>
        <p className="text-gray-500">Choose your preferred sign-in method</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <LoginForm />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">or continue with</span>
          </div>
        </div>

        <SocialLoginButtons />
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">
        This is a demo of{' '}
        <a
          href="https://github.com/user/swr-login"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          swr-login
        </a>
        . No real authentication is performed.
      </p>
    </div>
  );
}
