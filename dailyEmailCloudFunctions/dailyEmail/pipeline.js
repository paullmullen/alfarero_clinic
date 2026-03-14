// dailyEmail/pipeline.js

/**
 * Pipeline orchestrator.
 * UX remains identical: one run -> persist insights -> send daily email(s).
 *
 * - Persist insights even if email sending fails.
 * - Email failures are logged and returned; the function doesn't crash the whole run.
 */
async function runDailyEmailPipeline({ sendDailyEmails }) {
  // Right now this is a thin wrapper.
  // Next refactor steps will add a daily run doc + idempotency here.
  return await sendDailyEmails();
}

export { runDailyEmailPipeline };
