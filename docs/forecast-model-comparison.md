# Compare Zone 3 volume models

After merging and pulling, run from the repository root (no Firebase deployment):

```powershell
node ./analyticsFunctions/forecast-cli.js --project=alfarero-478ad --as-of=2026-10-02 --compare --output=zone3-comparison.json
```

Reads daily summaries once, writes only the local JSON report. Original command without `--compare` retains the eight-observation mean baseline. Existing ingestion completion and pending-day checks still apply.

Candidates:

| Model | Method |
|---|---|
| mean4 | Mean of last four same-weekday observations |
| mean8 | Original eight-observation mean |
| mean12 | Mean of last twelve same-weekday observations |
| median8 | Median of last eight; keeps low days in the data |
| trend8 | Eight-observation mean multiplied by recent-four/prior-four mean ratio, capped at 0.75–1.25; falls back to mean with fewer than eight |

All use a maximum 112-day history and require four observations. Exclude known closed dates from open-day demand, retain unexplained low counts, and do not impute unexplained gaps as zero. Same calendar and known-date closure semantics as the baseline apply. Trend adjustment changes the level, not an extrapolated daily slope. Min/max ranges remain descriptive observations, even when the trend point estimate falls outside them; they are not model-specific calibrated intervals.

Use the first 120 days of the 180-day evaluation window for development. Choose the candidate with lowest average MAE across the three lead times on that period only. The latest 60 days are validation; they do not select the winner. Every model is scored on exactly the same available open-day targets within each period and lead. Selection weights the three lead times equally, so 1- and 7-day results may be identical for weekday-only models.

Review `selected_on_development`, `validation`, and `validation_improvement_fraction` (positive means improvement relative to mean8). The command does not promote a model automatically. A small difference may be noise; inspect bias and consistency across leads before changing the baseline. This holdout is for the first fixed comparison: repeatedly tuning against it would require a new validation period. Historical corrected summaries are used, so original as-known data revisions cannot be replayed.

Share those report fields for review. No real comparative results are available until run against the clinic summaries. Appointments, holidays, weather and promotion features remain future steps. The confirmed September 24, 2026 volume of 15 stays in every candidate's eligible input.
