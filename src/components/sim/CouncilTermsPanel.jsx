import { useEffect, useState } from "react";
import SimulationCouncilPicker from "./SimulationCouncilPicker";
import { callFn, fnError } from "@/lib/r4";
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
const labels = {
  council_fee_type: "Aina ya ada / Fee type",
  council_fee_rate: "Kiwango cha ada / Fee rate",
  council_fee_fixed_amount: "Ada maalumu TZS / Fixed fee",
  bylaw_reference: "Rejea ya sheria ndogo / By-law reference",
  legal_opinion_reference: "Maoni ya kisheria / Legal opinion reference",
  gepg_sp_code: "SIM SP code",
  ibmt_fee_basis: "Msingi wa ankara / Invoice basis",
  ibmt_fee_rate: "Kiwango cha IBMT / IBMT rate",
  ibmt_contract_reference: "Rejea ya mkataba / Contract reference",
  ibmt_contract_status: "Hali ya mkataba / Contract status",
};
const options = {
  council_fee_type: ["percent", "fixed"],
  ibmt_fee_basis: ["share_of_rent", "share_of_council_fee"],
  ibmt_contract_status: ["draft", "signed"],
};
export default function CouncilTermsPanel({ councilId, admin = false }) {
  const
    [selected, setSelected] = useState(""),
    [model, setModel] = useState(null),
    [form, setForm] = useState(defaults);
  const [error, setError] = useState(""),
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
    if (id) load(id).catch((e) => setError(fnError(e)));
  }, [id]);
  async function run(action) {
    setBusy(true);
    setError("");
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
    } catch (e) {
      setError(fnError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <SectionCard
      title="Masharti ya halmashauri / Council terms"
      description="Simulation / Majaribio · Placeholder"
    >
      {admin && <SimulationCouncilPicker value={selected} onChange={setSelected} />}
      {model && (
        <div className="space-y-3">
          <p>
            {model.approved
              ? "Imeidhinishwa / Approved"
              : "Ada inayopendekezwa (majaribio) / Proposed fee (simulation)"}
          </p>
          {Object.keys(defaults).map((key) =>
            !admin ? (
              <p key={key}>
                {labels[key]} · {model.terms?.[key] ?? "-"}
              </p>
            ) : options[key] ? (
              <label className="block" key={key}>
                {labels[key]}{" "}
                <select
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                >
                  {options[key].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
            ) : (
              <Field
                key={key}
                label={labels[key]}
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
            Idhini / Approvals{" "}
            {new Set(model.approvals.map((a) => a.admin_id)).size} / 2
          </p>
          {admin && (
            <>
              <div className="flex flex-wrap gap-3">
                <Button disabled={busy} onClick={() => run("propose")}>
                  Wasilisha masharti / Propose revision
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
                  Idhinisha / Approve revision
                </Button>
              </div>
              <label>
                Hatua / Stage{" "}
                <select
                  value={config.rent_stage}
                  onChange={(e) =>
                    setConfig({ ...config, rent_stage: e.target.value })
                  }
                >
                  <option value="record">Stage 1</option>
                  <option value="partner">
                    Stage 2 (Simulation / Majaribio)
                  </option>
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
                  label={
                    key === "mobile_wallet_limit"
                      ? "Kikomo cha mfano kutoka mshirika / Synthetic limit - get from partner"
                      : key
                  }
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
              <p>Cooling-off: 24 hours in demo; 72 recommended live.</p>
              <Button
                className="h-auto min-h-11 w-full whitespace-normal py-2 sm:w-auto"
                disabled={busy}
                onClick={() => run("configureSimulation")}
              >
                Hifadhi majaribio / Save simulation configuration
              </Button>
            </>
          )}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </SectionCard>
  );
}

