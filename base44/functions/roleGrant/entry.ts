import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { requestUser } from "../../shared/requestUser.ts";
import { cleanText, fail, json } from "../../shared/moneyOps.ts";
import { GRANTED_ROLES } from "../../shared/trustedRole.ts";

/**
 * Admin-only assignment of privileged roles (see shared/trustedRole.ts).
 * Every grant and revocation needs a reason and is written to the audit log.
 * The user's profile copy is updated too, so their screens match, but the
 * profile copy never authorises anything.
 */
export default async function (req) {
  try {
    const app = createClientFromRequest(req);
    const user = await requestUser(app);
    if (!user) return fail(401, "SESSION_EXPIRED", "Sign in required");
    if (user.role !== "admin") return fail(403, "FORBIDDEN", "Only the platform admin assigns roles");
    const input = await req.json();
    const db = app.asServiceRole.entities;
    const action = cleanText(input.action);
    const audit = (name, subjectId, reason, detail) =>
      db.AuditLog.create({
        actor_id: user.id,
        actor_role: "platform_admin",
        action: name,
        subject_type: "RoleGrant",
        subject_id: subjectId,
        outcome: "confirmed",
        reason,
        occurred_at: new Date().toISOString(),
        detail,
      });

    if (action === "list") {
      const page = await db.RoleGrant.filter({ status: "active" }, "-created_date", 200);
      return json({ grants: Array.isArray(page) ? page : page.items || [] });
    }

    const reason = cleanText(input.reason);
    if (reason.length < 10) return fail(422, "VALIDATION", "Record the reason (at least 10 characters)");

    if (action === "grant") {
      const subjectId = cleanText(input.subject_id);
      const role = cleanText(input.ibmt_role);
      if (!GRANTED_ROLES.includes(role)) return fail(422, "VALIDATION", "Choose a privileged role");
      if (subjectId === user.id) return fail(409, "SELF_GRANT", "An admin does not grant roles to themselves");
      const subject = await db.User.get(subjectId).catch(() => null);
      if (!subject) return fail(404, "NOT_FOUND", "No such user");
      const councilId = cleanText(input.council_id) || null;
      const wards = Array.isArray(input.ward_ids) ? input.ward_ids.map(cleanText).filter(Boolean) : [];
      if (role === "council_official" && !councilId) return fail(422, "VALIDATION", "A council official needs a council");
      if (role === "mtaa_officer" && !wards.length) return fail(422, "VALIDATION", "A ward officer needs at least one ward");
      if (councilId && !(await db.Council.get(councilId).catch(() => null))) return fail(422, "VALIDATION", "Unknown council");
      const now = new Date().toISOString();
      // One active grant per user: an earlier one is revoked, not edited.
      const page = await db.RoleGrant.filter({ subject_id: subjectId, status: "active" }, "-created_date", 20);
      for (const old of Array.isArray(page) ? page : page.items || [])
        await db.RoleGrant.update(old.id, { status: "revoked", revoked_by: user.id, revoked_at: now, reason: `Replaced: ${reason}` });
      const grant = await db.RoleGrant.create({
        subject_id: subjectId,
        ibmt_role: role,
        council_id: councilId,
        ward_ids: wards,
        district: cleanText(input.district) || null,
        region: cleanText(input.region) || null,
        status: "active",
        reason,
        granted_by: user.id,
        granted_at: now,
      });
      await db.User.update(subjectId, {
        data: { ...(subject.data || {}), ibmt_role: role, council_id: councilId, ward_ids: wards, district: grant.district, region: grant.region },
      });
      await audit("role.granted", grant.id, reason, { subject_id: subjectId, ibmt_role: role, council_id: councilId, ward_ids: wards });
      return json({ grant });
    }

    if (action === "revoke") {
      const grant = await db.RoleGrant.get(cleanText(input.id)).catch(() => null);
      if (!grant || grant.status !== "active") return fail(404, "NOT_FOUND", "No active grant with that id");
      const now = new Date().toISOString();
      await db.RoleGrant.update(grant.id, { status: "revoked", revoked_by: user.id, revoked_at: now, reason });
      const subject = await db.User.get(grant.subject_id).catch(() => null);
      if (subject) {
        const data = { ...(subject.data || {}) };
        delete data.ibmt_role;
        delete data.ward_ids;
        await db.User.update(subject.id, { data });
      }
      await audit("role.revoked", grant.id, reason, { subject_id: grant.subject_id, ibmt_role: grant.ibmt_role });
      return json({ revoked: grant.id });
    }

    return fail(422, "VALIDATION", "Unknown action");
  } catch {
    return fail(500, "SERVER", "Could not update the role");
  }
}
