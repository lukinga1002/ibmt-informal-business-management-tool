import Field, { SelectControl, TextInput } from '@/components/ibmt/Field';
import { PILOT_COUNCILS, REGIONS } from '@/config/r3';

/** Where the landlord works and where the house stands: region, district, ward. */
export default function JoinProfile({ form, set, councils = PILOT_COUNCILS }) {
  const choice = councils.find((item) => item.council_id === form.council_id) || councils[0];
  const region = form.region || choice.region;
  const districts = councils.filter((item) => item.region === region);
  const regions = [...new Set([...REGIONS.map((item) => item.region), ...councils.map((item) => item.region)])]
    .filter((name) => councils.some((item) => item.region === name));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Jina lako" required className="sm:col-span-2">
        {(props) => <TextInput {...props} value={form.landlord_name} onChange={(event) => set({ landlord_name: event.target.value })} />}
      </Field>

      <Field label="Namba ya simu" required hint="Mfano 0712345678">
        {(props) => (
          <TextInput
            {...props}
            className={`${props.className} ibmt-num`}
            inputMode="tel"
            value={form.phone}
            onChange={(event) => set({ phone: event.target.value.replace(/[^0-9+]/g, '').slice(0, 13) })}
          />
        )}
      </Field>

      <Field label="Barua pepe" hint="Si lazima. Ukiitoa, tutaitumia kukutumia taarifa.">
        {(props) => (
          <TextInput {...props} type="email" value={form.email} onChange={(event) => set({ email: event.target.value })} />
        )}
      </Field>

      <Field label="Mkoa" required>
        {(props) => (
          <SelectControl
            {...props}
            value={region}
            onChange={(event) => {
              const next =
                councils.find((item) => item.region === event.target.value) || councils[0];
              set({ region: next.region, council_id: next.council_id, district: next.district, ward: next.wards[0] });
            }}
          >
            {regions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </SelectControl>
        )}
      </Field>

      <Field label="Wilaya unayofanyia kazi" required>
        {(props) => (
          <SelectControl
            {...props}
            value={form.council_id}
            onChange={(event) => {
              const next = districts.find((item) => item.council_id === event.target.value) || districts[0];
              set({ council_id: next.council_id, district: next.district, ward: next.wards[0] });
            }}
          >
            {districts.map((item) => (
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
