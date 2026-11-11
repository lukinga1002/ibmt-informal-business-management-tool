// SDK me() rejects anonymous requests instead of returning null.
// Only an authentication rejection becomes a missing session; service failures
// still propagate so callers do not mistake an outage for a signed-out user.
export async function requestUser(app) {
  try {
    return await app.auth.me();
  } catch (error) {
    const status = error?.status ?? error?.response?.status;
    const data = error?.data ?? error?.response?.data;
    if (status === 401 || (status === 403 && data?.extra_data?.reason === 'auth_required')) {
      return null;
    }
    throw error;
  }
}
