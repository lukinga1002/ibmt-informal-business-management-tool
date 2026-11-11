// The hosted custom /login page cannot resume a cross-origin localhost flow.
// Use the provider endpoint for local Google sign-in; the SDK handles OAuth.
export function navigateToAppLogin(auth, currentHref, isDev = false) {
  const destination = new URL(currentHref);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(destination.hostname);
  if (isDev && loopback && ['http:', 'https:'].includes(destination.protocol)) {
    // Never echo bootstrap credentials into the OAuth return URL.
    for (const key of ['access_token', 'clear_access_token']) {
      destination.searchParams.delete(key);
    }
    return auth.loginWithProvider('google', destination.href);
  }
  return auth.redirectToLogin(currentHref);
}
