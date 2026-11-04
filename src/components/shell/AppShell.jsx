import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useT } from '@/i18n/I18nContext';
import { useIBMT } from '@/api/IBMTContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import StateBanner from '@/components/ibmt/StateBanner';

/**
 * Shared shell for every signed-in workspace: one navigation, one identity
 * presentation, one set of banners. Module 1 and Module 2 are the same product.
 */
export default function AppShell() {
  const { t } = useT();
  const { isMock } = useIBMT();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <StateBanner />
        <TopBar onOpenNav={() => setMobileNavOpen(true)} />
        <main className="flex-1">
          <div className="ibmt-page">
            <Outlet />
          </div>
        </main>
        <footer className="ibmt-no-print border-t border-border px-4 py-4 text-center text-[11px] text-muted-foreground sm:px-6 lg:px-10">
          {t('brand.name')} · {t('brand.tagline')} · {t('common.nativeReview')}
        </footer>
      </div>
    </div>
  );
}