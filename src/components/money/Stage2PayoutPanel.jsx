import { useEffect, useState } from "react";
import { callFn, errorText } from "@/lib/r4";
import { formatDateTime } from "@/lib/format";
import { useT } from "@/i18n/I18nContext";

/** Version of the payment consent wording below; sent with the language it was shown in. */
const CONSENT_TEXT_VERSION = "stage2-payments-1";
import SectionCard from "@/components/ibmt/SectionCard";
import Field from "@/components/ibmt/Field";
import { Button } from "@/components/ui/button";

export default function Stage2PayoutPanel() {
  const { t, lang } = useT();
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
  const [error, setError] = useState(null),
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
      .catch((err) => setError({ err }));
  }, []);
  async function load(propertyId) {
    setData(
      await callFn("stage2Payout", { action: "read", property_id: propertyId }),
    );
  }
  useEffect(() => {
    setData(null);
    setOtp(null);
    if (id) load(id).catch((err) => setError({ err }));
  }, [id]);
  async function run(action, extra = {}) {
    setBusy(true);
    setError(null);
    try {
      const result = await callFn("stage2Payout", {
        action,
        property_id: id,
        ...extra,
      });
      if (action === "requestOtp") setOtp({ ...result, id: extra.id });
      await load(id);
    } catch (err) {
      setError({ err });
    } finally {
      setBusy(false);
    }
  }
  const disclosure = data?.withdrawal_disclosure?.[lang] || [];
  return (
    <SectionCard
      title={t("payout.title")}
      description={t("payout.description")}
    >
      <p>{t("payout.stage2Rule")}</p>
      <label className="block py-3">
        {t("payout.property")}{" "}
        <select
          className="min-h-11 w-full max-w-full min-w-0 truncate border p-2"
          value={id}
          onChange={(e) => setId(e.target.value)}
        >
          <option value="">{t("payout.select")}</option>
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
            label={t("payout.legacyName")}
            value={legacyName}
            onChange={(e) => setLegacyName(e.target.value)}
          />
          <Field
            label={t("payout.legacyUnits")}
            value={legacyUnits}
            onChange={(e) => setLegacyUnits(e.target.value)}
          />
          <Button className="h-auto min-h-10 max-w-full whitespace-normal text-left"
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
              } catch (err) {
                setError({ err });
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("payout.linkUnits")}
          </Button>
        </div>
      )}
      {data && (
        <div className="space-y-4">
          {admin && (
            <div>
              <Field
                label={t("payout.rosterLabel")}
                value={rosterText}
                onChange={(e) => setRosterText(e.target.value)}
              />
              <Button className="h-auto min-h-10 max-w-full whitespace-normal text-left"
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
                {t("payout.verifyRoster")}
              </Button>
            </div>
          )}
          {!data.roster_id && (
            <p>{t("payout.rosterFirst")}</p>
          )}
          <label>
            {t("payout.type")}{" "}
            <select
              value={form.account_type}
              onChange={(e) =>
                setForm({ ...form, account_type: e.target.value })
              }
            >
              <option value="mobile_money">{t("payout.mobileMoney")}</option>
              <option value="bank">{t("payout.bank")}</option>
            </select>
          </label>
          {[
            ["provider", "payout.provider"],
            ["account_number", "payout.accountNumber"],
            ["account_name", "payout.accountName"],
          ].map(([key, label]) => (
            <Field
              key={key}
              label={t(label)}
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
            {t("payout.consent")}
          </label>
          <div className="flex flex-wrap gap-3">
            <Button className="h-auto min-h-10 max-w-full whitespace-normal text-left"
              disabled={busy || !data.roster_id}
              onClick={() => run("nominate", { ...form, consent_language: lang, consent_text_version: CONSENT_TEXT_VERSION })}
            >
              {t("payout.nominate")}
            </Button>
            <Button className="h-auto min-h-10 max-w-full whitespace-normal text-left"
              variant="outline"
              disabled={busy || !data.roster_id || !data.consent}
              onClick={() => setConfirmWithdraw(true)}
            >
              {t("payout.withdraw")}
            </Button>
          </div>
          <p className="text-[13px]">
            {data.consent ? t("payout.consentGiven") : t("payout.consentWithdrawn")}
          </p>
          {confirmWithdraw && data.withdrawal_disclosure && (
            <div role="alertdialog" className="border border-destructive p-3 space-y-2 text-[13px]">
              <p className="font-semibold">{t("payout.beforeWithdraw")}</p>
              <ul className="list-disc pl-5 space-y-1">
                {disclosure.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                <Button className="h-auto min-h-10 max-w-full whitespace-normal text-left"
                  variant="destructive"
                  disabled={busy}
                  onClick={async () => {
                    await run("withdraw", { acknowledged: true, language: lang });
                    setConfirmWithdraw(false);
                  }}
                >
                  {t("payout.withdrawYes")}
                </Button>
                <Button className="h-auto min-h-10 max-w-full whitespace-normal text-left" variant="outline" disabled={busy} onClick={() => setConfirmWithdraw(false)}>
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          )}
          <Button className="h-auto min-h-10 max-w-full whitespace-normal text-left" disabled={busy} onClick={() => run("releaseHeld")}>
            {t("payout.release")}
          </Button>
          {data.records.map((r) => (
            <div className="border p-3 space-y-2" key={r.id}>
              <p>
                {r.provider} · {r.account_number} · {r.account_name}
              </p>
              <p>
                {t(`payout.nameCheck.${r.name_check}`)} ·{" "}
                {r.effective ? t("payout.effective") : t("payout.pending")}
              </p>
              <p>
                {t("payout.approvals", { done: r.approvals.length, total: data.owners.length })}
              </p>
              {r.cooling_off_ends_at && (
                <p>{t("payout.coolingOffEnds", { when: formatDateTime(r.cooling_off_ends_at, lang) })}</p>
              )}
              {!r.effective && r.name_check === "mismatch" && r.approvals.length >= data.owners.length && (
                <p>{t("payout.mismatchBlocks")}</p>
              )}
              {admin && r.name_check === "mismatch" && (
                <div>
                  <Field
                    label={t("payout.reviewReason")}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                  />
                  <Button className="h-auto min-h-10 max-w-full whitespace-normal text-left"
                    disabled={busy}
                    onClick={() =>
                      run("reviewName", { id: r.id, note: reviewNote })
                    }
                  >
                    {t("payout.acceptAfterReview")}
                  </Button>
                </div>
              )}
              {r.i_approved ? (
                <p>{t("payout.youApproved")}</p>
              ) : (
              <Button className="h-auto min-h-10 max-w-full whitespace-normal text-left"
                disabled={busy}
                onClick={() => run("requestOtp", { id: r.id })}
              >
                {t("payout.requestOtp")}
              </Button>
              )}
              {otp?.id === r.id && (
                <div>
                  <p>
                    {t("payout.simulatedCode", { code: otp.simulation_code, to: otp.to })}
                  </p>
                  <Field
                    label={t("payout.code")}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                  <Button className="h-auto min-h-10 max-w-full whitespace-normal text-left"
                    disabled={busy}
                    onClick={() =>
                      run("approve", {
                        id: r.id,
                        challenge_id: otp.challenge_id,
                        code,
                      })
                    }
                  >
                    {t("common.approve")}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {error && <p role="alert">{errorText(error)}</p>}
    </SectionCard>
  );
}
