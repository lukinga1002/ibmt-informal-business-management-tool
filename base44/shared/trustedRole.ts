/**
 * Who the caller really is, for authorisation.
 *
 * Found on the hosted test app (2026-11-12): an ordinary user called
 * `PUT /entities/User/me` with a whole `data` object and set their own
 * `data.ibmt_role` to council_official (and a council id). The field rules on
 * `ibmt_role` and `council_id` only stop the top-level form; replacing `data`
 * wholesale is accepted. Every function that trusted `user.data.ibmt_role`,
 * `council_id` or `ward_ids` could then be reached: council money reads, and
 * ward-officer registration decisions (a landlord could approve their own unit).
 *
 * So privileged roles and their jurisdiction come only from RoleGrant, which
 * only an admin can write. Whatever a user wrote about themselves is ignored for
 * those roles. Self-service roles (landlord, tenant, consumer) keep working from
 * the profile, because anyone can take them through the normal sign-up flows.
 */
export const SELF_SERVICE_ROLES = ["landlord", "tenant", "consumer"];
export const GRANTED_ROLES = [
  "council_official",
  "mtaa_officer",
  "district_commissioner",
  "regional_commissioner",
  "district_official",
  "tra_admin",
  "ward_reporter",
  "agent",
  "operator",
  "super_admin",
];

export async function activeGrant(app, userId) {
  try {
    const page = await app.asServiceRole.entities.RoleGrant.filter(
      { subject_id: userId, status: "active" },
      "-created_date",
      5,
    );
    const rows = Array.isArray(page) ? page : (page && page.items) || [];
    return rows.find((g) => GRANTED_ROLES.includes(g.ibmt_role)) || null;
  } catch {
    // No grant can be read: no privileged role.
    return null;
  }
}

/** The user with privileged role fields replaced by the active grant (or removed). */
export async function trustedUser(app, user) {
  if (!user) return user;
  const data = { ...(user.data || {}) };
  if (data.ibmt_role && !SELF_SERVICE_ROLES.includes(data.ibmt_role)) delete data.ibmt_role;
  // Ward lists only ever authorise officers, so a self-written list never counts.
  delete data.ward_ids;
  const grant = await activeGrant(app, user.id);
  if (grant) {
    data.ibmt_role = grant.ibmt_role;
    data.council_id = grant.council_id || null;
    data.ward_ids = Array.isArray(grant.ward_ids) ? grant.ward_ids : [];
    data.district = grant.district || null;
    data.region = grant.region || null;
  }
  return {
    ...user,
    data,
    ibmt_role: data.ibmt_role ?? null,
    role_grant_id: grant ? grant.id : null,
  };
}

/** Drop-in for `app.auth.me()`: rejects exactly as it does, then applies trustedUser. */
export async function trustedMe(app) {
  const user = await app.auth.me();
  return trustedUser(app, user);
}
