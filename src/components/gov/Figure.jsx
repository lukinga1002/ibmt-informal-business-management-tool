import { useT } from '@/i18n/I18nContext';

/** A suppressed cell is a word, never a zero that reads as a count. */
export function Suppressed({ label }) {
  const { tt } = useT();
  return <span className="text-[12px] italic text-muted-foreground">{tt(label)}</span>;
}

/** A figure, or the suppression wording when the server withheld the cell. */
export default function Figure({ value, label, suffix = '' }) {
  if (value === null || value === undefined) return <Suppressed label={label} />;
  return (
    <span className="ibmt-num">
      {Number(value).toLocaleString('en-US')}
      {suffix}
    </span>
  );
}