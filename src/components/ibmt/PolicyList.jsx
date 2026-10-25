import { useT } from '@/i18n/I18nContext';
import Notice from './Notice';
import { cn } from '@/lib/utils';

/**
 * Reflects policy statements exactly as confirmed, in the reader's language.
 * The interface states policy; it does not decide it.
 */
export default function PolicyList({ keys = [], title, tone = 'policy', className, columns = 1 }) {
  const { t } = useT();

  return (
    <div className={cn('space-y-3', className)}>
      {title && <h3 className="ibmt-kicker">{title}</h3>}
      <div className={cn('grid gap-3', columns === 2 && 'md:grid-cols-2')}>
        {keys.map((key) => (
          <Notice key={key} tone={tone}>
            {t(key)}
          </Notice>
        ))}
      </div>
    </div>
  );
}