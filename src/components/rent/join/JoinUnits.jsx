import Field, { SelectControl, TextInput } from '@/components/ibmt/Field';
import { useT } from '@/i18n/I18nContext';

const COUNTS = Array.from({ length: 20 }, (_, index) => index + 1);

/**
 * How many units and what each one is called. The name is what the landlord
 * will pick from later, so it has to be a name they recognise.
 */
export default function JoinUnits({ units, onCount, onRename }) {
  const { t } = useT();
  return (
    <div className="space-y-4">
      <Field label={t('joinForm.unitCount')} required hint={t('joinForm.unitCountHint')}>
        {(props) => (
          <SelectControl {...props} value={String(units.length)} onChange={(event) => onCount(Number(event.target.value))}>
            {COUNTS.map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </SelectControl>
        )}
      </Field>

      <div className="space-y-3">
        {units.map((unit, index) => (
          <Field
            key={index}
            label={t('joinForm.unitName', { n: index + 1 })}
            required
            hint={index === 0 ? t('joinForm.unitNameHint') : undefined}
          >
            {(props) => (
              <TextInput {...props} value={unit.name} onChange={(event) => onRename(index, event.target.value)} />
            )}
          </Field>
        ))}
      </div>
    </div>
  );
}