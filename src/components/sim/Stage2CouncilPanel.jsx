import { useEffect, useState } from "react";
import SimulationCouncilPicker from "./SimulationCouncilPicker";
import { callFn, errorText } from "@/lib/r4";
import { useT } from "@/i18n/I18nContext";
import SectionCard from "@/components/ibmt/SectionCard";
import Field from "@/components/ibmt/Field";
import { Button } from "@/components/ui/button";

export default function Stage2CouncilPanel({ councilId, admin = false }) {
  const { t, lang } = useT();
  const tzs = (value) => `TZS ${Number(value || 0).toLocaleString(lang === "sw" ? "sw-TZ" : "en-TZ")}`;
  const
    [selected, setSelected] = useState(""),
    [data, setData] = useState(null),
    [result, setResult] = useState(null);
  const [day, setDay] = useState(new Date().toISOString().slice(0, 10)),
    [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [error, setError] = useState(null),
    [busy, setBusy] = useState(false);
  const id = councilId || selected;
  useEffect(() => {
    setData(null);
    if (id)
      callFn("stage2Council", { action: "read", council_id: id })
        .then(setData)
        .catch((err) => setError({ err }));
  }, [id]);
  async function run(action) {
    setBusy(true);
    setError(null);
    try {
      setResult(
        await callFn("stage2Council", { action, council_id: id, day, month }),
      );
      setData(
        await callFn("stage2Council", { action: "read", council_id: id }),
      );
    } catch (err) {
      setError({ err });
    } finally {
      setBusy(false);
    }
  }
  return (
    <SectionCard
      title={t("councilMoney.title")}
      description={t("councilMoney.simulation")}
    >
      <p>{t("councilMoney.notATax")}</p>
      {admin && <SimulationCouncilPicker value={selected} onChange={setSelected} />}
      {data && (
        <div className="space-y-4">
          {admin && (
            <div className="flex flex-wrap gap-3">
              <Field
                label={t("councilMoney.settlementDate")}
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
              <Button disabled={busy} onClick={() => run("batch")}>
                {t("councilMoney.batch")}
              </Button>
              <Field
                label={t("councilMoney.invoiceMonth")}
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
              <Button disabled={busy} onClick={() => run("invoice")}>
                {t("councilMoney.invoice")}
              </Button>
              <Button disabled={busy} onClick={() => run("reconcile")}>
                {t("councilMoney.reconcile")}
              </Button>
            </div>
          )}
          <p>
            {data.settlements.some((s) => s.fee_status !== "in_force")
              ? t("councilMoney.proposedFee")
              : t("councilMoney.simulation")}
          </p>
          <h3>{t("councilMoney.feesByProperty")}</h3>
          {data.settlements.map((s) => (
            <p key={s.id}>
              {s.property_id} · {s.day} · {tzs(s.council_amount)}
            </p>
          ))}
          {admin && (
            <p>
              {t("councilMoney.partnerRebate")} · {tzs(data.partner_rebate_report)}
            </p>
          )}
          <h3>{t("councilMoney.bills")}</h3>
          {data.bills.map((b) => (
            <p key={b.id}>
              {b.control_number} · {t(`councilMoney.state.${b.state}`)} · {tzs(b.amount)}
            </p>
          ))}
          <h3>{t("councilMoney.invoices")}</h3>
          {data.invoices.map((i) => (
            <p key={i.id}>
              {i.reference} · {t(`councilMoney.state.${i.state}`)} · {tzs(i.amount)}
              {i.excluded_lines?.length ? ` · ${t("councilMoney.excluded", { count: i.excluded_lines.length, amount: tzs(i.excluded_amount) })}` : ""}
            </p>
          ))}
          {result?.invoice && (
            <p>
              {t(`councilMoney.state.${result.invoice.state}`)} · {tzs(result.invoice.amount)}
              {result.invoice.excluded_lines?.length ? ` · ${t("councilMoney.excluded", { count: result.invoice.excluded_lines.length, amount: tzs(result.invoice.excluded_amount) })}` : ""}
            </p>
          )}
          {result?.result && (
            <p>
              {t("councilMoney.reconcileLine", { ledger: tzs(result.result.ledger), partner: tzs(result.result.partner), gepg: tzs(result.result.gepg) })}{" "}
              · {result.result.balanced ? t("councilMoney.matched") : t("councilMoney.difference")}
              {result.result.recovery?.open ? ` · ${t("councilMoney.recoveryOpen", { count: result.result.recovery.open, amount: tzs(result.result.recovery.amount) })}` : ""}
            </p>
          )}
        </div>
      )}
      {admin && data?.recovery_exceptions?.length > 0 && (
        <div className="mt-4 border border-destructive p-3">
          <h3>{t("councilMoney.recoveryTitle")}</h3>
          <p>{t("councilMoney.recoveryBody")}</p>
          {data.recovery_exceptions.map((e) => (
            <p key={e.id}>{e.payment_id} · {tzs(e.amount)} · {t("councilMoney.recoveryState")}</p>
          ))}
        </div>
      )}
      {error && <p role="alert">{errorText(error)}</p>}
    </SectionCard>
  );
}

