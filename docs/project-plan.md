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

Goal: Barcode scans update station status consistently with current UI behavior,
assuming patients are already initialized with a valid starting state.

## Patient Initialization (Registration Flow)

- [x] Ensure `plan_of_care` preserves exact order from `visit_types.plan_of_care`
- [x] Set first station in plan to `waiting` on patient creation
- [x] Set `waiting_start` timestamp at creation time
- [x] Assign `"2"`, `"3"`, etc. to subsequent stations
- [x] Set all non-visit stations to `pending`
- [x] Verify scanner pipeline does NOT initialize missing states
- [ ] Add validation check for malformed or empty `plan_of_care`
- [ ] Add unit test for `buildPlanOfCare`

## Transition Engine (Scanner Path Only for Now)

- [x] Implement scanner-specific transition helper/path
- [x] Enforce current allowed forward transitions
- [x] Treat duplicate events as no-ops where possible
- [x] Assume valid initial state exists (no null → waiting transitions)
- [ ] Refactor into a shared transition engine later if still valuable

## Waiting → In Process

- [x] Implement `waiting → in_process` transition
- [x] Set `waiting_end` timestamp
- [x] Calculate `waiting_time`
- [x] Set `in_process_start`
- [x] Create or update active encounter

## In Process → Complete

- [x] Implement `in_process → complete` transition
- [x] Set `in_process_end`
- [x] Calculate `procedure_time`
- [x] Mark encounter as `closed`

## Encounter Handling

- [x] Create new encounter when re-entering a station after leaving it
- [x] Preserve prior encounters (no overwriting history)
- [x] Ensure top-level timing fields represent **latest encounter only**
- [ ] Assign stable `encounter_id` for each encounter

## Stats Integration (Daily Stats Collection)

- [x] Append `procedure_time` to `procedure_time_data` when encounter closes
- [x] Append `waiting_time` to `waiting_time_data` when applicable
- [x] Ensure stats writes occur **only once per encounter**
- [x] Add `stats_recorded` flag to prevent duplicate writes
- [ ] Handle retry scenarios safely under repeated/near-simultaneous events

## Integration with Existing System

- [ ] Integrate scanner logic with existing `updateStatusChange` routing logic
- [x] Confirm scanner path can advance patient state end-to-end
- [ ] Confirm scanner path produces identical results to UI actions
- [ ] Verify behavior with mixed scanner + manual updates
- [x] Confirm Registro → scanner pipeline handoff is seamless

## Edge Case Validation

- [ ] Validate repeated station flows (e.g., doc → lab → doc)
- [ ] Validate duplicate scan handling
- [ ] Validate out-of-order event handling
- [ ] Validate partial encounters (e.g., never completed)
- [x] Validate patient creation produces a correct initial `waiting` station

## Final Verification

- [ ] Confirm timing fields are correct across all transitions
- [ ] Confirm stats collection reflects real encounter durations
- [ ] Confirm no duplicate stats entries occur

---

# Phase 3 --- Route Advancement

Goal: Correct promotion and scanner-driven advancement of the next station.

- [x] Implement scanner-driven station advancement
- [x] Ensure advancement respects current plan order
- [x] Prevent scanner from inventing missing initial state
- [ ] Preserve scanner transition correctness without forcing automatic next-station promotion
- [ ] Leave lab/pharmacy routing choices to Anfitrión when multiple next stations are operationally possible
- [ ] Prevent automatic promotion for `lab` and `pha`
- [ ] Verify manual routing behavior by anfitrión
- [x] Implement basic duplicate scan protection
- [ ] Create `room_event_exceptions` collection
- [ ] Log operational anomalies

---

# Phase 4 --- Ticket Printing

Goal: Patients receive a printed barcode ticket.

- [ ] Implement barcode generation for `visit_id`
- [ ] Select barcode format (recommended: CODE128)
- [ ] Design ticket layout
- [ ] Implement ticket printing logic
- [ ] Connect restaurant-style thermal printer
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

ADMIN:ENTER_CONFIG\
ADMIN:SET_WIFI_SSID:ClinicNet\
ADMIN:SET_WIFI_PASS:xxxxx\
ADMIN:SET_ROOM:ROOM_A\
ADMIN:SET_STATION:lab\
ADMIN:SAVE\
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
- [ ] Refactor to a shared transition engine if justified by real usage

---

# Estimated Effort

Phase Estimated Sessions

---

Backend event system 4--5  
Station state updates 1--2  
Routing logic 1--2  
Ticket printing 3  
Scanner hardware 3  
Testing 3

Total estimate:

**15--18 half-day development sessions**

---

# Usage

Update this checklist as tasks are completed.  
Each check mark represents a completed development milestone.

Recommended file location:

docs/project-plan.md
