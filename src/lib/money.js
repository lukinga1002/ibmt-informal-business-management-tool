/** Shared wording and small helpers for the R7 money screens. */

export const SIM_NOTICE = {
  en: 'Simulation. The partner is a mock, no money moves, and no real provider is connected.',
  sw: 'Majaribio. Mshirika ni wa kubuni, hakuna fedha zinazohamia, na hakuna mtoa huduma halisi aliyeunganishwa.',
};

export const STATE_LABEL = {
  initiated: { en: 'Initiated', sw: 'Imeanzishwa' },
  pending: { en: 'Pending', sw: 'Inasubiri' },
  succeeded: { en: 'Succeeded', sw: 'Imefanikiwa' },
  failed: { en: 'Failed', sw: 'Imeshindikana' },
  reversed: { en: 'Reversed', sw: 'Imerudishwa' },
};

export const STAGE_OPTION = [
  { value: 'stage1_record_only', label: { en: 'Stage 1 — record only', sw: 'Hatua 1 — kumbukumbu pekee' } },
  { value: 'stage2_partner', label: { en: 'Stage 2 — partner collects (simulation)', sw: 'Hatua 2 — mshirika hukusanya (majaribio)' } },
  { value: 'stage3_tax_split', label: { en: 'Stage 3 — tax split (simulation)', sw: 'Hatua 3 — mgawanyo wa kodi (majaribio)' } },
];

export const SPLIT_LABEL = {
  tax: { en: 'Tax (withheld)', sw: 'Kodi (inayozuiliwa)' },
  agent_commission: { en: 'Agent commission', sw: 'Kamisheni ya wakala' },
  service_fee: { en: 'Landlord service fee', sw: 'Ada ya huduma kwa mmiliki' },
  landlord_remainder: { en: 'Remainder to landlord', sw: 'Salio kwa mmiliki' },
};

export const ACCOUNT_LABEL = {
  partner_clearing: { en: 'Partner clearing', sw: 'Malipo kwa mshirika' },
  tenant_funds: { en: 'Tenant funds held', sw: 'Fedha za mpangaji' },
  tax_payable: { en: 'Tax payable', sw: 'Kodi inayodaiwa' },
  agent_payable: { en: 'Agent commission payable', sw: 'Kamisheni inayodaiwa' },
  platform_income: { en: 'IBMT fee income', sw: 'Mapato ya ada ya IBMT' },
  landlord_payable: { en: 'Landlord payable', sw: 'Inayodaiwa kwa mmiliki' },
  deposit_payable: { en: 'Deposit payable', sw: 'Amana inayodaiwa' },
  refunds: { en: 'Refunds issued', sw: 'Marejesho' },
};

export const ALERT_LABEL = {
  signature_invalid: { en: 'Signature did not verify', sw: 'Sahihi haikuthibitika' },
  duplicate_callback: { en: 'Duplicate reference', sw: 'Namba imerudiwa' },
  status_mismatch: { en: 'Status mismatch', sw: 'Hali haitalingani' },
  amount_mismatch: { en: 'Amount mismatch', sw: 'Kiasi hakitalingani' },
  state_violation: { en: 'Illegal state move', sw: 'Mabadiliko ya hali haramu' },
  rate_limited: { en: 'Rate limited', sw: 'Maombi mengi mno' },
};

/*
 * Stage 3 TEST inputs used by the admin demo switch on the money engine. A live
 * run never sends them: it reads the active PolicyRule row, where the agent
 * commission is one month's rent and the tax rate is absent in Stage 1.
 */
export const PLACEHOLDER_RATES = { tax_rate: 0.1, service_fee_rate: 0.01, commission_share: 1, commission_cap: 0 };

/** A file the browser writes from exactly what the server returned. */
export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}