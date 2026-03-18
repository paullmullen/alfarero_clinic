# Clínica Alfarero --- Patient Flow System Documentation

This folder contains the technical documentation for the barcode-driven
patient workflow system used in **Clínica Alfarero**.

The goal of the system is to track patient visits and automatically
update clinic workflow using barcode scans at each service station.

This documentation is intended for:

- developers
- clinic leadership
- technical collaborators
- future maintainers of the system

---

# Documentation Structure

## workflow-spec.md

**Primary system specification.**

This document defines the authoritative rules of the system, including:

- visit data model
- `plan_of_care` structure
- station status definitions
- routing logic
- barcode event schema
- backend processing requirements
- implementation phases

If there is ever a question about **how the system should behave**, this
file is the source of truth.

---

## architecture-overview.md

**High-level architecture diagram and explanation.**

This document describes the major components of the system and how they
interact.

Topics include:

- registration and ticket printing
- barcode scanning stations
- event ingestion
- backend processing
- visit updates
- exception handling

This file is intended to help someone quickly understand the **overall
system design**.

---

## event-processing-flow.md

**Backend processing logic for scan events.**

This document shows how the system processes barcode scans stored in the
`room_events` collection.

It describes:

- event ingestion
- validation
- visit lookup
- station identification
- duplicate protection
- routing decisions
- `plan_of_care` updates
- exception logging

This is primarily useful for developers implementing or modifying
backend logic.

---

## plan-of-care-state-machine.md

**Station state machine and routing behavior.**

This document describes the allowed transitions for each station in a
patient's `plan_of_care`.

It includes:

- the station state machine
- routing decision logic
- conditions for automatic promotion
- situations requiring manual routing by the anfitrión

This document clarifies how station states evolve during a visit.

---

# Key System Concepts

## Patient Visit

A visit represents a single interaction between a patient and the
clinic.

Each visit document contains:

- patient information
- visit metadata
- a `plan_of_care`
- operational timing metrics

---

## Plan of Care

The `plan_of_care` defines the expected route through clinic services.

Each entry includes:

- station identifier
- visit order
- station status
- timestamps for waiting and service
- procedure duration metrics

Typical station statuses include:

Status Meaning

---

pending station not part of the route
waiting patient waiting for service
in_process service currently underway
complete station service finished

---

## Barcode Visit Ticket

At registration, the system prints a ticket containing:

- patient summary information
- a barcode representing the visit
- a human-readable visit identifier

The barcode identifies the **visit**, not the patient.

The ticket travels with the patient and is scanned at each station.

---

## Scanner Stations

Scanner stations will eventually consist of:

- a Raspberry Pi
- a USB barcode scanner
- WiFi connectivity

Each station sends scan events to the backend.

Station configuration is performed using **administrative setup
barcodes**.

---

## Scan Events

Every barcode scan produces a new record in:

`room_events`

These events are **immutable** and represent the raw operational history
of patient movement.

Backend logic interprets these events to update the visit.

---

## Exception Handling

Operational anomalies are stored in:

`room_event_exceptions`

Examples include:

- visit not found
- invalid station
- duplicate scan
- invalid state transition

These records allow debugging and operational review.

---

# High-Level System Flow

Registration\
↓\
Create visit document\
↓\
Generate visit barcode\
↓\
Print visit ticket\
↓\
Patient moves through clinic\
↓\
Barcode scanned at station\
↓\
Scanner sends event to backend\
↓\
Event stored in `room_events`\
↓\
Backend processing updates visit\
↓\
`plan_of_care` status updated\
↓\
Clinic UI reflects new patient status

---

# Development Workflow

When working on the system:

1.  Refer to **workflow-spec.md** for the authoritative system rules.
2.  Review diagrams in the architecture and state machine documents.
3.  Implement changes in code.
4.  Update documentation when system behavior changes.
5.  Keep diagrams aligned with real implementation logic.

---

# Future Documentation

Additional documents may be added later for:

- scanner hardware design
- operational analytics
- device configuration procedures
- system deployment architecture
- testing plans
