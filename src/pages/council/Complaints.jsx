import { useState } from 'react';
import { Send } from 'lucide-react';
import { useT } from '@/i18n/I18nContext';
import { useIBMTMutation, useIBMTQuery } from '@/api/hooks';
import PageHeader from '@/components/ibmt/PageHeader';
import SectionCard from '@/components/ibmt/SectionCard';
import DataState from '@/components/ibmt/DataState';
import StatusBadge from '@/components/ibmt/StatusBadge';
import Notice from '@/components/ibmt/Notice';
import Timeline from '@/components/ibmt/Timeline';
import Field, { TextArea, FormStatus } from '@/components/ibmt/Field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate } from '@/lib/format';

export default function CouncilComplaints() {
  const { t, tt, lang } = useT();
  const complaints = useIBMTQuery('listComplaints', { limit: 8 });
  const reply = useIBMTMutation('replyComplaint');
  const [target, setTarget] = useState(null);
  const [body, setBody] = useState('');

  const send = async () => {
    if (!body || body.trim().length < 6) return;
    const result = await reply.run({ id: target.id, body: body.trim() });
    if (result) {
      setTarget(null);
      setBody('');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('brand.events')}
        title={t('term.complaint')}
        lede={t('policy.noAutoPublication')}
        meta={[{ label: t('policy.noSurveillance') }]}
      />

      <Notice tone="privacy">{t('policy.noSurveillance')}</Notice>

      <SectionCard title={t('term.complaint')} description={t('policy.noAutoPublication')}>
        <DataState query={complaints} skeleton="lines" emptyTitle={t('states.emptyTitle')} emptyBody={t('states.emptyBody')}>
          {() => (
            <ul className="space-y-4">
              {complaints.items.map((complaint) => (
                <li key={complaint.id} className="rounded-md border border-border px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-semibold text-navy">{tt(complaint.subject)}</p>
                      <p className="ibmt-num text-[11px] text-muted-foreground">
                        {complaint.reference} · {formatDate(complaint.filed_at, lang)} · {complaint.visibility}
                      </p>
                    </div>
                    <StatusBadge status={complaint.status} />
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{tt(complaint.body)}</p>
                  {complaint.replies?.length > 0 && (
                    <div className="mt-3">
                      <Timeline
                        dense
                        items={complaint.replies.map((entry) => ({
                          id: entry.id,
                          label: `${tt(entry.by)} — ${tt(entry.body)}`,
                          at: formatDate(entry.at, lang),
                          status: 'success',
                        }))}
                      />
                    </div>
                  )}
                  <Button type="button" variant="outline" size="sm" className="ibmt-tap mt-3 gap-2" onClick={() => setTarget(complaint)}>
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('common.reply')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DataState>
      </SectionCard>

      <Dialog open={Boolean(target)} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.reply')}</DialogTitle>
            <DialogDescription>{t('policy.noAutoEnforcement')}</DialogDescription>
          </DialogHeader>
          <Field label={t('common.details')} required>
            {(props) => <TextArea {...props} value={body} onChange={(event) => setBody(event.target.value)} />}
          </Field>
          <FormStatus mutation={reply} className="mt-3" />
          <DialogFooter className="mt-4 gap-2">
            <Button type="button" variant="outline" className="ibmt-tap" onClick={() => setTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" className="ibmt-tap bg-navy font-semibold text-primary-foreground hover:bg-navy-deep" onClick={send} disabled={reply.saving}>
              {reply.saving ? t('common.working') : t('common.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}