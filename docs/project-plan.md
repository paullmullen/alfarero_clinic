# Barcode Patient Flow System

## Project Plan (Volunteer Development)

This project plan breaks development into small tasks that can typically
be completed in **½ day (2--4 hours)** of coding or testing.

Each item should produce either:

- a visible feature
- a verified backend behavior
- or a documented system improvement

---

# Phase 1 --- Backend Event Pipeline

Goal: The system can **accept scan events and locate visits**.

- [x] Define final `room_events` schema
- [x] Document event fields in `workflow-spec.md`
- [x] Create Postman scanner simulator collection
- [x] Implement HTTP ingestion endpoint
- [x] Verify events are written to `room_events`
- [x] Create Cloud Function trigger for new events
- [x] Implement visit lookup using `visit_id`
- [x] Add exception handling for missing visit

---

# Phase 2 --- Station State Updates

Goal: Barcode scans and manual actions update station status consistently,
with full encounter tracking and correct cumulative timing.

## Patient Initialization (Registration Flow)

- [x] Ensure `plan_of_care` preserves exact order from `visit_types.plan_of_care`
- [x] Set first station in plan to `waiting` on patient creation
- [x] Set `waiting_start` timestamp at creation time
- [x] Assign `"2"`, `"3"`, etc. to subsequent stations
- [x] Set all non-visit stations to `pending`
- [x] Verify scanner pipeline does NOT initialize missing states
- [ ] Add validation check for malformed or empty `plan_of_care`
- [ ] Add unit test for `buildPlanOfCare`

## Transition Engine (State Logic)

- [x] Implement scanner-driven transition engine
- [x] Implement manual status change engine
- [x] Ensure consistent allowed transitions
- [x] Treat duplicate events as no-ops where possible
- [x] Prevent invalid station transitions
- [ ] Refactor into shared transition engine later if justified

## Encounter Handling

- [x] Create new encounter when entering/re-entering a station
- [x] Preserve prior encounters (no overwriting history)
- [x] Support repeated station visits (doc → lab → doc)
- [x] Ensure encounters are append-only
- [x] Ensure top-level timestamps represent **latest encounter**
- [x] Ensure top-level timing fields represent **cumulative totals across encounters**
- [ ] Assign stable `encounter_id` for each encounter (formalize rules)

## Stats Integration (Daily Stats Collection)

- [x] Append `procedure_time` to stats when encounter closes
- [x] Append `waiting_time` when applicable
- [x] Ensure stats writes occur only once per encounter
- [x] Add `stats_recorded` flag to prevent duplicate writes
- [x] Ensure stats triggered from both scanner and manual paths
- [ ] Handle retry scenarios safely under repeated events

## Manual Path Parity

- [x] Manual status changes use same transition engine concepts as scanner
- [x] Reconcile encounters on manual transitions
- [x] Update cumulative timing totals on manual path
- [x] Trigger stats on manual encounter closure
- [x] Validate identical behavior between scanner and manual paths
- [x] Validate mixed manual + scanner workflows

## Edge Case Validation

- [x] Validate repeated station flows (doc → lab → doc)
- [x] Validate duplicate scan handling
- [x] Validate out-of-order event handling
- [x] Validate partial encounters (never completed)
- [x] Validate mixed scanner + manual transitions

## Final Verification

- [ ] Confirm timing fields are correct across all transitions
- [ ] Confirm cumulative totals match sum of encounters
- [ ] Confirm stats collection reflects true encounter durations
- [ ] Confirm no duplicate stats entries occur

---

# Phase 3 --- Route Advancement

Goal: Correct promotion and routing of next station.

- [x] Implement scanner-driven station advancement
- [x] Ensure advancement respects plan order
- [x] Prevent scanner from inventing missing initial state
- [x] Prevent automatic promotion for `lab` and `pha`
- [ ] Verify manual routing behavior by anfitrión
- [x] Validate promotion behavior under mixed manual/scanner scenarios
- [ ] Create `room_event_exceptions` collection _(after real-world usage)_
- [ ] Log operational anomalies

---

# Phase 4 --- Ticket Printing

Goal: Patients receive a printed barcode ticket that reliably drives the system.

## Barcode Definition

- [x] Define canonical scan payload format (e.g., `VISIT:<visit_id>`)
- [x] Select barcode format (recommended: QR)
- [x] Generate barcode images in frontend
- [x] Verify scanner reads barcode correctly

## Ticket Design

- [x] Design ticket layout (barcode + human-readable info)
- [x] Include patient-facing identifiers if helpful
- [x] Ensure readability under real-world conditions (lighting, folds, smudging)

## Printing Implementation

- [x] Implement ticket printing logic from frontend
- [x] Connect thermal printer
- [x] Verify print quality and scan reliability
- [x] Implement ticket reprint capability

---

# Phase 5 --- Scanner Station Hardware

Goal: Build a physical scanning station.

- [ ] Install Raspberry Pi OS
- [ ] Configure WiFi connectivity
- [ ] Connect USB barcode scanner
- [ ] Verify scanner reads printed ticket
- [ ] Build script to send scan events
- [ ] Implement scanner device identity
- [ ] Implement station configuration via admin barcodes

Example admin codes:

ADMIN:ENTER_CONFIG
ADMIN:SET_WIFI_SSID:ClinicNet
ADMIN:SET_WIFI_PASS:xxxxx
ADMIN:SET_ROOM:ROOM_A
ADMIN:SET_STATION:lab
ADMIN:SAVE
ADMIN:REBOOT

---

# Phase 6 --- Operational Testing

Goal: Validate real clinic workflows.

- [ ] Simulate full patient flow
- [ ] Verify timing calculations
- [ ] Test duplicate scans
- [ ] Test missing visit behavior
- [ ] Test invalid station scans
- [ ] Test lab/pharmacy manual routing
- [ ] Test emergency workflows (non-reg starting station)
- [ ] Run small pilot with single scanner

---

# Phase 7 --- Future Improvements

Optional enhancements once the core system works.

- [ ] Offline scan buffering
- [ ] Scanner health monitoring
- [ ] Device configuration UI
- [ ] Analytics dashboards
- [ ] Patient flow heatmaps
- [ ] Staff mobile scanning option
- [ ] Shared transition engine (only if justified by real usage)

---

# Estimated Effort

| Phase                 | Estimated Sessions |
| --------------------- | ------------------ |
| Backend event system  | 4--5               |
| Station state updates | 2--3               |
| Routing logic         | 1--2               |
| Ticket printing       | 3                  |
| Scanner hardware      | 3                  |
| Testing               | 3                  |

Total estimate:

**16--19 half-day development sessions**

---

# Usage

Update this checklist as tasks are completed.
Each check mark represents a completed development milestone.

Recommended file location:

docs/project-plan.md


---

# Backlog Review — October 2, 2026

This review takes precedence over older unchecked deployment milestones above.
The historical checklist is retained; an unchecked item is not proof that work is still outstanding.

## Newly added work

| ID | Priority | Item | Status |
| --- | --- | --- | --- |
| REPORT-01 | High | Correct daily email waiting heatmap data | Code defects corrected on review branch; live-day reconciliation pending |
| REPORT-02 | High | Investigate daily email total visit chart data | Missing-location omission and historical-date defects corrected on review branch; live-day reconciliation pending |
| ANALYTICS-01 | Medium | Explore AI insights from accumulated clinic data | Discovery; follows reporting data validation |

### REPORT-01 — Daily email waiting heatmap

The user reports incorrect heatmap data. Trace the source query, station/encounter aggregation, units, clinic-local hour assignment, and eligibility filters through the rendered chart.

Initial code-review lead (not a confirmed root cause): `waitingHeatmap.js` groups top-level cumulative `waiting_time` using the latest `waiting_start`, rather than iterating encounters. Check repeated station visits and incomplete encounters. Confirm whether completed-only filtering reflects the intended metric. Verify that missing samples are distinguishable from an actual zero wait.

Done when a manually reconciled sample clinic day, including a repeated station encounter, matches the heatmap values and hour/station placement, and the generated email is visually verified.

### REPORT-02 — Daily email total visit chart

The user suspects incorrect daily visit totals. Establish the definition of a visit, then reconcile source records, daily totals, location subtotals, and the email chart for several known clinic days.

Check clinic-local date boundaries, organization/location scope, duplicate records, missing timestamps, legacy schema, and incomplete visits. Preserve the earlier requirement that averages exclude clinic-closed zero-patient days; distinguish this from how the daily chart displays dates.

Initial code-review lead (not a confirmed root cause): `buildLocationVolumeData` in `dailyVolumeWithObservations.js` skips patients without `location_id`. Determine whether historical records have this field and whether omitted records explain the discrepancy. Review upstream queries and pipeline before concluding.

Done when total visits and location subtotals reconcile to independently counted source records, omitted/invalid records have an explicit treatment, and representative daily emails render the correct totals.

### ANALYTICS-01 — AI insights discovery

Explore which operational questions can be answered reliably from accumulated data. Begin with a field/history inventory, coverage and data-quality assessment, and a short ranked proposal.

Candidate questions:
- Where and when do queues and long waits develop?
- How do patient volume, service mix, and visit duration change over time and by location?
- Which station patterns suggest capacity or staffing adjustments?
- Which days or workflows differ unusually from comparable clinic days?
- Do recorded operational observations correspond with changes in volume or flow?

Assess these as hypotheses, not established findings. Identify what ordinary statistics can establish and where AI adds value, such as explaining verified trends or surfacing patterns for review. Use aggregate/de-identified inputs for initial exploration. Document sample sizes, missingness, and limitations; do not infer causation from association.

Done when a small set of useful, feasible insight prototypes is proposed with required fields, validation method, and expected operating cost. This item does not authorize deploying an AI feature or transferring patient-level data to a new service.

## Existing work and status reconciliation

| Area | Review status | Next action |
| --- | --- | --- |
| Scanner end-to-end installation verification | Completed per user confirmation on August 24 | Keep closed; older unchecked hardware checklist is stale |
| Scanner image build, shrink, compression, checksum | Work carried out in September | Confirm fresh-card Raspberry Pi Imager acceptance before closing image deployment acceptance |
| Scanner and local print-server deployment documentation, accessible PDFs | Baseline completed and closed by user in August | Reopen only for a specific defect/change |
| Station-based automatic ticket printing | User reported working September 30 | Keep implementation closed |
| Automatic ticket printing settings placement | User requested moving controls into Locations September 30; completion not established here | Verify latest implementation before treating as remaining work |
| Local print-server operational deployment | Remaining work from August review; current completion needs reconciliation | Check clean Windows install, versioned distribution, startup/recovery/logging, error handling, address/mode validation, Spanish characters, real clinic acceptance |
| Timing/statistics verification and retry safety | Older plan contains unchecked items; not independently verified in this review | Check actual coverage; relate to reporting defects where the same aggregation is involved |
| Deferred release lifecycle | Deferred; later scanner publication work may supersede parts | Reconcile manifest/publication status; retain update policy, rollback, cleanup, version/health visibility, audit history and diagnostics as candidates |
| Other future improvements | Deferred | Offline buffering, monitoring, replacement/reprovisioning support, batch preparation, credential rotation, support matrix, external API surface, optional mobile scanning |
| Frontend bundle optimization | Low priority | Retain `docs/tech-debt.md`; revisit after operational/reporting work |
| Shared transition engine | Conditional, deferred | Refactor only if actual usage justifies it |

## Recommended order

1. Investigate REPORT-01 and REPORT-02 together, retaining separate acceptance criteria.
2. Reconcile outstanding local print-server deployment and the requested Locations settings placement.
3. Verify image deployment acceptance only if the fresh-card test remains outstanding.
4. Undertake ANALYTICS-01 once reporting inputs and metric definitions are trusted.
5. Retain optional lifecycle, monitoring, performance, and architecture work as deferred.

## October 2 chart investigation follow-up

Confirmed defects and validation steps are documented in [daily-email-chart-validation.md](daily-email-chart-validation.md). Regression and rendering tests pass using synthetic data. REPORT-01 and REPORT-02 remain open until the fixes are merged, deployed, and reconciled against a known production clinic day. The earlier suspicion about cell-label centering was checked against the matrix implementation and was not a defect.
