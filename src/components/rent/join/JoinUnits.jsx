import Field, { SelectControl, TextInput } from '@/components/ibmt/Field';

const COUNTS = Array.from({ length: 20 }, (_, index) => index + 1);

/**
 * How many units and what each one is called. The name is what the landlord
 * will pick from later, so it has to be a name they recognise.
 */
export default function JoinUnits({ units, onCount, onRename }) {
  return (
    <div className="space-y-4">
      <Field label="Unazo uniti ngapi?" required hint="Kila uniti linapata namba yake ya kumbukumbu. Upeo ni 20 kwa usajili mmoja.">
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
            label={`Jina la uniti ${index + 1}`}
            required
            hint={index === 0 ? 'Jina unalolitambua, mf. Nyumba ya mbele, Chumba A1' : undefined}
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