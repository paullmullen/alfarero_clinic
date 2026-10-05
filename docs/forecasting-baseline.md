# Zone 3 forecasting baseline

This first evaluation reads `analytics_daily` once, not patient records. It writes no Firestore data, sends no email, and requires no Functions deployment. Run locally after pulling this change; existing analyticsFunctions dependencies suffice.

From the repository root in PowerShell:

```powershell
node ./analyticsFunctions/forecast-cli.js --project=alfarero-478ad --as-of=2026-10-02 --output=zone3-forecast.json
```

`--as-of` must be a completed clinic date, never an incomplete current day. The result includes 28 calendar days of history, 14 daily predictions, and historical evaluation at 1-, 7-, and 14-calendar-day leads. These are individual daily predictions at different lead times, not weekly totals. Share the `evaluation` section for the first review. The output file is local and should not be committed.

The command refuses to run while ingestion is incomplete or days are pending rebuilding. It prints `latest_activity_date` so stale source data are visible. It does not refresh summaries automatically; run the ingestion rebuild CLI first if needed.

## Baseline and calendar

For an expected open day, take the mean of up to eight latest observations from the same weekday within the preceding 112 days. Require at least four. Only positive observed visit counts enter this open-day demand baseline: missing days and context-only zero summaries do not prove an open day with zero patients. Confirmed closures are excluded.

`analyticsFunctions/zone3-calendar.json` records the eight closures confirmed by Paul on October 4, 2026. This is a versioned calendar input; it does not modify ingestion summaries. Monday–Friday operation is an explicit initial assumption, editable via `open_weekdays` (Sunday=0). It must be checked before production publication. Earlier unexplained gaps remain unknown; earlier closure calendars are not inferred. Historical weekend activity remains visible in history, but default forecasts assume weekends closed.

Future confirmed closures can be added with a date, reason, and `known_on` date. The model returns zero only if the closure was known by the forecast date. These 2026 closures were confirmed retrospectively; no advance knowledge is fabricated for backtests. Closure facts may exclude historical closed dates from demand analysis, but closure-day forecasting accuracy is not evaluated here.

The min/max range describes the recent comparable observations, not a calibrated probability interval. Its empirical coverage is reported. Do not label it an 80% or 95% confidence interval.

## Reading accuracy

For the last 180 calendar days, each target is predicted using summaries dated at or before target minus its lead time. Evaluate observed open weekdays, excluding confirmed closures and unknown gaps. Report sample counts and skipped eligible dates alongside:

- `mae`: average absolute error in patients per day.
- `bias`: prediction minus actual; positive means overprediction.
- `wape`: total absolute error divided by total actual visits (fraction).
- `range_coverage`: fraction of actuals within the recent-observation range.

Historical summaries reflect current corrected data; we do not have snapshots of what their values were at each historical forecast date. This is a rolling-origin baseline evaluation, not a full replay of historical data availability. No real accuracy claims have been made until this runs against the clinic summaries. Holidays, weather, appointments and promotions are subsequent model features. No AI tuning service is required for this benchmark.

## Validation

```powershell
npm --prefix analyticsFunctions test
```

After evaluating accuracy, compare competing models on the same targets, then build the history-plus-outlook interface. This slice deliberately delivers a runnable benchmark before publishing predictions to users.
