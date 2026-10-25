import {
  Banknote,
  Building2,
  CircleHelp,
  ClipboardList,
  Download,
  Eye,
  FileDown,
  FileText,
  Gauge,
  HardHat,
  House,
  IdCard,
  KeyRound,
  Landmark,
  ListChecks,
  Lock,
  MapPin,
  MessagesSquare,
  Receipt,
  Scale,
  ScrollText,
  Search,
  ShieldCheck,
  Signature,
  Stamp,
  Store,
  Table2,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';

/**
 * Role navigation map — one source used by the shell and by the handover page.
 * `Icon` entries must be real lucide exports; a missing one breaks the screen.
 */
export const ROLE_NAV = {
  operator: [
    {
      section: 'nav.workspace',
      items: [
        { to: '/operator', labelKey: 'nav.dashboard', Icon: Gauge },
        { to: '/operator/onboarding', labelKey: 'nav.onboarding', Icon: Store },
        { to: '/operator/receipts', labelKey: 'nav.receipts', Icon: Receipt },
      ],
    },
    {
      section: 'nav.money',
      items: [
        { to: '/operator/money', labelKey: 'nav.money', Icon: Wallet },
        { to: '/operator/operations', labelKey: 'nav.operations', Icon: ClipboardList },
      ],
    },
    { section: 'nav.settings', items: [{ to: '/operator/settings', labelKey: 'nav.settings', Icon: Lock }] },
  ],
  consumer: [
    {
      section: 'nav.workspace',
      items: [
        { to: '/consumer', labelKey: 'nav.dashboard', Icon: Gauge },
        { to: '/consumer/cases', labelKey: 'term.complaint', Icon: MessagesSquare },
        { to: '/consumer/contributions', labelKey: 'nav.contributions', Icon: Users },
        { to: '/consumer/settings', labelKey: 'nav.settings', Icon: Lock },
      ],
    },
  ],
  council: [
    {
      section: 'brand.events',
      items: [
        { to: '/council', labelKey: 'nav.dashboard', Icon: Gauge },
        { to: '/council/permits', labelKey: 'nav.permits', Icon: Stamp },
        { to: '/council/complaints', labelKey: 'term.complaint', Icon: MessagesSquare },
      ],
    },
    {
      section: 'brand.rent',
      items: [{ to: '/rent/council', labelKey: 'nav.oversight', Icon: Building2 }],
    },
  ],
  tra: [
    {
      section: 'brand.events',
      items: [
        { to: '/tra', labelKey: 'nav.dashboard', Icon: Gauge },
        { to: '/tra/access', labelKey: 'nav.access', Icon: Eye },
      ],
    },
    { section: 'brand.rent', items: [{ to: '/rent/tra', labelKey: 'nav.oversight', Icon: Table2 }] },
  ],
  landlord: [
    {
      section: 'nav.workspace',
      items: [
        { to: '/rent/landlord', labelKey: 'nav.dashboard', Icon: Gauge },
        { to: '/rent/landlord/portfolio', labelKey: 'nav.portfolio', Icon: Building2 },
        { to: '/rent/landlord/tenancies', labelKey: 'nav.tenancies', Icon: ScrollText },
        { to: '/rent/landlord/money', labelKey: 'nav.money', Icon: Banknote },
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
        { to: '/rent/tenant/pay', labelKey: 'nav.pay', Icon: Banknote },
        { to: '/rent/tenant/register', labelKey: 'nav.register', Icon: IdCard },
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
      ],
    },
  ],
  manager: [
    { section: 'nav.workspace', items: [{ to: '/rent/manager', labelKey: 'nav.dashboard', Icon: Gauge }] },
  ],
  ward: [
    { section: 'nav.workspace', items: [{ to: '/rent/ward', labelKey: 'nav.dashboard', Icon: MapPin }] },
  ],
  public: [
    {
      section: 'nav.workspace',
      items: [
        { to: '/', labelKey: 'nav.home', Icon: Landmark },
        { to: '/verify', labelKey: 'nav.verify', Icon: ShieldCheck },
        { to: '/ussd', labelKey: 'nav.ussd', Icon: KeyRound },
        { to: '/documents', labelKey: 'nav.documents', Icon: FileDown },
        { to: '/data-rights', labelKey: 'nav.dataRights', Icon: Lock },
      ],
    },
  ],
};

/** Cross-role links offered to everybody at the foot of the sidebar. */
export const SHARED_NAV = [
  { to: '/verify', labelKey: 'nav.verify', Icon: Search },
  { to: '/documents', labelKey: 'nav.documents', Icon: Download },
  { to: '/handover', labelKey: 'nav.handover', Icon: ListChecks },
  { to: '/data-rights', labelKey: 'nav.dataRights', Icon: CircleHelp },
];

export const ROLE_LIST = Object.keys(ROLE_NAV);

export const MODULE_LABEL = {
  operator: 'brand.events',
  consumer: 'brand.events',
  council: 'brand.events',
  tra: 'brand.events',
  landlord: 'brand.rent',
  tenant: 'brand.rent',
  agent: 'brand.rent',
  manager: 'brand.rent',
  ward: 'brand.rent',
  public: 'brand.name',
};

export const ROLE_ICON = {
  operator: Store,
  consumer: Users,
  council: Landmark,
  tra: Table2,
  landlord: Building2,
  tenant: House,
  agent: HardHat,
  manager: UserCheck,
  ward: MapPin,
  public: CircleHelp,
};