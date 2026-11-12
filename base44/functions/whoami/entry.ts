import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { requestUser } from "../../shared/requestUser.ts";
import { fail, json } from "../../shared/moneyOps.ts";

/**
 * The role and jurisdiction the screens may use: the same trusted view every
 * function authorises with (shared/trustedRole.ts). A role a user wrote into
 * their own profile is not returned, so it opens no screen.
 */
export default async function (req) {
  try {
    const app = createClientFromRequest(req);
    const user = await requestUser(app);
    if (!user) return fail(401, "SESSION_EXPIRED", "Sign in required");
    const data = user.data || {};
    const admin = user.role === "admin";
    return json({
      subject_id: user.id,
      display_name: user.full_name || user.email,
      admin,
      role: data.ibmt_role || (admin ? "admin" : "public"),
      role_source: user.role_grant_id ? "grant" : data.ibmt_role ? "self_service" : admin ? "platform_admin" : "none",
      jurisdiction: {
        council_id: user.role_grant_id ? data.council_id || null : null,
        wards: Array.isArray(data.ward_ids) ? data.ward_ids : [],
        district: user.role_grant_id ? data.district || null : null,
        region: user.role_grant_id ? data.region || null : null,
      },
    });
  } catch {
    return fail(500, "SERVER", "Could not read your access");
  }
}
