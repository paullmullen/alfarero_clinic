# Operational email review

The daily report includes a Spanish **Contexto operativo del día** section before its charts. It groups today's staff observations by theme, service, and recorded location; counts entries and distinct dates; and shows recurrence over the 28 days ending on the report date. Daily automated flags remain separate from staff observations. On days without completed visits, recorded observations or saved flags produce a context-only email; the report does not infer that the clinic closed or had no arrivals.

A separate **Revisión Operativa Semanal** email is scheduled for **Friday at 17:30 America/Guatemala**, after the existing 17:00 daily report. It covers the preceding Saturday through Friday, inclusive, using information available at generation time. Friday records may receive later updates. Its recipients are exactly the users with `permissions.dailyEmail === true` and an email address; no new recipient setting is introduced.

The weekly report contains:

- Staff themes and services with entries, distinct dates, and 28-day recurrence (including the current week).
- A few recent supporting notes and dates, with a notice if more entries or groupings exist.
- Saved automated flag counts and distinct flagged dates, excluding observation-derived informational flags.
- Suggestions for team discussion, followed by a prompt to choose an action, owner, and review date. Actions are not stored or tracked by this implementation.

Observations are grouped by their recorded type, with extra services/outreach separated from availability, equipment, and events. Missing locations remain explicitly unassigned. Staff reports can describe a partial-day closure or a change continuing beyond its entry date. One entry mentioning several services contributes to several service rows, but total entries count it once. No patient names, patient records, or creator fields are fetched for the weekly report; staff notes are included as entered and escaped for HTML.

Both operational collections are read directly rather than through the limited analytics projections. Queries are paginated; no silent 800-document cap is used for recurrence. The weekly email reads 28 days of observations and seven days of saved insights. No AI service or forecasting is involved. Saved insights are incomplete snapshots: key collisions, reruns, and older unremoved flags mean their counts are review leads rather than verified incident frequencies. Current missing reports do not establish normal service.

## Verification and rollout

Tests cover period boundaries, distinct-date counts, location separation, HTML escaping, exclusion of duplicated observation-derived flags, pagination with tied dates, existing recipient opt-ins, empty reporting periods, and continued delivery after an individual recipient fails. The existing reporting and rendering suite should pass too.

No production email or deployment is performed by these changes. Review a local sample before rollout. From the repository root, deployment of this feature would update the two existing daily functions and add the new weekly function:

```powershell
firebase deploy --only functions:daily:manualDailyEmail,functions:daily:scheduledDailyEmail,functions:daily:scheduledWeeklyOperationalEmail --project alfarero-478ad
```

The weekly function uses the existing provider secrets and sender. Delivery is sequential and individual failures are returned and counted in logs; retries are disabled for the weekly scheduler to avoid automatically resending to successful recipients. Scheduler delivery is not guaranteed exactly once. There is no delivery ledger or automatic retry of failed recipients.

Operational counts are snapshots at send time, not finalized end-of-day reconciliations. The weekly schedule is independent of daily delivery, so a failure of the daily email does not suppress the weekly review.

## Send a test only to yourself

The temporary Statistics self-test panel was removed after user testing. The authenticated test endpoint remains available for maintenance. It accepts daily or weekly reports ending 0–14 calendar days ago; 0 uses the current Guatemala clinic date. A weekly test covers the seven days ending on that date. Tests use the same generators and email provider, prefix subjects with `[PRUEBA / TEST]`, and do not persist operational insights. A daily test with no completed visits, observations or saved flags reports that no email was generated. Weekly tests can show an empty-period report.

The new POST endpoint `testOperationalEmail` validates a Firebase ID token with revocation checking. The caller must have stats, settings, or dailyEmail permission and an email address on an enabled Firebase Auth account. The Firebase `emailVerified` flag is not required, since provider sign-ins may not populate it. Both recipient override and transport validation enforce that single account email; recipient fields in the request cannot select another address. Provider failures return an error rather than a false success. The existing broadcast daily button remains separate.

For maintenance, the test endpoint can be deployed independently of the weekly schedule:

```powershell
firebase deploy --only functions:daily:testOperationalEmail --project alfarero-478ad
```

Build and deploy the frontend using the normal project configuration to remove the temporary controls. The test endpoint includes the updated generators in its deployment even if the scheduled daily function has not been redeployed. The Gmail provider import matches the existing `gmalSmtpMailer.js` filename. Provider acceptance is not a guarantee of inbox delivery.
