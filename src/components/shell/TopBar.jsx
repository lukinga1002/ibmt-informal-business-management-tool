import { useState } from 'react';
import { Bell, Check, Menu, Moon, Settings, Sun } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import { useIBMT } from '@/api/IBMTContext';
import { useIBMTMutation, useIBMTQuery } from '@/api/hooks';
import LanguageSwitch from '@/components/ibmt/LanguageSwitch';
import RoleSwitcher from './RoleSwitcher';
import SettingsDialog from './SettingsDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/format';

function NotificationPanel({ lang, t, tt }) {
  const query = useIBMTQuery('listNotifications', { limit: 6 });
  const markRead = useIBMTMutation('markNotificationRead');
  const unread = (query.items || []).filter((item) => !item.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t('settings.notifications')}
          className="ibmt-tap-square relative inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unread > 0 && (
            <span className="ibmt-num absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-navy px-1 text-[10px] font-semibold text-primary-foreground">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="font-heading text-[13px] font-semibold text-navy">{t('settings.notifications')}</p>
        </div>
        <ul className="max-h-[360px] overflow-y-auto">
          {query.kind === 'loading' && <li className="px-4 py-6 text-[12px] text-muted-foreground">{t('states.loadingTitle')}</li>}
          {query.kind === 'empty' && <li className="px-4 py-6 text-[12px] text-muted-foreground">{t('states.emptyBody')}</li>}
          {['error', 'offline', 'permission', 'session'].includes(query.kind) && (
            <li className="px-4 py-6 text-[12px] text-muted-foreground">{t(query.error?.stateKeys?.body || 'states.errorBody')}</li>
          )}
          {query.kind === 'ready' &&
            query.items.map((item) => (
              <li key={item.id} className={cn('border-b border-border/70 last:border-b-0', item.read ? 'bg-card' : 'bg-cream/40')}>
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] font-semibold text-navy">{tt(item.title)}</p>
                    {!item.read && (
                      <button
                        type="button"
                        onClick={() => markRead.run({ id: item.id })}
                        className="shrink-0 text-muted-foreground hover:text-navy"
                        aria-label={t('common.confirm')}
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{tt(item.body)}</p>
                  <p className="ibmt-num mt-1 text-[10px] text-muted-foreground">{formatDateTime(item.created_at, lang)}</p>
                </div>
              </li>
            ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export default function TopBar({ onOpenNav }) {
  const { t, tt, lang } = useT();
  const { session, sessionState, role, theme, setTheme } = useIBMT();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="ibmt-no-print sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-10">
        <button
          type="button"
          onClick={onOpenNav}
          aria-label={t('nav.menu')}
          className="ibmt-tap-square inline-flex items-center justify-center rounded-md border border-border text-muted-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-navy">
            {sessionState === 'ready' ? tt(session?.display_name) : t(`roles.${role}`)}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {session?.jurisdiction?.wards?.length
              ? `${t('term.jurisdiction')}: ${session.jurisdiction.wards.join(' · ')}`
              : t(`roles.${role}`)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <LanguageSwitch />
          </div>
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? t('settings.light') : t('settings.dark')}
            className="ibmt-tap-square inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
          </button>
          <NotificationPanel lang={lang} t={t} tt={tt} />
          <Button type="button" variant="outline" className="ibmt-tap-square px-0" aria-label={t('nav.settings')} onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4" aria-hidden="true" />
          </Button>
          <RoleSwitcher />
        </div>
      </div>

      <div className="border-t border-border px-4 py-2 sm:px-6 lg:hidden">
        <LanguageSwitch />
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  );
}