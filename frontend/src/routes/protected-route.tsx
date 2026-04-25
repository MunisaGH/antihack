import { Navigate, useLocation } from 'react-router-dom';
import { authStorage } from '@/lib/auth-storage';

type Props = {
  children: React.ReactNode;
  requireAdmin?: boolean;
};

export function ProtectedRoute({ children, requireAdmin = false }: Props) {
  const location = useLocation();

  if (!authStorage.isTokenValid()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin) {
    const user = authStorage.getUser();
    if (user && user.role !== 'admin') {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: Props) {
  if (authStorage.isTokenValid()) {
    const user = authStorage.getUser();
    const target = user?.role === 'admin' ? '/dashboard' : '/me';
    return <Navigate to={target} replace />;
  }
  return <>{children}</>;
}
