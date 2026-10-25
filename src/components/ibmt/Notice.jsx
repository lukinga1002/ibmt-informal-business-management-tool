import { CircleAlert, Info, Lock, Scale, ShieldCheck, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

const TONES = {
  neutral: { Icon: Info, wrap: 'border-border bg-muted/40 text-foreground' },
  policy: { Icon: Scale, wrap: 'border-navy/25 bg-navy/[0.04] text-navy-ink' },
  privacy: { Icon: Lock, wrap: 'border-navy/20 bg-cream/60 text-navy-ink' },
  caution: { Icon: CircleAlert, wrap: 'border-warning/30 bg-warning/[0.07] text-warning' },
  danger: { Icon: TriangleAlert, wrap: 'border-destructive/30 bg-destructive/[0.06] text-destructive' },
  positive: { Icon: ShieldCheck, wrap: 'border-success/30 bg-success/[0.06] text-success' },
};

/**
 * Statement callout. Used for policy statements, privacy notes and cautions:
 * one sentence, an icon, and never colour alone as the only signal.
 */
export default function Notice({ tone = 'neutral', title, children, className, action }) {
  const { Icon, wrap } = TONES[tone] || TONES.neutral;

  return (
    <div className={cn('flex gap-3 rounded-md border px-4 py-3', wrap, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 text-[13px] leading-relaxed">
        {title && <p className="font-heading text-[13px] font-semibold">{title}</p>}
        <div className={cn(title && 'mt-1')}>{children}</div>
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}