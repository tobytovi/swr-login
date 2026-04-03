// ─── Provider ─────────────────────────────────────────────────
export { SWRLoginProvider } from './provider';
export type { SWRLoginProviderProps } from './provider';

// ─── Hooks ────────────────────────────────────────────────────
export { useLogin } from './hooks/useLogin';
export type { UseLoginReturn, UseLoginOptions } from './hooks/useLogin';

export { useMultiStepLogin } from './hooks/useMultiStepLogin';
export type { UseMultiStepLoginReturn } from './hooks/useMultiStepLogin';

export { useAuthInjector } from './hooks/useAuthInjector';

export { useUser, AUTH_KEY } from './hooks/useUser';
export type { UseUserReturn } from './hooks/useUser';

export { useLogout } from './hooks/useLogout';
export type { UseLogoutReturn, UseLogoutOptions } from './hooks/useLogout';

export { useSession } from './hooks/useSession';
export type { SessionInfo } from './hooks/useSession';

export { usePermission } from './hooks/usePermission';
export type { UsePermissionReturn } from './hooks/usePermission';

// ─── Components ───────────────────────────────────────────────
export { AuthGuard } from './components/AuthGuard';
export type { AuthGuardProps } from './components/AuthGuard';

// ─── Context (advanced usage) ─────────────────────────────────
export { useAuthContext } from './context';
export type { AuthContextValue } from './context';
