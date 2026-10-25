import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useState } from 'react';
import BrandMark from '@/components/ibmt/BrandMark';
import LanguageSwitch from '@/components/ibmt/LanguageSwitch';
import DemoBadge from '@/components/ibmt/DemoBadge';
import { useT } from '@/i18n/I18nContext';
import { useIBMT } from '@/api/IBMTContext';

const LINKS = [
  { to: '/verify', labelKey: 'nav.verify' },
  { to: '/ussd', labelKey: 'nav.ussd' },
  { to: '/documents', labelKey: 'nav.documents' },
  { to: '/data-rights', labelKey: 'nav.dataRights' },
];

/** Header used by every public screen. */
export default function PublicTopBar() {
  const { t } = useT();
  const { isMock, setRole } = useIBMT();
  const [open, setOpen] = useState(false);
  // Entering a workspace in demonstration mode adopts that role, so the entry
  // point opens what the visitor chose to look at.
  const enterAs = (role) => {
    if (isMock) setRole(role);
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1440px] items-center gap-4 px-4 py-3 sm:px-6 lg:px-10">
        <BrandMark />
        {isMock && <DemoBadge variant="chip" className="hidden md:inline-flex" />}
        <nav aria-label={t('nav.menu')} className="ml-auto hidden items-center gap-1 lg:flex">
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="ibmt-tap inline-flex items-center rounded-md px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-2">
          <LanguageSwitch />
          <Link
            to="/operator"
            onClick={() => enterAs('operator')}
            className="ibmt-tap hidden items-center rounded-md bg-navy px-4 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-navy-deep sm:inline-flex"
          >
            {t('nav.openWorkspace')}
          </Link>
          <button
            type="button"
            aria-expanded={open}
            aria-label={t('nav.menu')}
            onClick={() => setOpen((value) => !value)}
            className="ibmt-tap-square inline-flex items-center justify-center rounded-md border border-border text-muted-foreground lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label={t('nav.menu')} className="border-t border-border bg-card px-4 py-2 lg:hidden">
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className="ibmt-tap flex items-center rounded-md px-2 text-sm font-medium text-muted-foreground"
            >
              {t(link.labelKey)}
            </Link>
          ))}
          <Link to="/operator" onClick={() => enterAs('operator')} className="ibmt-tap flex items-center rounded-md px-2 text-sm font-semibold text-navy">
            {t('nav.openWorkspace')}
          </Link>
        </nav>
      )}
    </header>
  );
}