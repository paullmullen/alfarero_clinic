# Automatic patient tickets

## Configuration

Open **Admin → Ticket printing** (`/settings/ticket-printing`). For each location,
select the stations that should trigger an automatic ticket. Changes save when
the selection changes. Clear the selection to disable automatic tickets.

The selector includes all stations defined in the clinic's station collection
(`stats`), including inactive stations. Choices are independent of the services
available at that location.

## Behavior

When a new patient registration is saved, the app checks the saved Plan of Care
against the registration's location. If any selected station is included in the
visit (`waiting` or `planned`), the app prints one ticket using the location's
existing print format and printer configuration. Unused `pending` entries do not
match. The existing `none` print format continues to disable printing.

Later Plan of Care edits do not automatically print a ticket. Manual printing
from Anfitrión is unchanged and does not consult this setting.

## Data and rollout

Each `locations/{locationId}` document can contain `auto_print_stations`, an array
of station IDs. An absent field and an empty array both disable automatic
printing. New locations start with an empty array. The existing live location
subscription supplies updated settings to registration screens.

Deploying this change stops automatic printing at existing locations until an
administrator selects stations. No data migration or Firestore rules change is
required by the repository's current rules.

## Acceptance checks

1. Select a station for location A and register a patient whose visit includes it:
   one ticket prints, including when the global location is All Locations and A
   is chosen on the registration form.
2. Include several selected stations: only one ticket prints.
3. Register a visit that excludes the selected stations: no ticket prints.
4. Clear A's selection and reload settings: it stays empty and registrations do
   not print automatically.
5. Configure location B differently and confirm its registrations use B's choices.
6. Select a station not available at the location: the selection saves without a
   consistency check.
7. Print manually from Anfitrión with automatic printing disabled: the existing
   manual print flow still works.

Automated matching tests: `CI=true npm test -- --watchAll=false --runInBand`.
Production build: `npm run build`.
