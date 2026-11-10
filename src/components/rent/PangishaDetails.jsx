import Field, { TextInput } from '@/components/ibmt/Field';

export default function PangishaDetails({ form, set }) {
  return <>
    <Field label="Kazi au shughuli ya mpangaji" required hint="Mfano: mwalimu, mfanyabiashara, mwanafunzi au hana ajira">
      {props => <TextInput {...props} maxLength={150} value={form.occupation} onChange={e => set({ occupation: e.target.value })} />}
    </Field>
    <Field label="Namba ya simu ya mpangaji" required hint="Mfano: 0712 345 678">
      {props => <TextInput {...props} type="tel" value={form.tenant_phone} onChange={e => set({ tenant_phone: e.target.value })} />}
    </Field>
    <Field label="Barua pepe (si lazima)">
      {props => <TextInput {...props} type="email" maxLength={254} value={form.tenant_email} onChange={e => set({ tenant_email: e.target.value })} />}
    </Field>
    <Field label="Muda wa mkataba (miezi)" required>
      {props => <TextInput {...props} type="number" min="1" step="1" value={form.contract_months} onChange={e => set({ contract_months: e.target.value })} />}
    </Field>
  </>;
}
