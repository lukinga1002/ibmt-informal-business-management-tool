import { useEffect, useState } from "react";
import { callFn, fnError } from "@/lib/r4";
import SectionCard from "@/components/ibmt/SectionCard";
import Field from "@/components/ibmt/Field";
import { Button } from "@/components/ui/button";

export default function Stage2PayoutPanel() {
  const [legacyUnits, setLegacyUnits] = useState(""),
    [legacyName, setLegacyName] = useState("");
  const [properties, setProperties] = useState([]),
    [id, setId] = useState(""),
    [data, setData] = useState(null);
  const [form, setForm] = useState({
    account_type: "mobile_money",
    provider: "",
    account_number: "",
    account_name: "",
    consent: false,
  });
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [otp, setOtp] = useState(null),
    [code, setCode] = useState(""),
    [admin, setAdmin] = useState(false),
    [rosterText, setRosterText] = useState(""),
    [reviewNote, setReviewNote] = useState(""),
    [confirmWithdraw, setConfirmWithdraw] = useState(false);
  useEffect(() => {
    callFn("stage2Payout", { action: "properties" })
      .then((p) => {
        setProperties(p.properties);
        setAdmin(p.admin);
      })
      .catch((e) => setError(fnError(e)));
  }, []);
  async function load(propertyId) {
    setData(
      await callFn("stage2Payout", { action: "read", property_id: propertyId }),
    );
  }
  useEffect(() => {
    setData(null);
    setOtp(null);
    if (id) load(id).catch((e) => setError(fnError(e)));
  }, [id]);
  async function run(action, extra = {}) {
    setBusy(true);
    setError("");
    try {
      const result = await callFn("stage2Payout", {
        action,
        property_id: id,
        ...extra,
      });
      if (action === "requestOtp") setOtp({ ...result, id: extra.id });
      await load(id);
    } catch (e) {
      setError(fnError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <SectionCard
      title="Akaunti ya malipo / Payout account"
      description="Simulation / Majaribio · Ongeza sasa au baadaye / Add now or later (Stage 1)"
    >
      <p>
        Hatua 2: akaunti na idhini za wamiliki wote zinahitajika kabla ya
        mkataba kuanza. / Stage 2 requires all owners to approve before
        activation.
      </p>
      <label className="block py-3">
        Jengo / Property{" "}
        <select
          className="min-h-11 border p-2"
          value={id}
          onChange={(e) => setId(e.target.value)}
        >
          <option value="">Chagua / Select</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.property_ref}
            </option>
          ))}
        </select>
      </label>
      {admin && (
        <div className="space-y-2 border p-3">
          <Field
            label="Jengo la vitengo vilivyopo / Property for existing units"
            value={legacyName}
            onChange={(e) => setLegacyName(e.target.value)}
          />
          <Field
            label="Unit IDs separated by semicolons (reviewed grouping)"
            value={legacyUnits}
            onChange={(e) => setLegacyUnits(e.target.value)}
          />
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await callFn("stage2Payout", {
                  action: "prepareProperty",
                  name: legacyName,
                  unit_ids: legacyUnits
                    .split(";")
                    .map((v) => v.trim())
                    .filter(Boolean),
                });
                const response = await callFn("stage2Payout", {
                  action: "properties",
                });
                setProperties(response.properties);
              } catch (e) {
                setError(fnError(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Unganisha vitengo vilivyohakikiwa / Link reviewed existing units
          </Button>
        </div>
      )}
      {data && (
        <div className="space-y-4">
          {admin && (
            <div>
              <Field
                label="Wamiliki waliohakikiwa / Verified owners (user ID,phone; user ID,phone)"
                value={rosterText}
                onChange={(e) => setRosterText(e.target.value)}
              />
              <Button
                disabled={busy}
                onClick={() =>
                  run("verifyOwners", {
                    owners: rosterText.split(";").map((line) => {
                      const [owner_id, contact_phone] = line.trim().split(",");
                      return { owner_id, contact_phone };
                    }),
                  })
                }
              >
                Hakiki wamiliki / Verify owner roster
              </Button>
            </div>
          )}
          {!data.roster_id && (
            <p>
              Wasimamizi wathibitishe wamiliki na simu kwanza. / Reviewer must
              verify owners and phones first.
            </p>
          )}
          <label>
            Aina / Type{" "}
            <select
              value={form.account_type}
              onChange={(e) =>
                setForm({ ...form, account_type: e.target.value })
              }
            >
              <option value="mobile_money">Mobile money</option>
              <option value="bank">Bank</option>
            </select>
          </label>
          {[
            ["provider", "Mtoa huduma / Provider"],
            ["account_number", "Namba ya akaunti / Account number"],
            ["account_name", "Jina la akaunti / Account name"],
          ].map(([key, label]) => (
            <Field
              key={key}
              label={label}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          ))}
          <label className="flex gap-3 py-2">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(e) => setForm({ ...form, consent: e.target.checked })}
            />
            Ninakubali malipo kupitia IBMT (majaribio), toleo 1. / I consent to
            payments through IBMT (simulation), version 1.
          </label>
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={busy || !data.roster_id}
              onClick={() => run("nominate", form)}
            >
              Pendekeza akaunti / Nominate
            </Button>
            <Button
              variant="outline"
              disabled={busy || !data.roster_id || !data.consent}
              onClick={() => setConfirmWithdraw(true)}
            >
              Ondoa idhini / Withdraw consent
            </Button>
          </div>
          <p className="text-[13px]">
            {data.consent
              ? "Idhini ya malipo: imetolewa / Payment consent: given"
              : "Idhini ya malipo: imeondolewa. Malipo mapya ni Hatua 1; kiasi kinachoshikiliwa kinabaki kimeshikiliwa. Pendekeza akaunti ili kutoa idhini tena. / Payment consent: withdrawn. New payments are Stage 1; held amounts stay held. Nominate an account to consent again."}
          </p>
          {confirmWithdraw && data.withdrawal_disclosure && (
            <div role="alertdialog" className="border border-destructive p-3 space-y-2 text-[13px]">
              <p className="font-semibold">Kabla ya kuondoa idhini / Before you withdraw consent</p>
              <ul className="list-disc pl-5 space-y-1">
                {data.withdrawal_disclosure.sw.map((line, i) => (
                  <li key={i}>
                    {line} / {data.withdrawal_disclosure.en[i]}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="destructive"
                  disabled={busy}
                  onClick={async () => {
                    await run("withdraw", { acknowledged: true });
                    setConfirmWithdraw(false);
                  }}
                >
                  Ndiyo, ondoa idhini / Yes, withdraw consent
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => setConfirmWithdraw(false)}>
                  Hapana / Cancel
                </Button>
              </div>
            </div>
          )}
          <Button disabled={busy} onClick={() => run("releaseHeld")}>
            Toa malipo yaliyoshikiliwa / Release held simulated payouts
          </Button>
          {data.records.map((r) => (
            <div className="border p-3 space-y-2" key={r.id}>
              <p>
                {r.provider} · {r.account_number} · {r.account_name}
              </p>
              <p>
                {r.name_check} ·{" "}
                {r.effective ? "Inatumika / Effective" : "Inasubiri / Pending"}
              </p>
              <p>
                Idhini / Approvals {r.approvals.length} / {data.owners.length}
              </p>
              {r.cooling_off_ends_at && (
                <p>
                  Muda wa kusubiri / Cooling-off ends {r.cooling_off_ends_at}
                </p>
              )}
              {admin && r.name_check === "mismatch" && (
                <div>
                  <Field
                    label="Sababu ya ukaguzi / Review reason"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                  />
                  <Button
                    disabled={busy}
                    onClick={() =>
                      run("reviewName", { id: r.id, note: reviewNote })
                    }
                  >
                    Kubali baada ya ukaguzi / Accept after review
                  </Button>
                </div>
              )}
              <Button
                disabled={busy}
                onClick={() => run("requestOtp", { id: r.id })}
              >
                Omba OTP yangu / Request my OTP
              </Button>
              {otp?.id === r.id && (
                <div>
                  <p>
                    Simulation / Majaribio · OTP {otp.simulation_code} →{" "}
                    {otp.to}
                  </p>
                  <Field
                    label="OTP"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                  <Button
                    disabled={busy}
                    onClick={() =>
                      run("approve", {
                        id: r.id,
                        challenge_id: otp.challenge_id,
                        code,
                      })
                    }
                  >
                    Idhinisha / Approve
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </SectionCard>
  );
}
