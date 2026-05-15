'use client';

import { useLoginMethod } from 'swr-login';
import type { GitHubOAuthHandle } from 'swr-login/methods/oauth-github';
import type { PasskeyHandle } from 'swr-login/methods/passkey';

export function SocialLoginButtons() {
  const githubHandle = useLoginMethod<{ use(): GitHubOAuthHandle }>('swr-login/oauth-github') as
    | GitHubOAuthHandle
    | undefined;
  const passkeyHandle = useLoginMethod<{ use(): PasskeyHandle }>('swr-login/passkey') as
    | PasskeyHandle
    | undefined;

  return (
    <div className="space-y-3">
      {/* GitHub */}
      {githubHandle && (
        <button
          type="button"
          onClick={() => githubHandle.redirect?.()}
          disabled={githubHandle.state === 'pending'}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition disabled:opacity-50"
        >
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 24 24"
            role="img"
            aria-label="GitHub"
          >
            <path
              fillRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"
              clipRule="evenodd"
            />
          </svg>
          {githubHandle.state === 'pending' ? 'Redirecting...' : 'Continue with GitHub'}
        </button>
      )}

      {/* Passkey */}
      {passkeyHandle && (
        <button
          type="button"
          onClick={() => passkeyHandle.submit?.({})}
          disabled={passkeyHandle.state === 'pending'}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition disabled:opacity-50"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
            role="img"
            aria-label="Passkey"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.864 4.243A7.5 7.5 0 0 1 19.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 0 0 4.5 10.5a48.667 48.667 0 0 0-1.418 8.773 3.752 3.752 0 0 0 3.138 4.107 3.75 3.75 0 0 0 4.244-3.17M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"
            />
          </svg>
          {passkeyHandle.state === 'pending' ? 'Authenticating...' : 'Sign in with Passkey'}
        </button>
      )}
    </div>
  );
}
