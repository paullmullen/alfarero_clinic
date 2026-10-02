# Daily email chart corrections and acceptance

## Confirmed code defects

- The waiting heatmap read cumulative station waiting time and assigned it to the latest waiting-start hour. Repeated encounters therefore lost their original hour and contributed a cumulative total as a single sample.
- Both transition adapters deep-clone plan-of-care data through JSON. Serialized timestamps can consequently be stored as seconds/nanoseconds objects, which the old heatmap rejected because they lacked `toDate()`.
- The heatmap used only fully completed patient visits. Completed station encounters in otherwise unfinished visits were omitted.
- Location stacks omitted all records without `location_id`. If any location series existed, the chart showed only those series; historical visits without a location disappeared from the total.
- Historical report runs shifted the source query's lower bound but not the timeline labels or observation window. The query also had no upper bound, so later days could enter historical comparisons.

Matrix cell coordinates in chartjs-chart-matrix 3.0.0 represent the upper-left corner. The existing label center calculation is correct and remains unchanged.

## Metric definitions after correction

**Visit-volume chart:** one registered visit document per clinic-local `start_time` date, including visits that are not complete. Location subtotals sum to the registered-visit total; missing location IDs appear as **Sin ubicación**. Invalid/missing start times cannot be assigned to a day. Daily chart dates include zero-volume days; existing average calculations continue to exclude zero-patient days.

**Heatmap:** average recorded waiting minutes per completed station encounter, grouped by the encounter's clinic-local waiting-start hour. The overall visit need not be complete. Existing encounter history is authoritative; cumulative station totals are never added alongside it. Older records without encounter history retain the legacy step-based fallback. Open waits and unfinished procedures remain excluded by default; the existing `includeInProgress` option admits recorded waits for in-process/observation encounters. A blank cell means no samples; a green `0.0` cell is a measured zero wait. Empty hours between observed hours retain their actual position.

The heatmap considers encounters in the report day from the bounded recent-visit snapshot, including recent visits registered before that day. Visits registered more than 30 days before the report day are outside that query's coverage.

**Historical runs:** timeline labels, observations, and the recent-patient query end at the requested report day rather than the current day.

## Automated validation

From the repository root:

```powershell
npm --prefix dailyEmailCloudFunctions test
```

Tests cover repeat encounters, averages, serialized timestamps, unfinished overall visits, legacy records, real zero versus missing values, invalid/open waits, date boundaries, missing locations, historical query bounds, year rollover, and real chart rendering. Pure aggregation tests were also run with UTC, America/Chicago, and Asia/Tokyo server timezones. Chart previews were visually inspected using synthetic records.

No production records were accessed, emails sent, or Cloud Functions deployed during this investigation. Production data reconciliation remains open.

## Deployment and live acceptance

After merging and testing, deploy the daily Functions codebase from the repository root:

```powershell
firebase deploy --only functions:daily --project alfarero-478ad
```

A frontend Hosting deployment and Firestore rules changes are not required for these corrections.

1. Select a known clinic day and independently count visit documents by Guatemala-local `start_time`, including those without location IDs and those not complete. Compare each location subtotal and the overall total with the chart. The completed-only summary elsewhere in the email can be lower than the registered-visit chart.
2. Select examples containing a repeat station encounter and a completed station in an unfinished overall visit. Independently group completed encounters by their waiting-start hour and station; sum seconds, divide by encounter count and by 60, then compare the displayed rounded values.
3. Check that missing-location visits appear under Sin ubicación and that zero waits are distinct from empty cells. Verify hour labels and station rows in the actual email client.
4. For a shifted report, check that the last chart date and observation window match the requested day and that later records do not contribute to historical calculations.
5. Record the report date and reconciled counts before closing REPORT-01/REPORT-02. Triggering a manual report sends to all daily-email recipients; use only an explicitly authorized send or verify the next scheduled report.
