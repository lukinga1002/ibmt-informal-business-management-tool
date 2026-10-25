import { useId } from 'react';
import { cn } from '@/lib/utils';

const CONTROL =
  'ibmt-tap w-full rounded-md border border-input bg-card px-3 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus-visible:border-ring';

/**
 * Labelled control with inline field errors. Frontend validation improves
 * usability only — the backend validates every action again, and its
 * field-level errors are rendered here in the same place.
 */
export default function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
  htmlFor,
  as = 'div',
  ...controlProps
}) {
  const generatedId = useId();
  const id = htmlFor || generatedId;
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;

  const control =
    typeof children === 'function'
      ? children({ id, describedBy, invalid: Boolean(error), className: cn(CONTROL, error && 'border-destructive') })
      : children;

  const Wrapper = as;

  return (
    <Wrapper className={cn('flex flex-col gap-2', className)}>
      {label && (
        <label htmlFor={id} className="ibmt-label">
          {label}
          {required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}
          {required && <span className="sr-only">{' '}</span>}
        </label>
      )}
      {control ||
        (as === 'div' ? (
          <input id={id} aria-describedby={describedBy} aria-invalid={Boolean(error)} className={cn(CONTROL, error && 'border-destructive')} {...controlProps} />
        ) : null)}
      {hint && (
        <p id={`${id}-hint`} className="ibmt-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-[12px] font-medium text-destructive">
          {error}
        </p>
      )}
    </Wrapper>
  );
}

export function TextArea({ id, describedBy, invalid, ...props }) {
  return (
    <textarea
      id={id}
      aria-describedby={describedBy}
      aria-invalid={Boolean(invalid)}
      rows={4}
      className={cn(CONTROL, 'py-3 leading-relaxed', invalid && 'border-destructive')}
      {...props}
    />
  );
}

export function SelectControl({ id, describedBy, invalid, children, ...props }) {
  return (
    <select
      id={id}
      aria-describedby={describedBy}
      aria-invalid={Boolean(invalid)}
      className={cn(CONTROL, invalid && 'border-destructive')}
      {...props}
    >
      {children}
    </select>
  );
}

export function TextInput({ id, describedBy, invalid, ...props }) {
  return (
    <input
      id={id}
      aria-describedby={describedBy}
      aria-invalid={Boolean(invalid)}
      className={cn(CONTROL, invalid && 'border-destructive')}
      {...props}
    />
  );
}

export const CONTROL_CLASS = CONTROL;