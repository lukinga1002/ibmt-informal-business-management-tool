/**
 * The standard lease template, its stamp-duty placeholder and the labels the
 * rent screens must carry. One source of truth: the builder preview, the saved
 * lease and every receipt read their wording from here.
 */

export const LEASE_TEMPLATE_VERSION = 'lease-2026.1-draft';

export const LEASE_TEMPLATE_LABEL = {
  en: 'DRAFT — pending legal review',
  sw: 'RASIMU — inasubiri mapitio ya kisheria',
};

/** Placeholder only. Stage 1 never calculates or claims a stamp-duty amount. */
export const STAMP_DUTY_PLACEHOLDER = {
  status: 'to_be_confirmed',
  label: {
    en: 'Stamp duty — to be confirmed',
    sw: 'Stampu ya mkataba — itathibitishwa',
  },
  note: {
    en: 'No amount is shown and none is calculated. The figure appears only after the councils and TRA confirm the rule.',
    sw: 'Hakuna kiasi kinachoonyeshwa na hakuna kinachohesabiwa. Kiasi kitaonekana baada ya halmashauri na TRA kuthibitisha kanuni.',
  },
};

export const RENT_RECORD_DISCLAIMER = {
  sw: 'Rekodi ya kodi — si risiti ya kodi ya serikali (EFD/VFD).',
  en: 'Rent record — not a fiscal EFD/VFD receipt.',
};

export const TAX_INDICATIVE_DISCLAIMER = {
  sw: 'Makadirio tu — si tathmini rasmi ya TRA.',
  en: 'Indicative only — not an official TRA assessment.',
};

const FREQUENCY_LABEL = {
  monthly: { en: 'month', sw: 'mwezi' },
  quarterly: { en: 'three months', sw: 'miezi mitatu' },
};

const METHOD_NOTE = {
  en: 'Money moves directly between the parties. IBMT records the rent and never holds the funds.',
  sw: 'Fedha zinapita moja kwa moja kati ya wapangaji na wamiliki. IBMT inarekodi kodi tu, haishikilii fedha.',
};

export function wholeAmount(value) {
  return Math.round(Number(value) || 0);
}

export function moneyLabel(amount) {
  return `TZS ${wholeAmount(amount).toLocaleString('en-US')}`;
}

/**
 * Builds the bilingual clauses of a lease from the figures the landlord chose.
 * The same function builds the preview and the stored lease, so what a party
 * reads before signing is exactly what is saved.
 */
export function buildLeaseTerms(input) {
  const rent = wholeAmount(input.rent_amount);
  const frequency = input.frequency === 'quarterly' ? 'quarterly' : 'monthly';
  const depositMonths = Math.min(Math.max(Math.round(Number(input.deposit_months) || 0), 0), 6);
  const noticeDays = Math.min(Math.max(Math.round(Number(input.notice_days) || 30), 7), 180);
  const dueDay = Math.min(Math.max(Math.round(Number(input.due_day) || 1), 1), 28);
  const months = frequency === 'quarterly' ? 3 : 1;
  const depositAmount = depositMonths * rent;
  const unitRef = String(input.unit_ref || '');
  const ward = String(input.ward || '');
  const mtaa = String(input.mtaa || '');
  const landlordName = String(input.landlord_name || 'Mmiliki');
  const tenantName = String(input.tenant_name || 'Mpangaji');
  const startDate = String(input.start_date || '');
  const endDate = String(input.end_date || '');
  const repairs = String(input.repair_duties || '').trim();
  const houseRules = String(input.house_rules || '').trim();

  const clauses = [
    {
      en: `Parties. This lease is between ${landlordName} (landlord) and ${tenantName} (tenant) for unit ${unitRef}, ward ${ward}, mtaa ${mtaa}.`,
      sw: `Wahusika. Mkataba huu ni kati ya ${landlordName} (mmiliki) na ${tenantName} (mpangaji) kwa nyumba ${unitRef}, kata ya ${ward}, mtaa wa ${mtaa}.`,
    },
    {
      en: `Rent. The agreed rent is ${moneyLabel(rent)} per ${FREQUENCY_LABEL[frequency].en}, due on day ${dueDay} of each period.`,
      sw: `Kodi. Kodi iliyokubaliwa ni ${moneyLabel(rent)} kwa ${FREQUENCY_LABEL[frequency].sw}, inayolipwa tarehe ${dueDay} ya kila kipindi.`,
    },
    {
      en: `Term. The tenancy runs from ${startDate} to ${endDate}.`,
      sw: `Muda. Tenancy inaanza ${startDate} hadi ${endDate}.`,
    },
    {
      en: `Deposit. A deposit of ${moneyLabel(depositAmount)} (${depositMonths} × rent) is held by the landlord, not by IBMT.`,
      sw: `Amana. Amana ya ${moneyLabel(depositAmount)} (kodi ${depositMonths} ×) inashikiliwa na mmiliki, si IBMT.`,
    },
    {
      en: `Rent records. Every payment is entered by one party and confirmed by the other before it counts. A confirmed record produces a rent record document; it is not a fiscal EFD/VFD receipt.`,
      sw: `Rekodi za kodi. Kila malipo yanaingizwa na upande mmoja na kuthibitishwa na upande mwingine kabla ya kuhesabiwa. Rekodi iliyothibitishwa hutoa hati ya rekodi ya kodi; si risiti ya kodi ya serikali (EFD/VFD).`,
    },
    {
      en: `Payment method. ${METHOD_NOTE.en}`,
      sw: `Njia ya malipo. ${METHOD_NOTE.sw}`,
    },
    {
      en: `Repairs. Structural repairs, the roof, water supply to the plot and the electrical supply are the landlord's duty. Small day-to-day repairs and damage caused by the tenant are the tenant's duty.${repairs ? ` Also agreed: ${repairs}` : ''}`,
      sw: `Matengenezo. Matengenezo ya kimuundo, paa, maji hadi kiwanja na umeme mkuu ni jukumu la mmiliki. Matengenezo madogo ya kila siku na uharibifu unaosababishwa na mpangaji ni jukumu la mpangaji.${repairs ? ` Pia wamekubaliana: ${repairs}` : ''}`,
    },
    {
      en: `Notice. Either party ends this tenancy by giving ${noticeDays} days written notice through IBMT.`,
      sw: `Notisi. Upande wowote unaweza kumaliza tenancy kwa kutoa notisi ya siku ${noticeDays} kwa maandishi kupitia IBMT.`,
    },
    {
      en: `House rules.${houseRules ? ` ${houseRules}` : ' Quiet hours apply from 22:00 to 06:00. Waste is placed at the collection point, not in shared corridors.'}`,
      sw: `Kanuni za nyumba.${houseRules ? ` ${houseRules}` : ' Saa za utulivu ni kuanzia 22:00 hadi 06:00. Taka huwekwa kwenye sehemu ya ukusanyaji, si kwenye korido za pamoja.'}`,
    },
    {
      en: `Stamp duty. To be confirmed. This lease shows no stamp-duty amount because the rule has not been confirmed by the councils and TRA.`,
      sw: `Stampu ya mkataba. Itathibitishwa. Mkataba huu hauonyeshi kiasi cha stampu kwa sababu kanuni bado haijathibitishwa na halmashauri na TRA.`,
    },
    {
      en: `Template. This lease was built from standard template ${LEASE_TEMPLATE_VERSION}, currently marked ${LEASE_TEMPLATE_LABEL.en}.`,
      sw: `Kiolezo. Mkataba huu umeandaliwa kwa kiolezo cha kawaida ${LEASE_TEMPLATE_VERSION}, ambacho kwa sasa kimeandikwa ${LEASE_TEMPLATE_LABEL.sw}.`,
    },
  ];

  return {
    rent_amount: rent,
    frequency,
    months_per_period: months,
    deposit_months: depositMonths,
    deposit_amount: depositAmount,
    notice_days: noticeDays,
    due_day: dueDay,
    start_date: startDate,
    end_date: endDate,
    repair_duties: repairs || null,
    house_rules: houseRules || null,
    clauses,
    template_version: LEASE_TEMPLATE_VERSION,
  };
}

/** YYYY-MM of a date, used as the rent period a record covers. */
export function periodOf(isoDate) {
  const date = String(isoDate || '').slice(0, 7);
  return /^\d{4}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 7);
}

/** The instant the rent for a period is due, from the lease's due day. */
export function dueDateOf(periodMonth, dueDay) {
  const day = Math.min(Math.max(Math.round(Number(dueDay) || 1), 1), 28);
  return `${periodMonth}-${String(day).padStart(2, '0')}`;
}