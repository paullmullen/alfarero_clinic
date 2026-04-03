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

- [ ] Define canonical scan payload format (e.g., `VISIT:<visit_id>`)
- [ ] Select barcode format (recommended: CODE128)
- [ ] Generate barcode images in frontend
- [ ] Verify scanner reads barcode correctly

## Ticket Design

- [ ] Design ticket layout (barcode + human-readable info)
- [ ] Include patient-facing identifiers if helpful
- [ ] Ensure readability under real-world conditions (lighting, folds, smudging)

## Printing Implementation

- [ ] Implement ticket printing logic from frontend
- [ ] Connect thermal printer
- [ ] Verify print quality and scan reliability
- [ ] Implement ticket reprint capability

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
