# Local simulation council setup

When the council query succeeds with no rows, both Stage 2 council panels show an explicit empty state. The shared selector also distinguishes loading from API failure and includes a reload button.

For a Vite development page on loopback with a loopback Base44 backend, the empty state offers Create local test data. This is an explicit administrator action, not automatic seeding. It creates a fictional SIM-TEST council in Stage 1 with proposed fees, and a placeholder SIM-LOCAL-TEST policy only if no active policy exists. It does not approve fees, invent legal references, enable Stage 2, or change an existing policy. Both selectors refresh after setup.

No setup button appears for production builds or remote backends. The helper checks the environment again and verifies auth.me().role is admin before writing. Entity RLS still applies. Local data disappears when base44 dev restarts. Remote mode must not be used for these fixtures.

38 automated tests, lint and production compilation pass for this change. Browser interaction with the new selector and actual fixture creation still require verification. This does not complete the Stage 2 release checks.
