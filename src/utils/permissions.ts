export type UserRole = 'admin' | 'cashier';

export const permissions = {
  // Admin-only permissions
  canAccessSettings: (role: UserRole | undefined): boolean => {
    return role === 'admin';
  },

  canAccessReports: (role: UserRole | undefined): boolean => {
    return role === 'admin';
  },

  canManageUsers: (role: UserRole | undefined): boolean => {
    return role === 'admin';
  },

  canManageInventory: (role: UserRole | undefined): boolean => {
    // Only admins can add, edit, delete products and change prices
    return role === 'admin';
  },

  // Routes accessible by role
  getAccessibleRoutes: (role: UserRole | undefined): string[] => {
    const commonRoutes = ['/', '/sales', '/inventory', '/transactions'];
    
    if (role === 'admin') {
      return [...commonRoutes, '/reports', '/settings'];
    }
    
    return commonRoutes;
  },

  // Check if user can access a specific route
  canAccessRoute: (role: UserRole | undefined, route: string): boolean => {
    const accessibleRoutes = permissions.getAccessibleRoutes(role);
    return accessibleRoutes.includes(route);
  }
};
