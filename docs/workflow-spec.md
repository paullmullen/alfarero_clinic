# Barcode Patient Flow System

Clínica Alfarero

Version: 1.0  
Last Updated: 2026-03-18

---

# Section Index

SYSTEM_OVERVIEW  
CONCEPTS  
VISIT_TICKET  
SCAN_EVENTS  
EVENT_PROCESSING  
TRANSITIONS  
DEDUP  
EXCEPTIONS  
SCANNER_STATION  
ADMIN_BARCODES  
IMPLEMENTATION  
TEST_PLAN

---

## Related Documents

Architecture overview:
docs/architecture-overview.md

Event processing logic:
docs/event-processing-flow.md

Plan of care state machine:
docs/plan-of-care-state-machine.md

---

# 1. System Overview

ID: SYSTEM_OVERVIEW

This system tracks patient movement through clinic services using barcode scans.

Each patient visit contains a `plan_of_care` representing the expected route through stations.

Barcode scans generate `room_events`, which backend services interpret to update the visit.

---

# 2. Key Concepts

ID: CONCEPTS

## Patient Visit

A visit represents a patient's interaction with the clinic during a single day.

Each visit document contains:

- patient information
- visit metadata
- plan_of_care
- operational metrics

---

## Plan of Care

`plan_of_care` represents the patient's expected route through clinic services.

Each entry includes:

- station
- order
- status
- timestamps
- procedure duration

Statuses include:

| Status     | Meaning                       |
| ---------- | ----------------------------- |
| pending    | station not included in route |
| waiting    | patient waiting               |
| in_process | service underway              |
| number     | planned sequence              |
| complete   | service finished              |

---

# 3. Visit Ticket

ID: VISIT_TICKET

At registration the system prints a ticket containing:

- patient summary
- visit barcode
- human-readable visit ID

The barcode identifies the **visit**, not the patient.

Example:

VISIT:abc123

The ticket accompanies the patient through the clinic.

---

# 4. Scan Events

ID: SCAN_EVENTS

Each barcode scan creates an event stored in:

room_events

Example fields:

event_type  
visit_id  
patient_id  
room_id  
station_id  
scanner_id  
source_type  
timestamp_utc  
received_at  
time_unsynced  
direction_hint

Events are immutable.

---

# 5. Backend Event Processing

ID: EVENT_PROCESSING

A Cloud Function processes each new `room_event`.

Responsibilities:

1. locate the active visit
2. identify the station
3. determine entry or exit
4. update plan_of_care
5. record timestamps
6. handle exceptions

---

# 6. State Transitions

ID: TRANSITIONS

## Entry

waiting → in_process

Updates:

- in_process_start
- lastUpdate

---

## Exit

in_process → complete

Updates:

- in_process_end
- procedure_time
- lastUpdate

---

## Route Advancement

After completion, the next numbered station becomes:

waiting

Stations marked `pending` should not automatically activate.

### Special Routing Case: Laboratory and Pharmacy

Stations `lab` and `pha` may represent alternative next steps in a patient's visit.

After a station transitions from `in_process` to `complete`, the system normally promotes the next eligible station to `waiting`.

Exception:

If both `lab` and `pha` remain active in the patient's `plan_of_care` (status other than `pending` or `complete`), the system does **not** automatically promote either station.

Instead:

- the visit remains unchanged
- the anfitrión manually promotes one station to `waiting`
- the other station remains unchanged in the plan

## This allows operational flexibility depending on service availability.

# 7. Duplicate Scan Protection

ID: DEDUP

Scanners may produce repeated reads.

The system must prevent duplicate events from modifying a visit multiple times.

Strategies include:

- time-window suppression
- deterministic dedupe keys
- idempotent processing

---

# 8. Exception Handling

ID: EXCEPTIONS

Errors are recorded in:

room_event_exceptions

Examples include:

- visit not found
- station mismatch
- duplicate event
- invalid state transition
- scan on completed visit

---

# 9. Scanner Station Design

ID: SCANNER_STATION

Scanner stations will eventually use:

- Raspberry Pi
- USB barcode scanner
- WiFi connection

Stations read barcodes and send events to the backend.

---

# 10. Station Configuration

ID: ADMIN_BARCODES

Stations are configured via admin barcodes.

Example commands:

ADMIN:ENTER_CONFIG  
ADMIN:SET_WIFI_SSID:ClinicNet  
ADMIN:SET_WIFI_PASS:xxxxx  
ADMIN:SET_ROOM:ROOM_A  
ADMIN:SET_STATION:lab  
ADMIN:SAVE  
ADMIN:REBOOT  
ADMIN:EXIT_CONFIG

Admin codes must be distinguishable from patient codes.

---

# 11. Implementation Plan

ID: IMPLEMENTATION

## Phase 1 — Backend Logic

Use Postman to simulate scanner events.

Implement:

- room_events ingestion
- Cloud Function processor
- plan_of_care updates
- duplicate protection

---

## Phase 2 — Ticket Printing

Implement:

- visit barcode generation
- ticket template
- printer integration
- ticket reprint

---

## Phase 2.5 — Station Simulator

Create a software simulator to emulate scanner stations.

Goals:

- validate configuration
- test event payloads
- test admin barcode parsing

---

## Phase 3 — Hardware Station

Build Raspberry Pi scanner station.

Features:

- barcode scanning
- local configuration
- event submission
- user feedback

---

## Phase 4 — Operational Improvements

Future enhancements may include:

- offline buffering
- device monitoring
- analytics dashboards
- system integrations

---

# 12. Test Plan

ID: TEST_PLAN

A detailed testing plan will include:

- unit tests
- backend integration tests
- barcode scanning tests
- ticket printing tests
- deduplication tests
- end-to-end workflow tests
