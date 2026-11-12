import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

/**
 * Any signed-in person may open the screen; the backend decides what they may
 * see. Used where access depends on the record rather than a workspace role,
 * such as a lease: its two parties may open it, and the server refuses everyone
 * else.
 */
export default function SignedInGuard({ children }) {
  const { user, isLoadingAuth } = useAuth();
  if (isLoadingAuth) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto h-7 w-7 animate-spin rounded-full border-4 border-border border-t-navy" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
