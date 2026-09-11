import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../common/LoadingSpinner';

export function ProtectedRoute() {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!token && !user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
