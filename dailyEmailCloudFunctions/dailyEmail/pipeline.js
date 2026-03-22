// dailyEmail/pipeline.js

/**
 * Pipeline orchestrator.
 * UX remains identical: one run -> persist insights -> send daily email(s).
 *
 * - Persist insights even if email sending fails.
 * - Email failures are logged and returned; the function doesn't crash the whole run.
 *
 * DEBUG SUPPORT:
 * - reportShiftDays allows the caller to run the entire pipeline as if the
 *   report date were N clinic-days earlier.
 * - This is primarily used for development/testing when current-day data is empty.
 * - Default is 0 (normal production behavior).
 */
async function runDailyEmailPipeline({ sendDailyEmails, reportShiftDays = 0 }) {
  // Pass through to the core function
  return await sendDailyEmails({ reportShiftDays });
}

export { runDailyEmailPipeline };
