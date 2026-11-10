/**
 * R3 switches. Both are deliberately OFF.
 *
 * TENANT_INITIATED_REGISTRATION stays off until the council is in compulsory
 * mode. Ask before changing it.
 *
 * AMNESTY_NOTICE_ENABLED stays off. Only TRA can grant an amnesty, so no
 * screen may show or imply one until that is confirmed in writing.
 */
export const TENANT_INITIATED_REGISTRATION = false;
export const AMNESTY_NOTICE_ENABLED = false;

/** Pilot councils and their wards. Registration is only open inside them. */
export const PILOT_COUNCILS = [
  {
    council_id: '6aeb0119b746308e2106ef11',
    name: 'Kinondoni Municipal Council',
    region: 'Dar es Salaam',
    district: 'Kinondoni',
    wards: ['Msasani', 'Mikocheni', 'Kijitonyama', 'Magomeni', 'Mwananyamala'],
  },
  {
    council_id: '6aeb0119b746308e2106ef12',
    name: 'Ubungo Municipal Council',
    region: 'Dar es Salaam',
    district: 'Ubungo',
    wards: ['Sinza', 'Manzese', 'Kimara', 'Mbezi'],
  },
];

/** Region first, then the districts inside it. */
export const REGIONS = [
  {
    region: 'Dar es Salaam',
    districts: ['Kinondoni', 'Ubungo', 'Ilala', 'Temeke', 'Kigamboni'],
  },
  {
    region: 'Pwani',
    districts: ['Bagamoyo', 'Kisarawe'],
  },
];

export const EVIDENCE_OPTIONS = [
  { kind: 'title_deed', sw: 'Hati ya umiliki', en: 'Title deed' },
  { kind: 'residential_licence', sw: 'Leseni ya makazi', en: 'Residential licence' },
  { kind: 'offer_letter', sw: 'Barua ya mgao', en: 'Offer letter' },
  { kind: 'mtaa_letter', sw: 'Barua ya Mtaa', en: 'Mtaa letter' },
  { kind: 'inheritance_letter', sw: 'Barua ya urithi', en: 'Inheritance letter' },
];

export const DISCLAIMER = {
  sw: 'Usajili huu si uthibitisho wa umiliki.',
  en: 'Registration does not prove ownership.',
};

export function councilForWard(ward) {
  return PILOT_COUNCILS.find((council) => council.wards.includes(ward)) || PILOT_COUNCILS[0];
}