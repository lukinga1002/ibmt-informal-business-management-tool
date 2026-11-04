import {
  Banknote,
  Building2,
  CircleHelp,
  ClipboardList,
  Download,
  FileText,
  Gauge,
  HardHat,
  House,
  KeyRound,
  Landmark,
  Lock,
  MapPin,
  Scale,
  Search,
  ShieldCheck,
  Signature,
  Table2,
  UserCheck,
} from 'lucide-react';

/**
 * Role navigation — rental pilot only.
 *
 * Keys are the canonical IBMT role values (what the session reports), so the
 * sidebar cannot drift from the access rules. `admin` is the platform admin
 * role, used for the founder's account only.
 *
 * Parked workspaces (operator, consumer, events council, TRA, property manager)
 * have no navigation entry at all; their routes are gated separately and show
 * the notice page if opened directly.
 */
export const ROLE_NAV = {
  landlord: [
    {
      section: 'nav.workspace',
      items: [
        { to: '/rent/landlord', labelKey: 'nav.dashboard', Icon: Gauge },
        { to: '/rent/landlord/portfolio', labelKey: 'nav.portfolio', Icon: Building2 },
        { to: '/rent/landlord/register', labelKey: 'nav.register', Icon: House },
        { to: '/rent/landlord/migrate', labelKey: 'nav.tenancies', Icon: ClipboardList },
        { to: '/rent/landlord/tenancies', labelKey: 'nav.tenancies', Icon: FileText },
        { to: '/rent/landlord/leases', labelKey: 'nav.lease', Icon: Signature },
        { to: '/rent/landlord/money', labelKey: 'nav.money', Icon: Banknote },
        { to: '/rent/landlord/mandates', labelKey: 'nav.mandates', Icon: KeyRound },
        { to: '/rent/landlord/listings', labelKey: 'nav.listings', Icon: ClipboardList },
        { to: '/rent/landlord/tax', labelKey: 'nav.taxStatement', Icon: FileText },
        { to: '/rent/landlord/cases', labelKey: 'nav.cases', Icon: Scale },
      ],
    },
  ],
  tenant: [
    {
      section: 'nav.workspace',
      items: [
        { to: '/rent/tenant', labelKey: 'nav.dashboard', Icon: Gauge },
        { to: '/rent/tenant/find', labelKey: 'nav.find', Icon: Search },
        { to: '/rent/tenant/lease', labelKey: 'nav.lease', Icon: Signature },
        { to: '/rent/tenant/pay', labelKey: 'nav.recordPayment', Icon: Banknote },
        { to: '/rent/tenant/register', labelKey: 'nav.register', Icon: House },
        { to: '/rent/tenant/cases', labelKey: 'nav.evidence', Icon: FileText },
      ],
    },
  ],
  agent: [
    {
      section: 'nav.workspace',
      items: [
        { to: '/rent/agent', labelKey: 'nav.dashboard', Icon: Gauge },
        { to: '/rent/agent?tab=mandates', labelKey: 'term.mandate', Icon: ClipboardList },
        { to: '/rent/agent?tab=commissions', labelKey: 'term.commission', Icon: Banknote },
        { to: '/rent/assisted/register', labelKey: 'nav.register', Icon: House },
      ],
    },
  ],
  mtaa_officer: [
    {
      section: 'nav.workspace',
      items: [
        { to: '/rent/ward', labelKey: 'nav.dashboard', Icon: MapPin },
        { to: '/rent/ward/verification', labelKey: 'nav.verify', Icon: ShieldCheck },
      ],
    },
  ],
  council_official: [
    {
      section: 'nav.workspace',
      items: [
        { to: '/rent/council', labelKey: 'nav.dashboard', Icon: Landmark },
        { to: '/rent/council/agents', labelKey: 'nav.agentLicences', Icon: KeyRound },
        { to: '/verify', labelKey: 'nav.verify', Icon: ShieldCheck },
      ],
    },
  ],
  district_commissioner: [
    {
      section: 'nav.workspace',
      items: [{ to: '/rent/district', labelKey: 'nav.oversight', Icon: Landmark }],
    },
  ],
  regional_commissioner: [
    {
      section: 'nav.workspace',
      items: [{ to: '/rent/region', labelKey: 'nav.oversight', Icon: Table2 }],
    },
  ],
  admin: [
    {
      section: 'nav.workspace',
      items: [
        { to: '/rent/landlord', labelKey: 'nav.portfolio', Icon: Building2 },
        { to: '/rent/tenant', labelKey: 'nav.tenancies', Icon: House },
        { to: '/rent/agent', labelKey: 'roles.agent', Icon: HardHat },
        { to: '/rent/ward', labelKey: 'roles.mtaa_officer', Icon: MapPin },
        { to: '/rent/council', labelKey: 'nav.oversight', Icon: Landmark },
      ],
    },
  ],
  public: [
    {
      section: 'nav.workspace',
      items: [
        { to: '/', labelKey: 'nav.home', Icon: Landmark },
        { to: '/verify', labelKey: 'nav.verify', Icon: ShieldCheck },
        { to: '/documents', labelKey: 'nav.documents', Icon: Download },
        { to: '/ussd', labelKey: 'nav.ussd', Icon: KeyRound },
        { to: '/data-rights', labelKey: 'nav.dataRights', Icon: Lock },
      ],
    },
  ],
};

/** Old role keys still found in demonstration fixtures and stored data. */
const ROLE_ALIASES = {
  ward: 'mtaa_officer',
  council: 'council_official',
  manager: 'public',
  operator: 'public',
  consumer: 'public',
  tra: 'public',
  ward_reporter: 'mtaa_officer',
  district_official: 'public',
};

export function resolveNavRole(role) {
  if (ROLE_NAV[role]) return role;
  const alias = ROLE_ALIASES[role];
  return alias && ROLE_NAV[alias] ? alias : 'public';
}

export function navForRole(role) {
  return ROLE_NAV[resolveNavRole(role)];
}

/** Cross-role links. Delivery notes are for the platform admin only. */
export const SHARED_NAV = [
  { to: '/verify', labelKey: 'nav.verify', Icon: Search },
  { to: '/documents', labelKey: 'nav.documents', Icon: Download },
  { to: '/data-rights', labelKey: 'nav.dataRights', Icon: CircleHelp },
  { to: '/handover', labelKey: 'nav.handover', Icon: ClipboardList, adminOnly: true },
];

export const ROLE_LIST = Object.keys(ROLE_NAV);

export const MODULE_LABEL = Object.fromEntries(ROLE_LIST.map((role) => [role, 'brand.rent']));

export const ROLE_ICON = {
  landlord: Building2,
  tenant: House,
  agent: HardHat,
  mtaa_officer: MapPin,
  council_official: Landmark,
  district_commissioner: Landmark,
  regional_commissioner: Table2,
  admin: UserCheck,
  public: CircleHelp,
};