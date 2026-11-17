import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOperationalReview, renderOperationalReview, fetchOperationalReview, shiftDay } from '../ops/operationalReview.js';
import { sendWeeklyOperationalEmail } from '../ops/sendWeeklyEmail.js';
import { fetchOpsObservations } from '../dailyEmail/queries.js';

test('Friday review covers Saturday–Friday across year boundary with 28-day recurrence', () => {
  const result = buildOperationalReview({ endDay: '2027-01-01', observations: [
    { ymd: '2026-12-04', typeId: 'staff_absence', servicesAffected: ['lab'] },
    { ymd: '2026-12-05', typeId: 'staff_absence', servicesAffected: ['lab'] },
    { ymd: '2026-12-26', typeId: 'planned_closure', servicesAffected: ['lab', 'lab'] },
    { ymd: '2026-12-26', typeId: 'staff_absence', servicesAffected: ['lab'] },
    { ymd: '2027-01-01', typeId: 'staff_absence', servicesAffected: ['lab'], location_id: 'other' },
    { ymd: '2027-01-02', typeId: 'staff_absence', servicesAffected: ['lab'] },
  ] });
  assert.equal(result.startDay, '2026-12-26');
  assert.equal(result.historyStart, '2026-12-05');
  assert.equal(result.entries, 3);
  assert.equal(result.patterns.length, 2);
  const unknown = result.patterns.find(p => p.location === 'Sin ubicación registrada');
  assert.equal(unknown.entries, 2);
  assert.deepEqual(unknown.dates, ['2026-12-26']);
  assert.deepEqual(unknown.historyDates, ['2026-12-05', '2026-12-26']);
  assert.throws(() => shiftDay('2026-02-30', 0));
});

test('daily context excludes old/future entries and counts current automated flags separately', () => {
  const result = buildOperationalReview({ endDay: '2026-11-13', days: 1, observations: [
    { ymd: '2026-11-12', typeId: 'planned_closure', servicesAffected: ['den'] },
  ], insights: [
    { clinic_date: '2026-11-12', type: 'wait_anomaly' },
    { clinic_date: '2026-11-13', type: 'ops_observation' },
    { clinic_date: '2026-11-13', type: 'wait_anomaly', station: 'doc' },
    { clinic_date: '2026-11-13', type: 'wait_anomaly', station: 'lab' },
    { clinic_date: '2026-11-14', type: 'wait_anomaly' },
  ] });
  assert.equal(result.entries, 0);
  assert.equal(result.patterns.length, 0);
  assert.deepEqual(result.flagTypes, [{ type: 'wait_anomaly', records: 2, dates: ['2026-11-13'] }]);
  assert.match(renderOperationalReview(result), /Esto no confirma/);
});

test('email escapes staff content and keeps positive activity distinct from disruption', () => {
  const result = buildOperationalReview({ endDay: '2026-11-13', observations: [
    { ymd: '2026-11-13', typeId: 'servicioExtendido', notes: '<img src=x onerror=alert(1)>', servicesAffected: ['nut'], location: '<b>clinic</b>' },
  ] });
  const html = renderOperationalReview(result);
  assert.equal(result.patterns[0].theme, 'extra');
  assert.ok(!html.includes('<img'));
  assert.match(html, /&lt;img/);
  assert.match(html, /&lt;b&gt;clinic/);
});

function fakeDb(collections) {
  return { collection(name) {
    const filters = []; let size = Infinity, cursor, direction = 'asc', field;
    const q = { where(k, op, val) { filters.push([k, op, val]); return q; },
      orderBy(k, dir = 'asc') { field = k; direction = dir; return q; },
      select() { return q; }, limit(n) { size = n; return q; }, startAfter(doc) { cursor = doc.id; return q; },
      async get() {
        let rows = (collections[name] ?? []).map((data, i) => ({ id: String(i), data: () => data }));
        rows = rows.filter(d => filters.every(([k, op, val]) => op === '>=' ? d.data()[k] >= val : d.data()[k] <= val));
        if (field) rows.sort((a, b) => (String(a.data()[field]).localeCompare(String(b.data()[field])) || Number(a.id) - Number(b.id)) * (direction === 'desc' ? -1 : 1));
        if (cursor !== undefined) rows = rows.slice(rows.findIndex(d => d.id === cursor) + 1);
        const docs = rows.slice(0, size);
        return { docs, size: docs.length, empty: docs.length === 0, forEach(fn) { docs.forEach(fn); } };
      } };
    return q;
  } };
}

test('both readers page beyond a full page, including many records with the same date', async () => {
  const observations = Array.from({ length: 405 }, () => ({ ymd: '2026-11-13', typeId: 'staff_absence', servicesAffected: ['lab'] }));
  const db = fakeDb({ ops_observations: observations });
  const review = await fetchOperationalReview({ db, endDay: '2026-11-13' });
  assert.equal(review.entries, 405);
  assert.equal(review.patterns[0].dates.length, 1);
  const rows = await fetchOpsObservations({ db, startYMD: '2026-11-01', endYMD: '2026-11-13' });
  assert.equal(rows.length, 405);
  assert.equal(new Set(rows.map(r => r.id)).size, 405);
});

test('a reported closure still sends daily context when no visits are completed', async () => {
  const { sendDailyEmails, initDailyEmailDeps } = await import('../dailyEmail/sendDailyEmails.js');
  const { getClinicYMD } = await import('../dailyEmail/time.js');
  const db = fakeDb({ users: [{ email: 'team@example.test', permissions: { dailyEmail: true } }],
    ops_observations: [{ ymd: getClinicYMD(), typeId: 'planned_closure', servicesAffected: ['lab'], notes: 'Cerrado AM' }] });
  initDailyEmailDeps({ db, Timestamp: { fromDate: date => ({ toDate: () => date }) } });
  const messages = [];
  const result = await sendDailyEmails({ send: async message => messages.push(message) });
  assert.equal(result[0].status, 'sent');
  assert.match(messages[0].html, /Cerrado AM/);
  assert.match(messages[0].html, /Esto no confirma ausencia de pacientes/);
  const testMessages = [];
  await sendDailyEmails({ recipientsOverride: [{ email: 'self@example.test' }], persist: false,
    send: async message => testMessages.push(message) });
  assert.deepEqual(testMessages.map(m => m.to), ['self@example.test']);
});

test('weekly delivery uses exactly daily opt-ins, sends empty-coverage report, and continues after failure', async () => {
  const db = fakeDb({ users: [
    { email: 'one@example.test', permissions: { dailyEmail: true } },
    { email: 'no@example.test', permissions: { dailyEmail: false } },
    { email: 'two@example.test', permissions: { dailyEmail: true } },
  ] });
  const sent = [];
  const result = await sendWeeklyOperationalEmail({ db, endDay: '2026-11-13', sendEmail: async message => {
    sent.push(message); if (message.to === 'one@example.test') throw new Error('temporary failure');
  } });
  assert.deepEqual(sent.map(m => m.to), ['one@example.test', 'two@example.test']);
  assert.deepEqual(result.map(r => r.status), ['failed', 'sent']);
  assert.match(sent[1].subject, /2026-11-07 al 2026-11-13/);
  assert.match(sent[1].html, /No se registraron observaciones/);
});
