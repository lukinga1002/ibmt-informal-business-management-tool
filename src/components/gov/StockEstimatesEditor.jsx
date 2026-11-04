import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ibmt/Field';
import { useT } from '@/i18n/I18nContext';

/**
 * Estimated stock per ward. An input, not a calculation: a row without a stated
 * source is refused by the server, so no figure can appear from nowhere.
 */
export default function StockEstimatesEditor({ rows, onChange }) {
  const { tt } = useT();

  const update = (index, patch) => {
    onChange(rows.map((row, position) => (position === index ? { ...row, ...patch } : row)));
  };

  return (
    <div className="space-y-3">
      {rows.length === 0 && (
        <p className="ibmt-hint">
          {tt({ en: 'No ward estimate has been entered yet. Estimated stock stays blank until one is.', sw: 'Hakuna makisio ya kata yaliyoingizwa. Makisio yatabaki wazi hadi yataingizwa.' })}
        </p>
      )}

      {rows.map((row, index) => (
        <div key={`${row.ward}-${index}`} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_7rem_2fr_auto]">
          <TextInput
            aria-label={tt({ en: 'Ward', sw: 'Kata' })}
            placeholder={tt({ en: 'Ward', sw: 'Kata' })}
            value={row.ward}
            onChange={(event) => update(index, { ward: event.target.value })}
          />
          <TextInput
            aria-label={tt({ en: 'Estimated units', sw: 'Vitengo vinavyokadiriwa' })}
            placeholder={tt({ en: 'Units', sw: 'Vitengo' })}
            inputMode="numeric"
            value={row.units}
            onChange={(event) => update(index, { units: event.target.value.replace(/[^0-9]/g, '') })}
          />
          <TextInput
            aria-label={tt({ en: 'Source of the figure', sw: 'Chanzo cha takwimu' })}
            placeholder={tt({ en: 'Source of the figure (required)', sw: 'Chanzo cha takwimu (lazima)' })}
            value={row.source}
            onChange={(event) => update(index, { source: event.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={tt({ en: 'Remove this estimate', sw: 'Ondoa makisio haya' })}
            onClick={() => onChange(rows.filter((_, position) => position !== index))}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...rows, { ward: '', units: '', source: '', as_of: '' }])}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {tt({ en: 'Add a ward estimate', sw: 'Ongeza makisio ya kata' })}
      </Button>
    </div>
  );
}