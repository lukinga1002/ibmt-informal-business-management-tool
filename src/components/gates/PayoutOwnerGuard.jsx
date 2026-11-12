import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useIBMT } from '@/api/IBMTContext';
import { callFn } from '@/lib/r4';
import { payoutPageAccess, verifiedOwnerPropertyCount } from '@/lib/payoutAccess';
import WorkspaceGuard from '@/components/gates/WorkspaceGuard';

/**
 * The payout page guard. Landlords and admins pass as before. A verified
 * co-owner who is not the registered landlord passes when the server lists a
 * property where they are on the owner roster. Everyone else gets the usual
 * workspace refusal (and sign-in redirect) from WorkspaceGuard.
 */
export default function PayoutOwnerGuard({ children }) {
  const { user, isLoadingAuth } = useAuth();
  const { role } = useIBMT();
  const [ownedPropertyCount, setOwnedPropertyCount] = useState(null);
  const needsServerCheck = Boolean(user) && user.role !== 'admin' && role !== 'landlord';

  useEffect(() => {
    if (!needsServerCheck) return undefined;
    let active = true;
    verifiedOwnerPropertyCount(callFn).then((count) => {
      if (active) setOwnedPropertyCount(count);
    });
    return () => {
      active = false;
    };
  }, [needsServerCheck, user?.id]);

  const access = isLoadingAuth ? 'checking' : payoutPageAccess({ user, role, ownedPropertyCount });
  if (access === 'checking') {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto h-7 w-7 animate-spin rounded-full border-4 border-border border-t-navy" />
      </div>
    );
  }
  if (access === 'allow') return children;
  return <WorkspaceGuard allow={['landlord']}>{children}</WorkspaceGuard>;
}
