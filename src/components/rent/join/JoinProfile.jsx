import Field, { SelectControl, TextInput } from '@/components/ibmt/Field';
import { PILOT_COUNCILS } from '@/config/r3';

/** Where the landlord works and where the house stands. One district, one ward. */
export default function JoinProfile({ form, set }) {
  const choice = PILOT_COUNCILS.find((item) => item.council_id === form.council_id) || PILOT_COUNCILS[0];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Jina lako" required className="sm:col-span-2">
        {(props) => <TextInput {...props} value={form.landlord_name} onChange={(event) => set({ landlord_name: event.target.value })} />}
      </Field>

      <Field label="Wilaya unayofanyia kazi" required>
        {(props) => (
          <SelectControl
            {...props}
            value={form.council_id}
            onChange={(event) => {
              const next = PILOT_COUNCILS.find((item) => item.council_id === event.target.value) || PILOT_COUNCILS[0];
              set({ council_id: next.council_id, district: next.district, ward: next.wards[0] });
            }}
          >
            {PILOT_COUNCILS.map((item) => (
              <option key={item.council_id} value={item.council_id}>
                {item.district}
              </option>
            ))}
          </SelectControl>
        )}
      </Field>

      <Field label="Kata" required>
        {(props) => (
          <SelectControl {...props} value={form.ward} onChange={(event) => set({ ward: event.target.value })}>
            {choice.wards.map((ward) => (
              <option key={ward} value={ward}>
                {ward}
              </option>
            ))}
          </SelectControl>
        )}
      </Field>

      <Field label="Jina la mtaa" required hint="Mtaa ambamo nyumba ipo">
        {(props) => <TextInput {...props} value={form.street} onChange={(event) => set({ street: event.target.value })} />}
      </Field>

      <Field label="Namba ya nyumba" required>
        {(props) => (
          <TextInput
            {...props}
            className={`${props.className} ibmt-num`}
            value={form.house_no}
            onChange={(event) => set({ house_no: event.target.value })}
          />
        )}
      </Field>
    </div>
  );
}