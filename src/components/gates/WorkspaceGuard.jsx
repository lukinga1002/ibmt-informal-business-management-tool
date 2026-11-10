import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, Lock } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useIBMT } from '@/api/IBMTContext';
import { useT } from '@/i18n/I18nContext';

/**
 * Role-based route guard for every workspace.
 *
 * Hiding a link is not access control, so each workspace declares the IBMT
 * roles allowed to open it. The platform admin role (the founder) may open all
 * of them; every admin action is written to the audit log by the backend.
 * The data rules remain the real boundary — this stops a wrong screen from
 * being reachable at all.
 */
export default function WorkspaceGuard({ allow = [], adminOnly = false, children }) {
  const { user, isLoadingAuth } = useAuth();
  const { role } = useIBMT();
  const { t } = useT();

  if (isLoadingAuth) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto h-7 w-7 animate-spin rounded-full border-4 border-border border-t-navy" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const isAdmin = user.role === 'admin';
  const permitted = isAdmin ? true : !adminOnly && allow.includes(role);

  if (!permitted) {
    return (
      <section className="mx-auto w-full max-w-xl py-10">
        <div className="ibmt-panel px-6 py-8 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-md bg-muted text-navy">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-heading text-xl font-semibold text-navy">{t('states.permissionTitle')}</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{t('states.permissionBody')}</p>
          {allow.includes('landlord') && (
            <Link
              to="/rent/join"
              className="ibmt-tap mt-4 inline-flex items-center gap-2 text-[13px] font-semibold text-gold-ink hover:underline"
            >
              Hujasajili nyumba bado? Jisajili hapa
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      </section>
    );
  }

  return children;
}