import { NavLink, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import { useIBMT } from '@/api/IBMTContext';
import { navForRole, resolveNavRole, SHARED_NAV, MODULE_LABEL, ROLE_ICON } from '@/config/roleNav';
import BrandMark from '@/components/ibmt/BrandMark';
import { cn } from '@/lib/utils';

/**
 * Role navigation. Hiding a link is interface behaviour only — the backend
 * enforces what a role and jurisdiction may actually reach.
 */
export default function Sidebar({ mobileOpen, onClose }) {
  const { t } = useT();
  const { role, isMock } = useIBMT();
  const location = useLocation();
  const navRole = resolveNavRole(role);
  const sections = navForRole(role);
  const RoleIcon = ROLE_ICON[navRole] || ROLE_ICON.public;
  const sharedItems = SHARED_NAV.filter((item) => !item.adminOnly || navRole === 'admin');
  const current = `${location.pathname}${location.search}`;

  const isActive = (to) => {
    if (to.includes('?')) return current === to;
    if (location.pathname !== to) return false;
    return !location.search.includes('tab=');
  };

  const nav = (
    <nav aria-label={t('nav.menu')} className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-4 py-4">
        <BrandMark tone="light" compact />
        {onClose && (
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="ibmt-tap-square inline-flex items-center justify-center rounded-md text-sidebar-foreground/70 lg:hidden">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="mx-4 mb-4 rounded-md border border-sidebar-border bg-sidebar-accent px-3 py-2">
        <p className="flex items-center gap-2 text-[12px] font-semibold text-sidebar-foreground">
          <RoleIcon className="h-3.5 w-3.5 text-sidebar-primary" aria-hidden="true" />
          {t(`roles.${role}`)}
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/60">{t(MODULE_LABEL[role] || 'brand.name')}</p>
        {isMock && <p className="mt-2 text-[10px] leading-snug text-sidebar-primary">{t('roles.demoOnly')}</p>}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {sections.map((section) => (
          <div key={section.section} className="mb-4">
            <p className="ibmt-kicker px-3 pb-2 text-sidebar-foreground/50">{t(section.section)}</p>
            <ul className="space-y-1">
              {section.items.map(({ to, labelKey, Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={onClose}
                    aria-current={isActive(to) ? 'page' : undefined}
                    className={cn(
                      'ibmt-tap flex items-center gap-3 rounded-md px-3 text-[13px] font-medium transition-colors',
                      isActive(to) ? 'bg-sidebar-accent text-sidebar-foreground' : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', isActive(to) ? 'text-sidebar-primary' : 'opacity-70')} aria-hidden="true" />
                    <span className="truncate">{t(labelKey)}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-sidebar-border px-2 py-3">
        <ul className="space-y-1">
          {sharedItems.map(({ to, labelKey, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                onClick={onClose}
                className={cn(
                  'ibmt-tap flex items-center gap-3 rounded-md px-3 text-[12px] transition-colors',
                  isActive(to) ? 'bg-sidebar-accent text-sidebar-foreground' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
                <span className="truncate">{t(labelKey)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );

  return (
    <>
      <aside className="ibmt-no-print sticky top-0 hidden h-screen w-[264px] shrink-0 bg-sidebar lg:block">{nav}</aside>

      {mobileOpen && (
        <div className="ibmt-no-print fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-deep/50" onClick={onClose} aria-hidden="true" />
          <div className="absolute left-0 top-0 h-full w-[280px] max-w-[85vw] bg-sidebar shadow-xl">{nav}</div>
        </div>
      )}
    </>
  );
}