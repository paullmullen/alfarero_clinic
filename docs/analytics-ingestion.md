# Zone 3 analytics ingestion — first implementation

This foundation creates reusable visit/context projections and daily summaries. It does not train a model, call an AI service, send emails, change existing charts, or modify source records. It uses the default Firestore database in the explicitly supplied Firebase project, not a database named `nam5` (that is the database location).

## Sources and scope

- `patients`: explicit `Zone3`, `Zone 3`, or `Clínica Alfarero Z3`, plus missing/blank location tags. Explicit other locations are excluded. Confirm those aliases against the actual location documents before live backfill.
- `appointments`: known Zone 3 aliases accepted; explicit other locations excluded. Missing location retained as unknown.
- `ops_observations`, `operational_insights`: same context scope rule. Unknown scope is retained for review, never treated as confirmed Zone 3 closure/demand.
- `ops_observation_types`: classification metadata, keyed by type code.

Only structured allowlisted fields are copied. Gender, age group, free-text reason, event notes, service types, and timing episodes are retained. Names, DPI/national ID, telephone, guardian names, creators, source patient IDs, and name-containing appointment match keys are omitted. Stable SHA-256 projection keys support updates and appointment-to-visit links; those internal keys should not be passed to future AI prompts. Free text is retained as entered; no extensive cleansing pipeline is introduced.

## Stored collections

| Collection | Purpose |
| --- | --- |
| `analytics_records` | One replaceable normalized record per relevant source document |
| `analytics_daily` | One summary per Guatemala clinic date, for Zone 3 |
| `analytics_dirty_days` | Days needing rebuilding, with a generation counter |
| `analytics_ingestion` | Per-source backfill cursor, progress, and short worker lease |
| `analytics_reports` | Current Zone 3 coverage report |

The new collections are server-only under the included rules adjustment. Other existing collection access is preserved. Deploy those rules before ingestion. The frontend does not yet read these collections.

## Timing definitions

Populated encounter arrays are authoritative. Top-level cumulative station durations are not added again. Records without populated encounter arrays use legacy fields, with their provenance retained. Duration samples require numeric nonnegative seconds and supporting start/end timestamps; untimed zero defaults are missing measurements. Closed waiting-only episodes are counted separately from delivered procedures. Completed station status and completed encounter count are separate measures.

Daily summaries are cohorts grouped by **visit arrival date**, not a cross-midnight station event ledger. Hourly waiting distributions use each completed episode's waiting-start hour, within that visit cohort. This first version retains episodes so a later event-day analysis can be derived without rereading patients. It reports recorded durations rather than fabricating durations for open procedures. Unknown operating days remain unknown; a service-specific closure does not imply that the whole clinic closed.

Summaries contain registered/completed visits, arrivals by hour, demographics, service/visit mix, visit and station duration distributions, and coverage counts. The quality report records missing dates, location fallback usage, encounter coverage, reason coverage, pending summaries, and source progress. Gaps are not assumed to be closed days or zero demand.

Appointments retain booking creation time and scheduled time. Current status is retained, but this implementation does not reconstruct historical cancellation/status changes or produce forecasts. Historical model testing must not use later admission status as advance knowledge. Derived operational insights remain separate from staff observations and measured patient outcomes.

## Development checks

```powershell
npm --prefix analyticsFunctions ci
npm --prefix analyticsFunctions test
```

Unit tests use synthetic records and an in-memory transaction/query test double. A separate real Firestore emulator test covers backfill, corrections, deletions, quality reporting, and rules. They cover normalization, identity omission, scope, timing fallback, repeat encounters, retry/no-op behavior, date corrections, deletion, summary generation conflicts, and resumable paging. All 14 unit tests and the Firestore emulator integration test passed. Production reconciliation remains required before accepting live ingestion. No existing app dependencies change.

Run the integration check from the repository root:

```powershell
firebase emulators:exec --only firestore --project demo-multimedica-analytics "npm --prefix analyticsFunctions run test:emulator"
```

This uses an isolated demo project and never connects to the production database. Java must meet the installed Firebase CLI emulator requirements.

## Deployment and small first run

After reviewing and merging this change, from the repository root:

```powershell
firebase deploy --only firestore:rules --project alfarero-478ad
firebase deploy --only functions:analytics --project alfarero-478ad
```

The five source-write triggers must be installed **before** historical backfill so new documents and edits behind the paging cursor are captured. The scheduled builder processes up to 30 dirty days every 15 minutes; additional days remain queued. Triggers reread the current source in a transaction, so old/repeated events cannot restore stale projections. Only changed normalized content is rewritten. Summary publication checks the dirty generation atomically.

The local CLI needs Google Application Default Credentials, separately from Firebase CLI login:

```powershell
gcloud auth application-default login
npm --prefix analyticsFunctions run backfill -- --project=alfarero-478ad --source=patients --batch=100 --pages=1
npm --prefix analyticsFunctions run rebuild -- --project=alfarero-478ad --days=30
npm --prefix analyticsFunctions run report -- --project=alfarero-478ad
```

These commands read source records and write only new analytics collections. Review the first sample's counts and fields against source records before running the full backfill. No automated production run has been performed by the author.

## Full backfill and resumption

```powershell
npm --prefix analyticsFunctions run backfill -- --project=alfarero-478ad --batch=100 --pages=1000
npm --prefix analyticsFunctions run rebuild -- --project=alfarero-478ad --days=500
npm --prefix analyticsFunctions run report -- --project=alfarero-478ad
```

Repeat backfill until every source reports `complete`. Repeat rebuild while `pending_days` is nonzero. Report `backfill_complete` is false until all source checkpoints finish. Progress is persisted after each successful page. Failed pages can replay; projections are replacements, not additive counters. A worker lease expires after five minutes after a hard interruption. A concurrently running worker must not share the same source checkpoint. Future normalization-version migrations will require an explicit rebackfill strategy; this version has no reset command.

The backfill pays for source enumeration plus current-source/projection transaction reads and writes; it is not a single billed read per patient. Subsequent analyses read summaries/projections, and rebuilding reads only affected days. Live patient edits still incur trigger/transaction costs. Summary freshness is currently eventual (up to the scheduler interval); refresh-on-demand before future daily email analysis is a later integration step.

## Acceptance

1. Confirm actual source collection names, location aliases, and default database.
2. Check a small backfill includes missing-tag visits and excludes other locations.
3. Reconcile two known days, including a legacy visit and a repeat encounter visit.
4. Edit a source's date/reason and verify projections and both affected days update; delete a test source in the emulator and verify removal.
5. Confirm client reads/writes to new analytics collections are denied and existing app behavior is unchanged.
6. Complete backfill, drain dirty days, review coverage report before beginning forecast experiments.
