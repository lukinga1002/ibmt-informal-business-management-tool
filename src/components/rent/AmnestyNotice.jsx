import Notice from '@/components/ibmt/Notice';
import { useT } from '@/i18n/I18nContext';

/**
 * Amnesty notice — built, deliberately never rendered.
 *
 * Only TRA can grant an amnesty. This component is not mounted anywhere until
 * that grant is confirmed in writing; see src/config/r3.js.
 */
export default function AmnestyNotice() {
  const { t } = useT();
  return (
    <Notice tone="caution" title={t('parked.amnestyTitle')}>
      <p>{t('parked.amnestyBody')}</p>
    </Notice>
  );
}