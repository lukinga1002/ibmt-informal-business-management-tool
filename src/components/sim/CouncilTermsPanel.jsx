import { useEffect, useState } from "react";
import SimulationCouncilPicker from "./SimulationCouncilPicker";
import { callFn, errorText } from "@/lib/r4";
import { useT } from "@/i18n/I18nContext";
import Field from "@/components/ibmt/Field";
import SectionCard from "@/components/ibmt/SectionCard";
import { Button } from "@/components/ui/button";
const defaults = {
  council_fee_type: "percent",
  council_fee_rate: 0.03,
  council_fee_fixed_amount: 0,
  bylaw_reference: "",
  legal_opinion_reference: "",
  gepg_sp_code: "SIM-",
  ibmt_fee_basis: "share_of_rent",
  ibmt_fee_rate: 0.015,
  ibmt_contract_reference: "",
  ibmt_contract_status: "draft",
};
const labels = Object.fromEntries(Object.keys(defaults).map((key) => [key, `councilTerms.field.${key}`]));
const options = {
  council_fee_type: ["percent", "fixed"],
  ibmt_fee_basis: ["share_of_rent", "share_of_council_fee"],
  ibmt_contract_status: ["draft", "signed"],
};
export default function CouncilTermsPanel({ councilId, admin = false }) {
  const { t } = useT();
  const
    [selected, setSelected] = useState(""),
    [model, setModel] = useState(null),
    [form, setForm] = useState(defaults);
  const [error, setError] = useState(null),
    [busy, setBusy] = useState(false),
    [config, setConfig] = useState({
      rent_stage: "record",
      partner_charge_rate: 0.02,
      partner_rebate_rate: 0.0075,
      payout_cooling_off_hours: 24,
      mobile_wallet_limit: "",
    });
  const id = councilId || selected;
  async function load(key) {
    const data = await callFn("councilSettlementTerms", {
      action: "read",
      council_id: key,
    });
    setModel(data);
    setForm({ ...defaults, ...data.terms });
  }
  useEffect(() => {
    setModel(null);
    if (id) load(id).catch((err) => setError({ err }));
  }, [id]);
  async function run(action) {
    setBusy(true);
    setError(null);
    try {
      await callFn("councilSettlementTerms", {
        action,
        council_id: id,
        revision_id: model.terms?.id,
        terms: form,
        ...config,
        mobile_wallet_limit:
          config.mobile_wallet_limit === ""
            ? null
            : Number(config.mobile_wallet_limit),
      });
      await load(id);
    } catch (err) {
      setError({ err });
    } finally {
      setBusy(false);
    }
  }
  return (
    <SectionCard
      title={t("councilTerms.title")}
      description={t("councilTerms.description")}
    >
      {admin && <SimulationCouncilPicker value={selected} onChange={setSelected} />}
      {model && (
        <div className="space-y-3">
          <p>
            {model.approved ? t("councilTerms.approved") : t("councilMoney.proposedFee")}
          </p>
          {Object.keys(defaults).map((key) =>
            !admin ? (
              <p key={key}>
                {t(labels[key])} · {options[key] && model.terms?.[key] ? t(`councilTerms.option.${model.terms[key]}`) : model.terms?.[key] ?? "-"}
              </p>
            ) : options[key] ? (
              <label className="block" key={key}>
                {t(labels[key])}{" "}
                <select
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                >
                  {options[key].map((o) => (
                    <option key={o} value={o}>{t(`councilTerms.option.${o}`)}</option>
                  ))}
                </select>
              </label>
            ) : (
              <Field
                key={key}
                label={t(labels[key])}
                type={typeof defaults[key] === "number" ? "number" : "text"}
                step="any"
                value={form[key]}
                onChange={(e) =>
                  setForm({
                    ...form,
                    [key]:
                      typeof defaults[key] === "number"
                        ? Number(e.target.value)
                        : e.target.value,
                  })
                }
              />
            ),
          )}
          <p>
            {t("councilTerms.approvals", { done: new Set(model.approvals.map((a) => a.admin_id)).size, total: 2 })}
          </p>
          {admin && (
            <>
              <div className="flex flex-wrap gap-3">
                <Button disabled={busy} onClick={() => run("propose")}>
                  {t("councilTerms.propose")}
                </Button>
                <Button
                  disabled={
                    busy ||
                    !model.terms ||
                    Object.keys(defaults).some(
                      (k) => form[k] !== model.terms[k],
                    )
                  }
                  onClick={() => run("approve")}
                >
                  {t("councilTerms.approve")}
                </Button>
              </div>
              <label>
                {t("councilTerms.stage")}{" "}
                <select
                  value={config.rent_stage}
                  onChange={(e) =>
                    setConfig({ ...config, rent_stage: e.target.value })
                  }
                >
                  <option value="record">{t("councilTerms.stage1")}</option>
                  <option value="partner">{t("councilTerms.stage2")}</option>
                </select>
              </label>
              {[
                "partner_charge_rate",
                "partner_rebate_rate",
                "payout_cooling_off_hours",
                "mobile_wallet_limit",
              ].map((key) => (
                <Field
                  key={key}
                  label={t(`councilTerms.config.${key}`)}
                  type="number"
                  step="any"
                  value={config[key]}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      [key]:
                        e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                />
              ))}
              <p>{t("councilTerms.coolingOffNote")}</p>
              <Button
                className="h-auto min-h-11 w-full whitespace-normal py-2 sm:w-auto"
                disabled={busy}
                onClick={() => run("configureSimulation")}
              >
                {t("councilTerms.saveConfig")}
              </Button>
            </>
          )}
        </div>
      )}
      {error && <p role="alert">{errorText(error)}</p>}
    </SectionCard>
  );
}

