import { cn } from '@/lib/utils';

/**
 * Responsive table: a real table from md upward, stacked records below it, so a
 * record stays usable on a 375px screen.
 */
export default function DataTable({ columns, rows, rowKey = 'id', onRowClick, caption, className, dense = false }) {
  const keyOf = (row, index) => row[rowKey] ?? index;

  return (
    <div className={cn('w-full', className)}>
      <table className="hidden w-full border-collapse text-left md:table">
        {caption && <caption className="pb-2 text-left text-[12px] text-muted-foreground">{caption}</caption>}
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'ibmt-kicker px-3 pb-2 pt-1 font-semibold',
                  column.align === 'right' && 'text-right',
                  column.hideBelow && `hidden ${column.hideBelow}:table-cell`,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={keyOf(row, index)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn('border-b border-border/70 last:border-b-0', onRowClick && 'cursor-pointer hover:bg-muted/40')}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'px-3 align-top',
                    dense ? 'py-2' : 'py-3',
                    'text-[13px]',
                    column.align === 'right' && 'text-right',
                    column.className,
                    column.hideBelow && `hidden ${column.hideBelow}:table-cell`,
                  )}
                >
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="space-y-3 md:hidden">
        {rows.map((row, index) => (
          <li
            key={keyOf(row, index)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn('rounded-lg border border-border bg-card p-4', onRowClick && 'cursor-pointer')}
          >
            <dl className="space-y-2">
              {columns.map((column) => (
                <div key={column.key} className="flex items-start justify-between gap-3">
                  <dt className="ibmt-kicker shrink-0 pt-0.5">{column.header}</dt>
                  <dd className={cn('min-w-0 text-right text-[13px]', column.className)}>
                    {column.render ? column.render(row) : row[column.key]}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}