# swr-login · Next.js App Router Example

This example demonstrates how to integrate **swr-login** into a Next.js application using the App Router (React Server Components).

## Key Patterns

### 1. Client-side Provider in Server Layout

```tsx
// src/app/layout.tsx (Server Component)
import { Providers } from '@/components/providers';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

```tsx
// src/components/providers.tsx (Client Component)
'use client';

import { SWRLoginProvider } from '@swr-login/react';

export function Providers({ children }) {
  return <SWRLoginProvider config={config}>{children}</SWRLoginProvider>;
}
```

### 2. Page-level AuthGuard

```tsx
'use client';

import { AuthGuard } from '@swr-login/react';

export default function DashboardPage() {
  return (
    <AuthGuard fallback={<RedirectToLogin />}>
      <DashboardContent />
    </AuthGuard>
  );
}
```

### 3. Mock API Routes

All auth endpoints (`/api/auth/*`) are mocked using Next.js Route Handlers for demo purposes:

- `POST /api/auth/login` – Password login
- `POST /api/auth/logout` – Logout
- `GET /api/auth/me` – Get current user
- `POST /api/auth/google/callback` – Google OAuth callback
- `POST /api/auth/github/callback` – GitHub OAuth callback
- `POST /api/auth/passkey/challenge` – WebAuthn challenge
- `POST /api/auth/passkey/verify` – WebAuthn verification

### 4. Optional Server-side Middleware

`src/middleware.ts` shows how to add server-side route protection alongside client-side guards.

## Running

```bash
# From the monorepo root
pnpm install
pnpm build

# Start the dev server
pnpm --filter example-nextjs-app-router dev
```

Open [http://localhost:3000](http://localhost:3000)

## Login Credentials

For the password login mock, use:
- **Username**: `admin` (for admin role) or any username
- **Password**: any password (min 3 characters)
