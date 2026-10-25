import { useT } from '@/i18n/I18nContext';
import { useIBMT } from '@/api/IBMTContext';
import { ROLE_LIST } from '@/config/roleNav';
import { defaultLangForRole } from '@/lib/prefs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Demonstration-only role switch, visibly labelled as a demonstration.
 * In API mode the role comes from the IBMT session and this control is absent.
 */
export default function RoleSwitcher() {
  const { t, setLang } = useT();
  const { isMock, demoRole, setRole } = useIBMT();

  if (!isMock) return null;

  // Each role reads its own language first: Swahili for operators and tenants,
  // English for council and TRA.
  const change = (role) => {
    setRole(role);
    setLang(defaultLangForRole(role));
  };

  return (
    <div className="flex items-center gap-2">
      <span className="sr-only">{t('roles.switch')}</span>
      <Select value={demoRole} onValueChange={change}>
        <SelectTrigger className="ibmt-tap w-[168px] border-dashed border-gold-ink/50 text-[12px]" aria-label={t('roles.switch')}>
          <SelectValue placeholder={t('roles.label')} />
        </SelectTrigger>
        <SelectContent>
          {ROLE_LIST.map((role) => (
            <SelectItem key={role} value={role} className="text-[13px]">
              {t(`roles.${role}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}