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

- [ ] Define final `room_events` schema
- [ ] Document event fields in `workflow-spec.md`
- [ ] Create Postman scanner simulator collection
- [ ] Implement HTTP ingestion endpoint
- [ ] Verify events are written to `room_events`
- [ ] Create Cloud Function trigger for new events
- [ ] Implement visit lookup using `visit_id`
- [ ] Add exception handling for missing visit

---

# Phase 2 --- Station State Updates

Goal: Barcode scans update station status.

- [ ] Implement `waiting → in_process` transition
- [ ] Record `in_process_start` timestamp
- [ ] Implement `in_process → complete` transition
- [ ] Record `in_process_end` timestamp
- [ ] Calculate `procedure_time`
- [ ] Integrate existing `updateStatusChange` routing logic
- [ ] Confirm barcode path matches current UI behavior

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
