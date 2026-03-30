import { useCallback } from 'react';
import { useUser } from './useUser';

export interface UsePermissionReturn {
  /** Check if user has a specific permission */
  hasPermission: (permission: string) => boolean;
  /** Check if user has a specific role */
  hasRole: (role: string) => boolean;
  /** Check if user has all specified permissions */
  hasAllPermissions: (permissions: string[]) => boolean;
  /** Check if user has any of the specified permissions */
  hasAnyPermission: (permissions: string[]) => boolean;
  /** Check if user has all specified roles */
  hasAllRoles: (roles: string[]) => boolean;
  /** Check if user has any of the specified roles */
  hasAnyRole: (roles: string[]) => boolean;
}

/**
 * Hook for checking user permissions and roles.
 *
 * Reads from the `permissions` and `roles` arrays on the User object.
 *
 * @example
 * ```tsx
 * const { hasPermission, hasRole } = usePermission();
 *
 * if (hasPermission('admin:write')) {
 *   // Show admin controls
 * }
 *
 * if (hasRole('editor')) {
 *   // Show editor tools
 * }
 * ```
 */
export function usePermission(): UsePermissionReturn {
  const { user } = useUser();

  const hasPermission = useCallback(
    (permission: string): boolean => {
      return user?.permissions?.includes(permission) ?? false;
    },
    [user],
  );

  const hasRole = useCallback(
    (role: string): boolean => {
      return user?.roles?.includes(role) ?? false;
    },
    [user],
  );

  const hasAllPermissions = useCallback(
    (permissions: string[]): boolean => {
      if (!user?.permissions) return false;
      return permissions.every((p) => user.permissions?.includes(p));
    },
    [user],
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]): boolean => {
      if (!user?.permissions) return false;
      return permissions.some((p) => user.permissions?.includes(p));
    },
    [user],
  );

  const hasAllRoles = useCallback(
    (roles: string[]): boolean => {
      if (!user?.roles) return false;
      return roles.every((r) => user.roles?.includes(r));
    },
    [user],
  );

  const hasAnyRole = useCallback(
    (roles: string[]): boolean => {
      if (!user?.roles) return false;
      return roles.some((r) => user.roles?.includes(r));
    },
    [user],
  );

  return {
    hasPermission,
    hasRole,
    hasAllPermissions,
    hasAnyPermission,
    hasAllRoles,
    hasAnyRole,
  };
}
