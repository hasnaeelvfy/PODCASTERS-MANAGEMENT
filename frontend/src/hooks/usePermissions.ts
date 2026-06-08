import { useAuth } from './useAuth';

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role ?? 'viewer';

  return {
    isAdmin: role === 'admin',
    isEditor: role === 'editor' || role === 'admin',
    isViewer: role === 'viewer',
    canCreate: role === 'editor' || role === 'admin',
    canEdit: role === 'editor' || role === 'admin',
    canDelete: role === 'admin',
    canManageUsers: role === 'admin',
    canChangeRoles: role === 'admin',
  };
}
