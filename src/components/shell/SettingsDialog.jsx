import { Link } from 'react-router-dom';
import { useT } from '@/i18n/I18nContext';
import { useIBMT } from '@/api/IBMTContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TextInput } from '@/components/ibmt/Field';
import Notice from '@/components/ibmt/Notice';
import LanguageSwitch from '@/components/ibmt/LanguageSwitch';

const SCENARIOS = ['happy', 'empty', 'error', 'offline', 'conflict', 'expired', 'forbidden'];

/** Presentation and integration settings for this device. Never a credential store. */
export default function SettingsDialog({ open, onOpenChange }) {
  const { t } = useT();
  const { mode, setMode, apiBase, setApiBase, scenario, setScenario, theme, setTheme, sessionState, isMock } = useIBMT();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
          <DialogDescription>{t('settings.sessionBody')}</DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          <section>
            <h3 className="ibmt-kicker">{t('settings.integration')}</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {['mock', 'api'].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  aria-pressed={mode === value}
                  className={`ibmt-tap flex flex-col items-start gap-1 rounded-md border px-4 py-3 text-left transition-colors ${
                    mode === value ? 'border-navy bg-navy/[0.05]' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <span className="text-[13px] font-semibold text-navy">{value === 'mock' ? t('settings.mockMode') : t('settings.apiMode')}</span>
                  <span className="text-[11px] leading-snug text-muted-foreground">
                    {value === 'mock' ? t('common.demonstrationNote') : t('roles.external')}
                  </span>
                </button>
              ))}
            </div>

            <label htmlFor="api-base" className="ibmt-label mt-4 block">
              {t('settings.apiBase')}
            </label>
            <TextInput
              id="api-base"
              className="ibmt-num mt-2"
              value={apiBase}
              onChange={(event) => setApiBase(event.target.value)}
              spellCheck={false}
              autoComplete="off"
            />
            <p className="ibmt-hint mt-2">{t('settings.apiBaseHint')}</p>

            {isMock && (
              <>
                <label htmlFor="scenario" className="ibmt-label mt-4 block">
                  {t('settings.scenario')}
                </label>
                <Select value={scenario} onValueChange={setScenario}>
                  <SelectTrigger id="scenario" className="ibmt-tap mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCENARIOS.map((value) => (
                      <SelectItem key={value} value={value} className="text-[13px]">
                        {t(`settings.scenario${value.charAt(0).toUpperCase()}${value.slice(1)}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </section>

          <section>
            <h3 className="ibmt-kicker">{t('settings.appearance')}</h3>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                {['light', 'dark'].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    aria-pressed={theme === value}
                    className={`ibmt-tap rounded-md border px-4 text-[13px] font-medium ${
                      theme === value ? 'border-navy bg-navy text-primary-foreground' : 'border-border text-muted-foreground'
                    }`}
                  >
                    {value === 'light' ? t('settings.light') : t('settings.dark')}
                  </button>
                ))}
              </div>
              <LanguageSwitch />
            </div>
          </section>

          <section>
            <h3 className="ibmt-kicker">{t('settings.session')}</h3>
            <p className="mt-2 text-[12px] text-muted-foreground">
              {isMock ? t('roles.demoOnly') : `${t('settings.session')}: ${sessionState}`}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link to="/data-rights" onClick={() => onOpenChange(false)} className="text-[12px] font-semibold text-navy underline decoration-gold underline-offset-4">
                {t('nav.dataRights')}
              </Link>
              <Link to="/handover" onClick={() => onOpenChange(false)} className="text-[12px] font-semibold text-navy underline decoration-gold underline-offset-4">
                {t('nav.handover')}
              </Link>
              <Link to="/documents" onClick={() => onOpenChange(false)} className="text-[12px] font-semibold text-navy underline decoration-gold underline-offset-4">
                {t('nav.documents')}
              </Link>
            </div>
          </section>

          <Notice tone="privacy">{t('common.nativeReview')}</Notice>
        </div>
      </DialogContent>
    </Dialog>
  );
}