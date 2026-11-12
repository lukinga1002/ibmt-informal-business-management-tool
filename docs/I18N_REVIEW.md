# Language switching — review pack (Stage 2)

Status: **engineering complete; Swahili wording NOT yet reviewed by a native speaker.**
The release must not go to real users until the review below is signed off.

## What the interface does

| Rule | How it is enforced |
| --- | --- |
| EN shows English only; SW shows Swahili only | Every release screen reads text from `src/i18n/en.json` / `sw.json`. `tests/i18n.test.mjs` scans release screens for hard-coded or combined text; the budget is **0** and `RELEASE_GATE=1` fails on any leak. |
| No combined labels ("Jengo / Property") or bilingual paragraphs | Scanner rule plus "no translation mixes both languages" test. Strings that are identical in both files are rejected unless they are proper names (allowlist in the test). |
| Backend error codes shown in the selected language | `fnError` maps each code to `errors.*`; errors are stored as `{ err }` / `{ key, vars }` and rendered by `errorText` at draw time, so an error already on screen changes language when the user switches. Test: "every backend error code has a message in both languages". |
| Names, reference numbers, amounts, user-entered content preserved | Values pass through `{vars}` interpolation and are never translated; amounts use `toLocaleString` with `sw-TZ` / `en-TZ`. |
| Choice remembered across navigation and reloads | `prefs` key `ibmt.pref.lang` (this device only; not a business record). The provider starts from it, writes it on switch and sets `<html lang>`. Test: `tests/i18n-documents.test.mjs`. |
| Consent wording versioned; accepted language recorded | Registration, unit registration, payout nomination, consent withdrawal and the privacy desk send `language` and a text version; the server records them. `Consent` rows are server-written and append-only (`create`/`update` false in the entity rules), so a later change never rewrites what was accepted. |
| Signed documents keep their wording | Lease clauses render from the stored lease (`terms.clauses[].en/.sw`) and the printable certificate keeps fixed wording; both are marked `i18n-document-start/end` and tested not to branch on the screen language. Switching language changes the surrounding interface only. |

## Native-speaker review (required before release)

Spreadsheet: [`docs/i18n/sw-review.csv`](i18n/sw-review.csv), 1,508 strings sorted by priority:

- **1-legal-or-money (287)**: consent disclosures, payout and withdrawal wording, lease signing, settlement and errors. Review first, and have a Tanzanian lawyer confirm the consent and lease wording too.
- **2-access (66)**: sign-in, registration, access-denied, codes.
- **3-general (1,155)**: everything else.

The reviewer fills `reviewer_ok` (yes/no) and `reviewer_suggestion`. Changes go back into `sw.json` only; keys must not change.

### Term choices made by engineering, to confirm

| English | Swahili used | Note |
| --- | --- | --- |
| broker | dalali | earlier screens said "broker" in Swahili mode |
| agent (licensed) | wakala | |
| mandate | mamlaka | earlier screens used "mandate" |
| unit | uniti | consider "chumba/nyumba" depending on context |
| tenancy | upangaji | earlier screens used "tenancy" |
| record | kumbukumbu | |
| one-time code | namba / namba ya kusaini | earlier "namba ya siri" (that means PIN/password, which may mislead) |
| simulation | majaribio | |
| template | kiolezo | |
| renewal | marudio / kuhuisha | two forms are in use; pick one |

### Flagged for decision, not just wording

1. Certificate header "Jamhuri ya Muungano wa Tanzania" can be read as a government document. Keep only with written authority; otherwise replace it.
2. Receipt PDF wording is generated separately and is not yet covered by this pack.
3. The Swahili-first default (`defaultLangForRole`) applies only before a person chooses. Confirm this with the pilot councils.

## Evidence

- `node --test tests/*.test.mjs` with `RELEASE_GATE=1`: all pass, none skipped.
- Browser evidence (EN and SW, mobile 375px and desktop, both signing parties) is recorded in the release evidence matrix.
