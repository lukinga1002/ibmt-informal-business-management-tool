import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { requestUser } from "../../shared/requestUser.ts";
import {
  cleanText,
  fail,
  json,
  getPolicyRules,
} from "../../shared/moneyOps.ts";
import { issueChallenge, checkHashedOtp } from "../../shared/registration.ts";
import { allRows, payoutFor, walletState } from "../../shared/stage2Payout.ts";
import { maskPhone } from "../../shared/r7.ts";

export default async function (req) {
  try {
    const app = createClientFromRequest(req),
      user = await requestUser(app);
    if (!user) return fail(401, "SESSION_EXPIRED", "Sign in required");
    const input = await req.json(),
      db = app.asServiceRole.entities;
    if (input.action === "properties") {
      const owned = await allRows(
        db.Property,
        user.role === "admin" ? {} : { landlord_id: user.id },
      );
      const rosters = await allRows(db.PayoutAccountChange, {
        record_kind: "verified_roster",
      });
      for (const roster of rosters.filter((r) =>
        r.owners?.some((o) => o.owner_id === user.id),
      )) {
        if (!owned.some((p) => p.id === roster.property_id))
          owned.push(await db.Property.get(roster.property_id));
      }
      return json({
        properties: owned.map((p) => ({
          id: p.id,
          name: p.name,
          property_ref: p.property_ref,
        })),
        admin: user.role === "admin",
        simulation: true,
      });
    }
    if (input.action === "prepareProperty") {
      if (user.role !== "admin")
        return fail(403, "FORBIDDEN", "Reviewer required");
      const ids = input.unit_ids;
      if (!Array.isArray(ids) || !ids.length || !cleanText(input.name))
        return fail(
          422,
          "VALIDATION",
          "Select existing units and name the property",
        );
      const units = [];
      for (const unitId of new Set(ids))
        units.push(await db.RentalUnit.get(unitId));
      if (new Set(units.map((u) => u.landlord_id)).size !== 1)
        return fail(
          422,
          "VALIDATION",
          "Units must have the same registered landlord",
        );
      for(const key of ['council_id','district','ward']) {
        if(!units[0][key] || units.some(unit=>unit[key]!==units[0][key]))
          return fail(422,'JURISDICTION','Review unit council, district and ward before grouping');
      }
      const reference = "SIM-PROP-EXISTING-" + units[0].id;
      let property = (
        await allRows(db.Property, { property_ref: reference })
      )[0];
      if (units.some((u) => u.property_id && u.property_id !== property?.id))
        return fail(
          409,
          "PROPERTY_EXISTS",
          "A selected unit already belongs to another property",
        );
      if (!property)
        property = await db.Property.create({
          property_ref: reference,
          name: cleanText(input.name),
          landlord_id: units[0].landlord_id,
          council_id: units[0].council_id,
          district: units[0].district,
          ward: units[0].ward,
          unit_count: units.length,
        });
      for (const unit of units)
        await db.RentalUnit.update(unit.id, { property_id: property.id });
      return json({ property_id: property.id, simulation: true });
    }
    const property = await db.Property.get(cleanText(input.property_id));
    const current = await payoutFor(db, property.id);
    const owner = current.roster?.owners?.find((o) => o.owner_id === user.id);
    const admin = user.role === "admin";
    if (!admin && property.landlord_id !== user.id && !owner)
      return fail(403, "FORBIDDEN", "Property owner required");
    const action = cleanText(input.action);
    if (action === "read") {
      const records = await allRows(db.PayoutAccountChange, {
        property_id: property.id,
        record_kind: "nomination",
      });
      return json({
        simulation: true,
        roster_id: current.roster?.id,
        owners: (current.roster?.owners || []).map((o) => ({
          owner_id: o.owner_id,
          phone: maskPhone(o.contact_phone),
        })),
        consent: current.consent,
        records: records.map((r) => ({
          id: r.id,
          account_type: r.account_type,
          provider: r.provider,
          account_name: r.account_name,
          account_number: owner
            ? r.account_number
            : "****" + r.account_number.slice(-4),
          name_check: r.name_check,
          approvals: r.approvals || [],
          cooling_off_ends_at: r.cooling_off_ends_at,
          effective: r.id === current.account?.id,
        })),
      });
    }
    if (action === "verifyOwners") {
      if (!admin) return fail(403, "FORBIDDEN", "Platform reviewer required");
      const owners = input.owners;
      if (
        !Array.isArray(owners) ||
        !owners.length ||
        new Set(owners.map((o) => o.owner_id)).size !== owners.length ||
        !owners.some((o) => o.owner_id === property.landlord_id) ||
        owners.some(
          (o) =>
            !o.owner_id ||
            !/^\+?255[67]\d{8}$|^0[67]\d{8}$/.test(o.contact_phone),
        )
      )
        return fail(
          422,
          "VALIDATION",
          "Verify every owner and phone, including the registered landlord",
        );
      for (const o of owners) await db.User.get(o.owner_id);
      await db.PayoutAccountChange.create({
        property_id: property.id,
        landlord_id: property.landlord_id,
        record_kind: "verified_roster",
        owners,
        status: "effective",
        new_phone_masked: "not applicable",
        simulation: true,
        history: [
          {
            by: user.id,
            at: new Date().toISOString(),
            note: "Synthetic ownership roster reviewed",
          },
        ],
      });
      return json({ simulation: true });
    }
    if (action === "nominate") {
      if (!owner)
        return fail(
          409,
          "ROSTER_REQUIRED",
          "A reviewer must verify the owner roster first",
        );
      if (input.consent !== true)
        return fail(
          422,
          "CONSENT_REQUIRED",
          "Separate payment consent is required",
        );
      const account = cleanText(input.account_number),
        name = cleanText(input.account_name),
        provider = cleanText(input.provider);
      if (
        !["mobile_money", "bank"].includes(input.account_type) ||
        !account ||
        !name ||
        !provider ||
        account.length > 40
      )
        return fail(422, "VALIDATION", "Account details required");
      const rule = await getPolicyRules(app),
        hours = rule?.payout_cooling_off_hours;
      if (!Number.isFinite(hours) || hours < 24)
        return fail(
          409,
          "POLICY_REQUIRED",
          "Configure simulated cooling-off hours (at least 24)",
        );
      if (
        input.account_type === "mobile_money" &&
        !/^(?:0|\+?255)[67]\d{8}$/.test(account.replace(/[\s-]/g, ""))
      )
        return fail(
          422,
          "VALIDATION",
          "Use a valid-format synthetic mobile account number",
        );
      // Server-owned synthetic directory; the caller cannot manufacture a successful name check.
      const directory = {SIM1234:'Demo','SIM-ACCOUNT-A':'Mmiliki wa mfano','SIM-ACCOUNT-B':'Joint Owner Demo'};
      const partnerName = directory[account] || 'SIM: human name review required';
      const row = await db.PayoutAccountChange.create({
        property_id: property.id,
        landlord_id: property.landlord_id,
        record_kind: "nomination",
        roster_id: current.roster.id,
        old_account_id: current.account?.id || null,
        account_type: input.account_type,
        provider,
        account_number: account,
        account_name: name,
        partner_name: partnerName,
        name_check:
          partnerName.toLowerCase() === name.toLowerCase()
            ? "matched"
            : "mismatch",
        consent: true,
        consent_version: "stage2-payments-1",
        approvals: [],
        cooling_off_hours: hours,
        status: "requested",
        new_phone_masked: "****" + account.slice(-4),
        simulation: true,
      });
      await db.Consent.create({
        subject_id: user.id,
        purpose: "payments_through_ibmt",
        version: "stage2-payments-1",
        granted: true,
        granted_at: new Date().toISOString(),
      });
      for (const o of current.roster.owners)
        await db.Notification.create({
          subject_id: o.owner_id,
          kind: "payout_nomination",
          channel: "in_app",
          sent_via: "in_app (simulation)",
          body: {
            sw: "Majaribio: idhinisha akaunti mpya. Akaunti ya zamani itaendelea wakati wa kusubiri.",
            en: "Simulation: review new payout account. Old account remains active during cooling-off.",
          },
          data: {
            property_id: property.id,
            nomination_id: row.id,
            old_channel: maskPhone(o.contact_phone),
            new_channel: "****" + account.slice(-4),
          },
        });
      return json({ id: row.id, simulation: true });
    }
    if (action === "withdraw") {
      if (!owner) return fail(403, "FORBIDDEN", "Verified owner required");
      await db.PayoutAccountChange.create({
        property_id: property.id,
        landlord_id: property.landlord_id,
        record_kind: "consent_withdrawal",
        status: "effective",
        new_phone_masked: "not applicable",
        simulation: true,
      });
      await db.Consent.create({
        subject_id: user.id,
        purpose: "payments_through_ibmt",
        version: "stage2-payments-1",
        granted: false,
        withdrawn_at: new Date().toISOString(),
      });
      return json({ record_only: true, simulation: true });
    }
    if (action === "releaseHeld") {
      if (!owner || !current.account)
        return fail(
          409,
          "ACCOUNT_REQUIRED",
          "Approve an eligible payout account first",
        );
      const rule = await getPolicyRules(app);
      const held = await allRows(db.SimSettlement, {
        property_id: property.id,
        landlord_state: "held_limit",
      });
      let released = 0;
      for (const settlement of held) {
        if (
          walletState(
            current.account,
            settlement.landlord_amount,
            rule?.mobile_wallet_limit,
          ) !== "settled"
        )
          continue;
        await db.SimSettlement.updateMany(
          { id: settlement.id, landlord_state: "held_limit" },
          { $set: { landlord_state: "settled" } },
        );
        await db.SimPayment.update(settlement.payment_id, {
          payout_state: "settled",
        });
        released++;
      }
      return json({ released, simulation: true });
    }
    const row = await db.PayoutAccountChange.get(input.id);
    if (
      row.property_id !== property.id ||
      row.record_kind !== "nomination" ||
      row.roster_id !== current.roster?.id
    )
      return fail(409, "STALE", "Review current nomination");
    if (action === "reviewName") {
      if (!admin) return fail(403, "FORBIDDEN", "Reviewer required");
      if (!cleanText(input.note))
        return fail(
          422,
          "VALIDATION",
          "Record the reason for the human name review",
        );
      await db.PayoutAccountChange.update(row.id, {
        name_check: "reviewed",
        history: [
          ...(row.history || []),
          {
            by: user.id,
            at: new Date().toISOString(),
            note: cleanText(input.note),
          },
        ],
      });
      return json({ simulation: true });
    }
    if (!owner)
      return fail(403, "FORBIDDEN", "Only an owner can approve their account");
    if (row.approvals?.some((a) => a.owner_id === user.id))
      return json({ already_approved: true, simulation: true });
    if (action === "requestOtp") {
      const recent = await allRows(db.OtpChallenge, {}),
        since = Date.now() - 3600000;
      const live = recent.filter((c) => Date.parse(c.issued_at) >= since);
      if (
        live.filter((c) => c.subject_id === user.id).length >= 3 ||
        live.filter((c) => c.phone_masked === maskPhone(owner.contact_phone))
          .length >= 3
      )
        return fail(
          429,
          "RATE_LIMITED",
          "Three codes per owner and phone per hour",
        );
      const otp = await issueChallenge(app, {
        subjectId: user.id,
        subjectRef: row.id,
        purpose: "joint_payout",
        phone: owner.contact_phone,
      });
      return json({
        challenge_id: otp.challenge.id,
        simulation_code: otp.code,
        to: maskPhone(owner.contact_phone),
        simulation: true,
      });
    }
    if (action !== "approve") return fail(422, "VALIDATION", "Unknown action");
    const challenge = await db.OtpChallenge.get(input.challenge_id);
    if (
      challenge.subject_id !== user.id ||
      challenge.subject_ref !== row.id ||
      challenge.purpose !== "joint_payout"
    )
      return fail(403, "FORBIDDEN", "Code belongs to another owner");
    const checked = await checkHashedOtp({ challenge, code: input.code });
    await db.OtpChallenge.update(challenge.id, {
      attempts: checked.attempts,
      locked_until: checked.locked_until,
      consumed_at:
        challenge.consumed_at || (checked.ok ? new Date().toISOString() : null),
    });
    if (!checked.ok) return fail(422, "OTP_INVALID", checked.reason);
    // Approval is one row per owner, so concurrent owners never overwrite each other's decision.
    await db.PayoutAccountChange.create({
      property_id: property.id,
      landlord_id: property.landlord_id,
      record_kind: "owner_approval",
      old_account_id: row.id,
      owner_id: user.id,
      status: "verified",
      new_phone_masked: maskPhone(owner.contact_phone),
      simulation: true,
    });
    const votes = await allRows(db.PayoutAccountChange, {
      record_kind: "owner_approval",
      old_account_id: row.id,
    });
    const approvals = [...new Set(votes.map((v) => v.owner_id))].map(
      (owner_id) => ({ owner_id }),
    );
    const all = current.roster.owners.every((o) =>
      approvals.some((a) => a.owner_id === o.owner_id),
    );
    await db.PayoutAccountChange.update(row.id, {
      approvals,
      ...(all && !row.cooling_off_ends_at
        ? {
            cooling_off_ends_at: new Date(
              Date.now() +
                (row.old_account_id ? row.cooling_off_hours : 0) * 3600000,
            ).toISOString(),
            status: "cooling_off",
          }
        : {}),
    });
    return json({ all_approved: all, simulation: true });
  } catch {
    return fail(500, "SERVER", "Could not process simulated payout account");
  }
}

