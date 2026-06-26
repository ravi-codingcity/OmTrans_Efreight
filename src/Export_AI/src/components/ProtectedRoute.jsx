import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { PageLoader } from './Spinner.jsx';

// Embedded in the main app: the user is already authenticated. We only guard
// admin-only routes; everything else renders for the authenticated user.
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <PageLoader />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
}
