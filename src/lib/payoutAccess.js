/**
 * Who may open the payout page.
 *
 * Landlords and the platform admin always may. Anyone else may only when the
 * server reports at least one property where they are on the verified owner
 * roster (stage2Payout `properties`), which is how a joint owner who is not
 * the registered landlord reaches the approval they must give. The server
 * still authorises every payout action; this only decides which screen shows.
 *
 * Returns 'allow', 'deny' or 'checking' (the server answer is not in yet).
 */
export function payoutPageAccess({ user, role, ownedPropertyCount }) {
  if (!user) return 'deny';
  if (user.role === 'admin' || role === 'landlord') return 'allow';
  if (ownedPropertyCount === null || ownedPropertyCount === undefined) return 'checking';
  return Number(ownedPropertyCount) > 0 ? 'allow' : 'deny';
}

/** Only the server's own verified-roster answer counts; a failed call denies. */
export async function verifiedOwnerPropertyCount(callFn) {
  try {
    const response = await callFn('stage2Payout', { action: 'properties' });
    return Array.isArray(response?.properties) ? response.properties.length : 0;
  } catch {
    return 0;
  }
}
