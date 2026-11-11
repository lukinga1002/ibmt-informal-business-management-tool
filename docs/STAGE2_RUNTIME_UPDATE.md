# Stage 2 runtime update — 11 November 2026

The founder supplied a screenshot of localhost:5173/rent/sim showing the administrator identity and 13/13 existing built-in checks passed. This confirms access and displayed test results for that page only; it does not prove the complete Stage 2 workflow or other roles.

After repairing the local SDK dependency cache, three anonymous function probes executed but returned 500. The matching server log showed SDK 403 with extra_data.reason=auth_required. Added requestUser to normalize only SDK 401 or SDK 403/auth_required to a missing session, producing the existing 401 SESSION_EXPIRED response. Genuine service failures still produce a generic 500 without diagnostics.

35 automated tests pass, including SDK rejection shapes, outage behavior and prior ownership/council permission tests. These use mocked SDK storage. Runtime replay after fetching this correction, signed-in Stage 2 screens, responsive screenshots and hosted entity RLS verification remain outstanding. No completed release verification is claimed.
