import { cleanText, fail } from './moneyOps.ts';
import { hasAnyRole, isAdmin } from './r5.ts';

/**
 * Which council a council desk works in.
 *
 * A council official works in their own council and nowhere else — never in a
 * neighbouring one, even when both sit in the same district. An admin has no
 * council of their own, so the desk opens on the council that holds the most
 * registered units, unless a council is named in the request.
 *
 * Returns `{ council }`, or `{ refusal }` carrying the response to send back.
 */
export async function resolveCouncil(base44, user, payload = {}) {
  const page = await base44.asServiceRole.entities.Council.list({ limit: 100 }).catch(() => ({ items: [] }));
  const councils = page.items || [];
  if (!councils.length) return { refusal: fail(409, 'NO_COUNCIL', 'No council is configured yet') };

  if (isAdmin(user)) {
    const wanted = cleanText(payload && payload.council_id);
    const chosen = councils.find((row) => row.id === wanted);
    if (chosen) return { council: chosen };
    const unitPage = await base44.asServiceRole.entities.RentalUnit.list({ limit: 500 }).catch(() => ({ items: [] }));
    const counts = new Map();
    for (const unit of unitPage.items || []) {
      if (!unit.district) continue;
      counts.set(unit.district, (counts.get(unit.district) || 0) + 1);
    }
    const busiest = [...councils].sort((a, b) => (counts.get(b.district) || 0) - (counts.get(a.district) || 0))[0];
    return { council: busiest || councils[0] };
  }

  if (!hasAnyRole(user, ['council_official'])) {
    return { refusal: fail(403, 'FORBIDDEN', 'Only a council official can open the council desk') };
  }

  const data = user.data || {};
  const council =
    councils.find((row) => row.id === data.council_id) ||
    councils.find((row) => row.district === data.district) ||
    null;
  if (!council) return { refusal: fail(403, 'JURISDICTION', 'Your council is not configured yet') };
  return { council };
}