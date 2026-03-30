import React from 'react';
import { useUser } from '../hooks/useUser';
import { usePermission } from '../hooks/usePermission';

export interface AuthGuardProps {
  children: React.ReactNode;
  /** Required permissions (checked against user.permissions) */
  permissions?: string[];
  /** Required roles (checked against user.roles) */
  roles?: string[];
  /** If true, ALL permissions/roles must match. If false, ANY match suffices. (default: false) */
  requireAll?: boolean;
  /** Component to render when user is not authenticated or lacks permissions */
  fallback?: React.ReactNode;
  /** Component to render while checking auth status */
  loadingComponent?: React.ReactNode;
}

/**
 * Declarative auth guard component.
 * Protects child content based on authentication state and permissions/roles.
 *
 * @example
 * ```tsx
 * <AuthGuard
 *   permissions={['admin', 'editor']}
 *   requireAll={false}
 *   fallback={<Navigate to="/login" />}
 *   loadingComponent={<Skeleton />}
 * >
 *   <AdminPanel />
 * </AuthGuard>
 * ```
 */
export function AuthGuard({
  children,
  permissions,
  roles,
  requireAll = false,
  fallback = null,
  loadingComponent = null,
}: AuthGuardProps) {
  const { isLoading, isAuthenticated } = useUser();
  const { hasAllPermissions, hasAnyPermission, hasAllRoles, hasAnyRole } = usePermission();

  if (isLoading) {
    return <>{loadingComponent}</>;
  }

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  // Check permissions
  if (permissions && permissions.length > 0) {
    const hasRequiredPermissions = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    if (!hasRequiredPermissions) {
      return <>{fallback}</>;
    }
  }

  // Check roles
  if (roles && roles.length > 0) {
    const hasRequiredRoles = requireAll ? hasAllRoles(roles) : hasAnyRole(roles);

    if (!hasRequiredRoles) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}
