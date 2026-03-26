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

Goal: Barcode scans update station status consistently with UI behavior
and support repeat station encounters.

- [ ] Define station data structure with `encounters[]` array
- [ ] Define encounter object schema (timestamps, closed flag, stats_recorded flag)

### Transition Engine (Shared Logic)

- [ ] Create shared transition helper (used by both scanner and UI)
- [ ] Ensure all status changes flow through this helper
- [ ] Enforce allowed state transitions (no accidental regressions)
- [ ] Treat duplicate events as no-ops (idempotency)

### Waiting → In Process

- [ ] Implement `waiting → in_process` transition
- [ ] Set `waiting_end` timestamp
- [ ] Calculate `waiting_time`
- [ ] Set `in_process_start`
- [ ] Create or update active encounter

### In Process → Complete

- [ ] Implement `in_process → complete` transition
- [ ] Set `in_process_end`
- [ ] Calculate `procedure_time`
- [ ] Mark encounter as `closed`

### Encounter Handling

- [ ] Create new encounter when re-entering a station after leaving it
- [ ] Preserve prior encounters (no overwriting history)
- [ ] Ensure top-level timing fields represent **latest encounter only**
- [ ] Assign stable `encounter_id` for each encounter

### Stats Integration (Daily Stats Collection)

- [ ] Append `procedure_time` to `procedure_time_data` when encounter closes
- [ ] Append `waiting_time` to `waiting_time_data` when applicable
- [ ] Ensure stats writes occur **only once per encounter**
- [ ] Add `stats_recorded` flag to prevent duplicate writes
- [ ] Handle retry scenarios safely (idempotent updates)

### Integration with Existing System

- [ ] Integrate with existing `updateStatusChange` routing logic
- [ ] Confirm scanner path produces identical results to UI actions
- [ ] Verify behavior with mixed scanner + manual updates

### Edge Case Validation

- [ ] Validate repeated station flows (e.g., doc → lab → doc)
- [ ] Validate duplicate scan handling
- [ ] Validate out-of-order event handling
- [ ] Validate partial encounters (e.g., never completed)

### Final Verification

- [ ] Confirm timing fields are correct across all transitions
- [ ] Confirm stats collection reflects real encounter durations
- [ ] Confirm no duplicate stats entries occur

---

# Phase 3 --- Route Advancement

Goal: Correct promotion of next station.

- [ ] Implement auto-promotion of next station
- [ ] Ensure promotion occurs only when no station is active
- [ ] Prevent automatic promotion for `lab` and `pha`
- [ ] Verify manual routing behavior by anfitrión
- [ ] Implement duplicate scan protection
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

---

# Estimated Effort

Phase Estimated Sessions

---

Backend event system 4--5
Station state updates 3
Routing logic 2
Ticket printing 3
Scanner hardware 3
Testing 3

Total estimate:

**18--20 half-day development sessions**

---

# Usage

Update this checklist as tasks are completed.\
Each check mark represents a completed development milestone.

Recommended file location:

docs/project-plan.md
