import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import { AuthStatus } from '@/components/auth-status';
import './globals.css';

export const metadata: Metadata = {
  title: 'swr-login · Next.js App Router Demo',
  description: 'Demonstrates seamless, no-refresh authentication with swr-login in a Next.js App Router project.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <Providers>
          {/* Navigation */}
          <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-200">
            <nav className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  swr-login
                </span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                  Next.js Demo
                </span>
              </div>
              <AuthStatus />
            </nav>
          </header>

          {/* Main Content */}
          <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
