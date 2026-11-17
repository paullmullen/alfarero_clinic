import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestEmailHandler } from '../ops/testEmail.js';

function harness(overrides = {}) {
  const calls = [];
  const deps = {
    db: { collection: () => ({ doc: uid => { assert.equal(uid, 'caller'); return { get: async () => ({ exists: true, data: () => ({ permissions: { stats: true } }) }) }; } }) },
    auth: { verifyIdToken: async (token, revoked) => { assert.equal(token, 'token'); assert.equal(revoked, true); return { uid: 'caller' }; }, getUser: async () => ({ email: 'self@example.test', emailVerified: true }) },
    sendEmail: async message => calls.push(message),
    sendDailyEmails: async options => { assert.equal(options.persist, false); assert.deepEqual(options.recipientsOverride, [{ email: 'self@example.test' }]); await options.send({ to: options.recipientsOverride[0].email, subject: 'Daily' }); return [{ status: 'sent' }]; },
    sendWeeklyOperationalEmail: async options => { assert.deepEqual(options.recipientsOverride, [{ email: 'self@example.test' }]); await options.sendEmail({ to: options.recipientsOverride[0].email, subject: 'Weekly' }); return [{ status: 'sent' }]; },
    ...overrides,
  };
  const res = { statusCode: null, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  return { handler: createTestEmailHandler(deps), res, calls };
}
const request = body => ({ method: 'POST', headers: { authorization: 'Bearer token' }, body });

for (const kind of ['daily', 'weekly']) test(`${kind} test uses authenticated address despite supplied recipient and labels subject`, async () => {
  const h = harness();
  await h.handler(request({ kind, reportShiftDays: 3, recipient: 'everyone@example.test', recipientsOverride: [{ email: 'other@example.test' }] }), h.res);
  assert.equal(h.res.statusCode, 200);
  assert.equal(h.res.body.recipient, 'self@example.test');
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].to, 'self@example.test');
  assert.match(h.calls[0].subject, /^\[PRUEBA \/ TEST\]/);
});

test('missing authentication and unauthorized callers cannot generate mail', async () => {
  const h = harness();
  await h.handler({ method: 'POST', headers: {}, body: { kind: 'daily' } }, h.res);
  assert.equal(h.res.statusCode, 401);
  const denied = harness({ db: { collection: () => ({ doc: () => ({ get: async () => ({ exists: true, data: () => ({ permissions: {} }) }) }) }) } });
  await denied.handler(request({ kind: 'daily' }), denied.res);
  assert.equal(denied.res.statusCode, 403);
  assert.equal(denied.calls.length, 0);
});

test('provider accounts without the Firebase verified flag can send only to their account address', async () => {
  const h = harness({ auth: { verifyIdToken: async () => ({ uid: 'caller' }), getUser: async () => ({ email: 'self@example.test', emailVerified: false }) } });
  await h.handler(request({ kind: 'weekly', recipient: 'other@example.test' }), h.res);
  assert.equal(h.res.statusCode, 200);
  assert.deepEqual(h.calls.map(m => m.to), ['self@example.test']);
});

test('missing addresses, disabled accounts, invalid dates and wrong methods are rejected', async () => {
  for (const user of [{}, { email: 'self@example.test', disabled: true }]) {
    const h = harness({ auth: { verifyIdToken: async () => ({ uid: 'caller' }), getUser: async () => user } });
    await h.handler(request({ kind: 'weekly' }), h.res);
    assert.equal(h.res.statusCode, 403);
    assert.equal(h.calls.length, 0);
  }
  for (const body of [{ kind: 'other' }, { kind: 'daily', reportShiftDays: -1 }, { kind: 'daily', reportShiftDays: 15 }, { kind: 'daily', reportShiftDays: 0.5 }]) {
    const h = harness(); await h.handler(request(body), h.res); assert.equal(h.res.statusCode, 400); assert.equal(h.calls.length, 0);
  }
  const h = harness(); await h.handler({ method: 'GET' }, h.res); assert.equal(h.res.statusCode, 405);
});

test('transport refuses expanded recipient lists even if a sender attempts one', async () => {
  const h = harness({ sendDailyEmails: async options => { await options.send({ to: 'other@example.test', subject: 'Bad' }); } });
  await h.handler(request({ kind: 'daily' }), h.res);
  assert.equal(h.res.statusCode, 500);
  assert.equal(h.calls.length, 0);
});

test('provider failure and no-data are not reported as a successful send', async () => {
  const failed = harness({ sendDailyEmails: async () => [{ status: 'failed' }] });
  await failed.handler(request({ kind: 'daily' }), failed.res); assert.equal(failed.res.statusCode, 502);
  const empty = harness({ sendDailyEmails: async () => [] });
  await empty.handler(request({ kind: 'daily' }), empty.res); assert.equal(empty.res.body.status, 'no_data'); assert.equal(empty.calls.length, 0);
});
