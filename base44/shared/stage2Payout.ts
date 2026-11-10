/** Read all matching rows so a register's size cannot weaken a payment guard. */
export async function allRows(entity, filter = {}) {
  const rows = [];
  for (let skip = 0; ; skip += 100) {
    const page = await entity.filter(filter, "-created_date", 100, skip);
    const batch = Array.isArray(page) ? page : page.items || [];
    rows.push(...batch);
    if (batch.length < 100) return rows;
  }
}

export function accountReady(account, roster, now = Date.now()) {
  if (
    !account ||
    !["cooling_off", "effective"].includes(account.status) ||
    !account.cooling_off_ends_at ||
    !roster ||
    account.roster_id !== roster.id ||
    !account.consent ||
    (account.name_check !== "matched" && account.name_check !== "reviewed")
  )
    return false;
  if (
    !roster.owners?.length ||
    !roster.owners.every((owner) =>
      account.approvals?.some((a) => a.owner_id === owner.owner_id),
    )
  )
    return false;
  return (
    !account.cooling_off_ends_at ||
    Date.parse(account.cooling_off_ends_at) <= now
  );
}

export function walletState(account, amount, limit) {
  if (!account) return "held_account";
  if (account.account_type === "bank") return "settled";
  return Number.isSafeInteger(limit) && limit > 0 && amount <= limit
    ? "settled"
    : "held_limit";
}

export async function payoutFor(db, propertyId) {
  const records = await allRows(db.PayoutAccountChange, {
    property_id: propertyId,
  });
  const roster = records.find((r) => r.record_kind === "verified_roster");
  const withdrawal = records.find(
    (r) => r.record_kind === "consent_withdrawal",
  );
  const nominations = records
    .filter((r) => r.record_kind === "nomination")
    .map((row) => ({
      ...row,
      approvals: records
        .filter(
          (v) =>
            v.record_kind === "owner_approval" && v.old_account_id === row.id,
        )
        .map((v) => ({ owner_id: v.owner_id })),
    }));
  const effective = nominations.find((r) => accountReady(r, roster));
  const consent =
    !withdrawal || nominations[0]?.created_date > withdrawal.created_date;
  return {
    roster,
    account: consent ? effective : null,
    consent,
    pending: nominations.find((r) => !accountReady(r, roster)),
  };
}

export async function leasePayoutGuard(app, lease) {
  const db = app.asServiceRole.entities;
  const unit = await db.RentalUnit.get(lease.unit_id);
  if (!unit.council_id) return;
  const council = await db.Council.get(unit.council_id);
  if (council.rent_stage !== "partner") return;
  const payout = unit.property_id
    ? await payoutFor(db, unit.property_id)
    : null;
  if (payout && !payout.consent) return;
  if (!payout?.account)
    throw new Error(
      "Hatua 2: thibitisha akaunti ya malipo na idhini za wamiliki wote / Approve payout account before lease activation",
    );
}
