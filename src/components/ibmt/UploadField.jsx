import { useRef, useState } from 'react';
import { Paperclip, Lock } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import { useIBMTMutation } from '@/api/hooks';
import { useIBMT } from '@/api/IBMTContext';
import { Button } from '@/components/ui/button';
import DemoBadge from './DemoBadge';
import { cn } from '@/lib/utils';

/**
 * Evidence upload.
 *
 * The file itself belongs to the IBMT backend: the interface sends it to the
 * backend's private upload operation and keeps only the reference it returns.
 * Nothing is stored in this layer, and no public link is produced.
 */
export default function UploadField({ label, hint, purpose, accept = '.pdf,.jpg,.jpeg,.png', onUploaded, className }) {
  const { t } = useT();
  const { isMock } = useIBMT();
  const upload = useIBMTMutation('uploadEvidence');
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);

  const choose = () => inputRef.current?.click();

  const handleChange = async (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    const result = await upload.run({ bytes: selected.size, content_type: selected.type, label: selected.name, purpose, file: selected });
    if (result && onUploaded) onUploaded(result, selected);
    event.target.value = '';
  };

  return (
    <div className={cn('rounded-md border border-dashed border-border bg-muted/30 px-4 py-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold">{label || t('common.upload')}</p>
          {hint && <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{hint}</p>}
          <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3" aria-hidden="true" />
            {isMock ? t('common.demonstration') : t('rent.uploadEvidence')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={inputRef} type="file" accept={accept} className="sr-only" onChange={handleChange} />
          <Button type="button" variant="outline" className="ibmt-tap gap-2" onClick={choose} disabled={upload.saving}>
            <Paperclip className="h-4 w-4" aria-hidden="true" />
            {upload.saving ? t('common.working') : t('common.upload')}
          </Button>
        </div>
      </div>

      {file && (
        <p className="ibmt-num mt-3 truncate text-[12px] text-muted-foreground">
          {file.name} · {(file.size / 1024).toFixed(0)} KB
        </p>
      )}

      {upload.status === 'success' && upload.result && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-success">
          <span>{t('states.successTitle')}</span>
          <span className="ibmt-num text-muted-foreground">{upload.result.file_id}</span>
          <span className="text-muted-foreground">{t('parked.storedPrivately')}</span>
          {isMock && <DemoBadge variant="chip" />}
        </div>
      )}

      {upload.status === 'error' && (
        <p role="alert" className="mt-3 text-[12px] font-medium text-destructive">
          {upload.error?.message || t('states.errorBody')}
        </p>
      )}
    </div>
  );
}