import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { callFn, fnError } from "@/lib/r4";
import SectionCard from "@/components/ibmt/SectionCard";
import Field from "@/components/ibmt/Field";
import { Button } from "@/components/ui/button";

export default function Stage2CouncilPanel({ councilId, admin = false }) {
  const [list, setList] = useState([]),
    [selected, setSelected] = useState(""),
    [data, setData] = useState(null),
    [result, setResult] = useState(null);
  const [day, setDay] = useState(new Date().toISOString().slice(0, 10)),
    [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const id = councilId || selected;
  useEffect(() => {
    if (admin)
      base44.entities.Council.list("name", 500)
        .then((p) => setList(Array.isArray(p) ? p : p.items || []))
        .catch((e) => setError(fnError(e)));
  }, [admin]);
  useEffect(() => {
    setData(null);
    if (id)
      callFn("stage2Council", { action: "read", council_id: id })
        .then(setData)
        .catch((e) => setError(fnError(e)));
  }, [id]);
  async function run(action) {
    setBusy(true);
    setError("");
    try {
      setResult(
        await callFn("stage2Council", { action, council_id: id, day, month }),
      );
      setData(
        await callFn("stage2Council", { action: "read", council_id: id }),
      );
    } catch (e) {
      setError(fnError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <SectionCard
      title="Ada, bili na ankara / Council fees, bills and invoices"
      description="Simulation / Majaribio"
    >
      <p>
        Ada ya huduma ya halmashauri si kodi ya majengo wala kodi ya mapato. /
        The council service fee is not property rate and not income tax.
      </p>
      {admin && (
        <label>
          Halmashauri / Council{" "}
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">—</option>
            {list.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {data && (
        <div className="space-y-4">
          {admin && (
            <div className="flex flex-wrap gap-3">
              <Field
                label="Siku / Settlement date"
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
              <Button disabled={busy} onClick={() => run("batch")}>
                Unda bili / Batch bill
              </Button>
              <Field
                label="Mwezi / Invoice month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
              <Button disabled={busy} onClick={() => run("invoice")}>
                Ankara / Invoice
              </Button>
              <Button disabled={busy} onClick={() => run("reconcile")}>
                Linganisha / Reconcile
              </Button>
            </div>
          )}
          <p>
            {data.settlements.some((s) => s.fee_status !== "in_force")
              ? "Ada inayopendekezwa (majaribio) / Proposed fee (simulation)"
              : "Simulation / Majaribio"}
          </p>
          <h3>Ada kwa jengo na siku / Fees by property and day</h3>
          {data.settlements.map((s) => (
            <p key={s.id}>
              {s.property_id} · {s.day} · Simulation / Majaribio TZS{" "}
              {s.council_amount.toLocaleString()}
            </p>
          ))}
          {admin && (
            <p>
              Partner rebate · Simulation / Majaribio TZS{" "}
              {data.partner_rebate_report?.toLocaleString()}
            </p>
          )}
          <h3>Bili / Bills</h3>
          {data.bills.map((b) => (
            <p key={b.id}>
              {b.control_number} · {b.state} · Simulation / Majaribio TZS{" "}
              {b.amount.toLocaleString()}
            </p>
          ))}
          <h3>Ankara / Invoices</h3>
          {data.invoices.map((i) => (
            <p key={i.id}>
              {i.reference} · {i.state} · Simulation / Majaribio TZS{" "}
              {i.amount.toLocaleString()}
            </p>
          ))}
          {result?.invoice && (
            <p>
              {result.invoice.state} · Simulation / Majaribio TZS{" "}
              {result.invoice.amount.toLocaleString()}
            </p>
          )}
          {result?.result && (
            <p>
              Ledger {result.result.ledger} · Partner {result.result.partner} ·
              SIM-GePG {result.result.gepg} ·{" "}
              {result.result.balanced
                ? "Sawa / Matched"
                : "Tofauti / Difference"}
            </p>
          )}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </SectionCard>
  );
}
