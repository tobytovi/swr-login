import AuthSetup from '@/lib/auth/AuthSetup';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'swr-login v0.9 · Aidemy Multi-step Demo',
  description:
    'RFC §8 showcase: password method with resetPasswordRequired + class-code multi-step method',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthSetup>
          <header
            style={{
              padding: '12px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <strong style={{ fontSize: 16 }}>swr-login v0.9</strong>
            <span style={{ color: '#6b7280', fontSize: 13 }}>Aidemy Multi-step Method Demo</span>
          </header>
          <main style={{ padding: '24px' }}>{children}</main>
        </AuthSetup>
      </body>
    </html>
  );
}
