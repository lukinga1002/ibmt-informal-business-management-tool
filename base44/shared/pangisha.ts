// The unit is resolved by each caller's authorized unit ID or tenant invitation.
export function rentalDetails(input) {
  const occupation = typeof input.occupation === 'string' ? input.occupation.trim() : '';
  const email = typeof input.tenant_email === 'string' ? input.tenant_email.trim() : '';
  const phone = String(input.tenant_phone || '').replace(/[\s-]/g, '').match(/^(?:\+?255|0)([67]\d{8})$/);
  const positiveInteger = value => /^(?:[1-9]\d*)$/.test(String(value)) && Number.isSafeInteger(Number(value));
  const errors: Record<string, string> = {};
  if (!occupation || occupation.length > 150) errors.occupation = 'Andika kazi au shughuli ya mpangaji (hadi herufi 150).';
  if (!phone) errors.tenant_phone = 'Andika namba ya simu ya Tanzania, mfano 0712 345 678.';
  if (!positiveInteger(input.rent_amount)) errors.rent_amount = 'Andika kodi ya mwezi kwa shilingi kamili.';
  if (!positiveInteger(input.contract_months)) errors.contract_months = 'Andika muda wa mkataba kwa miezi kamili.';
  if ((input.tenant_email != null && typeof input.tenant_email !== 'string') || (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))) {
    errors.tenant_email = 'Sahihisha barua pepe au iache wazi.';
  }
  return { errors, values: { occupation, tenant_phone: phone && '0' + phone[1], tenant_email: email || null,
    rent_amount: Number(input.rent_amount), contract_months: Number(input.contract_months) } };
}
