import { useEffect, useState } from 'react';
import { useT } from '@/i18n/I18nContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TextArea, CONTROL_CLASS } from './Field';
import { cn } from '@/lib/utils';

/**
 * Decision dialog for anything consequential. A reason is mandatory whenever
 * the product requires one, and the same dialog renders the backend's
 * field-level error if the request is refused.
 */
export default function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  reasonLabel,
  placeholder,
  tone = 'default',
  requireReason = true,
  busy = false,
  serverError,
  fieldError,
  onConfirm,
}) {
  const { t } = useT();
  const [reason, setReason] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!open) {
      setReason('');
      setLocalError('');
    }
  }, [open]);

  const submit = () => {
    if (requireReason && reason.trim().length < 6) {
      setLocalError(t('common.reasonRequired'));
      return;
    }
    setLocalError('');
    onConfirm(reason.trim());
  };

  const destructive = tone === 'danger';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {requireReason && (
          <div className="mt-2">
            <label htmlFor="reason-input" className="ibmt-label">
              {reasonLabel || t('common.reason')} <span className="text-destructive">*</span>
            </label>
            <TextArea
              id="reason-input"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={placeholder}
              invalid={Boolean(localError || fieldError)}
              className="mt-2"
            />
            {(localError || fieldError) && (
              <p role="alert" className="mt-2 text-[12px] font-medium text-destructive">
                {localError || fieldError}
              </p>
            )}
            <p className="ibmt-hint mt-2">{t('common.reasonRequired')}</p>
          </div>
        )}

        {serverError && (
          <p role="alert" className="mt-2 rounded-md border border-destructive/30 bg-destructive/[0.06] px-3 py-2 text-[12px] text-destructive">
            {serverError}
          </p>
        )}

        <DialogFooter className="mt-4 gap-2">
          <Button type="button" variant="outline" className="ibmt-tap" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            className={cn('ibmt-tap font-semibold', destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-navy text-primary-foreground hover:bg-navy-deep')}
            onClick={submit}
            disabled={busy}
          >
            {busy ? t('common.working') : confirmLabel || t('common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Plain confirmation for actions that carry no reason requirement. */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, busy, onConfirm, tone = 'default' }) {
  const { t } = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2">
          <Button type="button" variant="outline" className="ibmt-tap" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            className={cn('ibmt-tap font-semibold', tone === 'danger' ? 'bg-destructive text-destructive-foreground' : 'bg-navy text-primary-foreground hover:bg-navy-deep')}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? t('common.working') : confirmLabel || t('common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { CONTROL_CLASS };