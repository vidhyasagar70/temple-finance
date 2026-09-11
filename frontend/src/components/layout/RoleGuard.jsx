import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function RoleGuard({ allowedRoles, children }) {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center max-w-lg mx-auto mt-10">
        <h2 className="text-xl font-bold text-rose-800 font-serif">Access Restricted</h2>
        <p className="text-sm text-rose-600 mt-2">
          Your current role (<span className="font-bold">{user?.role}</span>) does not have permission to access this page.
        </p>
      </div>
    );
  }

  return children;
}
