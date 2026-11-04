import {
  Banknote,
  CalendarClock,
  CalendarX,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleSlash,
  CircleX,
  Clock,
  Eye,
  FileText,
  Globe,
  Lock,
  Receipt,
  Scale,
  Send,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  Wallet,
} from 'lucide-react';

/**
 * Status vocabulary.
 *
 * Every status is a word + an icon + a tone so that meaning never depends on
 * colour alone. Keys mirror the status codes proposed in the API contract.
 */
export const STATUS = {
  draft: { Icon: FileText, tone: 'muted' },
  issued: { Icon: Receipt, tone: 'navy' },
  awaiting_confirmation: { Icon: Clock, tone: 'gold' },
  confirmed: { Icon: CircleCheck, tone: 'success' },
  pending: { Icon: Clock, tone: 'gold' },
  submitted: { Icon: Send, tone: 'info' },
  in_review: { Icon: Eye, tone: 'gold' },
  queued: { Icon: Eye, tone: 'gold' },
  approved: { Icon: ShieldCheck, tone: 'success' },
  rejected: { Icon: CircleX, tone: 'danger' },
  queried: { Icon: CircleAlert, tone: 'warning' },
  expired: { Icon: CalendarX, tone: 'danger' },
  active: { Icon: ShieldCheck, tone: 'success' },
  inactive: { Icon: CircleSlash, tone: 'muted' },
  verified: { Icon: ShieldCheck, tone: 'success' },
  unverified: { Icon: ShieldAlert, tone: 'warning' },
  disputed: { Icon: Scale, tone: 'danger' },
  scheduled: { Icon: CalendarClock, tone: 'navy' },
  completed: { Icon: CircleCheck, tone: 'success' },
  satisfied: { Icon: CircleCheck, tone: 'success' },
  settled: { Icon: Banknote, tone: 'success' },
  withheld: { Icon: Wallet, tone: 'gold' },
  remitted: { Icon: Send, tone: 'success' },
  paid: { Icon: CircleCheck, tone: 'success' },
  unpaid: { Icon: Circle, tone: 'muted' },
  due: { Icon: Clock, tone: 'gold' },
  partial: { Icon: CircleDashed, tone: 'warning' },
  overdue: { Icon: TriangleAlert, tone: 'danger' },
  held: { Icon: Lock, tone: 'navy' },
  released: { Icon: Send, tone: 'success' },
  not_connected: { Icon: CircleAlert, tone: 'muted' },
  human_review: { Icon: Eye, tone: 'warning' },
  not_effective: { Icon: Globe, tone: 'muted' },
  signed: { Icon: FileText, tone: 'success' },
  awaiting_signature: { Icon: Clock, tone: 'gold' },
  awaiting_tenant: { Icon: Clock, tone: 'gold' },
  terminated: { Icon: CircleX, tone: 'danger' },
  amended: { Icon: FileText, tone: 'info' },
  recorded: { Icon: Receipt, tone: 'navy' },
  unconfirmed: { Icon: CircleDashed, tone: 'muted' },
  not_due: { Icon: CalendarClock, tone: 'muted' },
  pending_confirmation: { Icon: Clock, tone: 'gold' },
};

const TONE_CLASS = {
  navy: 'bg-navy/8 text-navy border-navy/25',
  gold: 'bg-gold-soft text-gold-ink border-gold/45',
  success: 'bg-success/10 text-success border-success/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  danger: 'bg-destructive/10 text-destructive border-destructive/30',
  info: 'bg-info/10 text-info border-info/30',
  muted: 'bg-muted text-muted-foreground border-border',
};

export function statusMeta(code) {
  return STATUS[code] || { Icon: Circle, tone: 'muted' };
}

export function toneClass(tone) {
  return TONE_CLASS[tone] || TONE_CLASS.muted;
}