import Field, { CONTROL_CLASS } from '@/components/ibmt/Field';
import { cn } from '@/lib/utils';

const ONLY_DIGITS = (value) => value.replace(/[^0-9]/g, '');
const money = (value) => Number(value || 0).toLocaleString('en-US');

const CHOICE = 'flex items-center gap-3 rounded-md border border-border px-3 py-2 text-[13px]';

/**
 * The money and the people, asked in the two questions a landlord can answer in
 * one look: is the rent the same, and does every unit already have a tenant?
 * Only when the answer is "no" does the form ask unit by unit.
 */
export default function JoinRent({ units, sameRent, allTenants, onSameRent, onAllRent, onAllTenants, onUnitRent, onUnitOccupied }) {
  const multi = units.length > 1;

  return (
    <div className="space-y-5">
      {multi && (
        <fieldset>
          <legend className="ibmt-label mb-2">Je, kodi ni sawa kwa uniti zote?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className={CHOICE}>
              <input type="radio" name="sameRent" checked={sameRent} onChange={() => onSameRent(true)} />
              Ndiyo, kodi ni sawa
            </label>
            <label className={CHOICE}>
              <input type="radio" name="sameRent" checked={!sameRent} onChange={() => onSameRent(false)} />
              Hapana, kila uniti na kodi yake
            </label>
          </div>
        </fieldset>
      )}

      {(!multi || sameRent) && (
        <Field label="Kodi ya mwezi (TZS)" required hint={multi ? 'Itatumika kwa uniti zote' : 'Namba kamili, bila desimali'}>
          {(props) => (
            <input
              {...props}
              className={cn(CONTROL_CLASS, 'ibmt-num')}
              inputMode="numeric"
              value={units[0]?.rent_amount || ''}
              onChange={(event) => onAllRent(ONLY_DIGITS(event.target.value))}
            />
          )}
        </Field>
      )}

      {multi && (
        <fieldset>
          <legend className="ibmt-label mb-2">Je, uniti zote zina wapangaji?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className={CHOICE}>
              <input type="radio" name="allTenants" checked={allTenants} onChange={() => onAllTenants(true)} />
              Ndiyo, zote zina wapangaji
            </label>
            <label className={CHOICE}>
              <input type="radio" name="allTenants" checked={!allTenants} onChange={() => onAllTenants(false)} />
              Hapana, zitaje zilizo na wapangaji
            </label>
          </div>
        </fieldset>
      )}

      <div className="divide-y divide-border rounded-md border border-border">
        {units.map((unit, index) => (
          <div key={index} className="flex flex-wrap items-center gap-3 px-3 py-3">
            <p className="min-w-0 flex-1 text-[13px] font-medium">{unit.name || `Uniti ${index + 1}`}</p>

            {multi && !sameRent ? (
              <input
                aria-label={`Kodi ya ${unit.name || `uniti ${index + 1}`}`}
                className={cn(CONTROL_CLASS, 'ibmt-num w-32 text-right')}
                inputMode="numeric"
                placeholder="TZS"
                value={unit.rent_amount}
                onChange={(event) => onUnitRent(index, ONLY_DIGITS(event.target.value))}
              />
            ) : (
              <span className="ibmt-num text-[12px] text-muted-foreground">{money(units[0]?.rent_amount)} TZS</span>
            )}

            {(!multi || !allTenants) && (
              <label className="flex items-center gap-2 text-[12px]">
                <input
                  type="checkbox"
                  checked={unit.occupied}
                  onChange={(event) => onUnitOccupied(index, event.target.checked)}
                />
                Ina mpangaji
              </label>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}