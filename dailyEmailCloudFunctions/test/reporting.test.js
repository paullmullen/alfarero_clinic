import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWaitingHeatmapData } from '../charts/waitingHeatmapData.js';
import { buildLocationVolumeData } from '../charts/locationVolumeData.js';
import { computeDailyVolumeTimeline } from '../dailyEmail/metrics.js';
import { fetchLast30DaysPatients } from '../dailyEmail/queries.js';

const date = s => new Date(s);
const stamp = s => ({ toDate: () => date(s) });
const snapshot = patients => patients.map(data => ({ data: () => data }));
const range = { startOfToday: stamp('2026-10-01T06:00:00Z'),
  startOfTomorrow: stamp('2026-10-02T06:00:00Z'), timezoneOffsetMinutes: 360 };
const completed = (hour, seconds) => ({ status: 'complete',
  waiting_start: stamp(`2026-10-01T${hour}:00:00Z`), waiting_time: seconds });

test('repeated encounters retain their own hours and average, without cumulative double counting', () => {
  const rows = snapshot([{ plan_of_care: [{ station: 'doc', ...completed('18', 1800),
    encounters: [completed('14', 600), completed('18', 1200)] }] },
    { plan_of_care: [{ station: 'doc', encounters: [completed('14', 1200)] }] }]);
  const result = buildWaitingHeatmapData(rows, range);
  assert.deepEqual(result.hours, [8, 9, 10, 11, 12]);
  assert.deepEqual(result.values, [[15, null, null, null, 20]]);
  assert.deepEqual(result.counts, [[2, 0, 0, 0, 1]]);
});

test('completed encounters survive station re-entry and an unfinished overall visit', () => {
  const rows = snapshot([{ complete: false, plan_of_care: [{ station: 'doc', status: 'waiting',
    encounters: [completed('14', 600), { status: 'waiting', waiting_start: stamp('2026-10-01T18:00:00Z'), waiting_time: null }] }] }]);
  assert.deepEqual(buildWaitingHeatmapData(rows, range).values, [[10]]);
});

test('serialized encounter timestamps from adapter cloning are accepted', () => {
  const serialized = { _seconds: date('2026-10-01T14:00:00Z').getTime() / 1000, _nanoseconds: 0 };
  const rows = snapshot([{ plan_of_care: [{ station: 'lab', encounters: [
    { status: 'complete', waiting_start: serialized, waiting_time: 60 }] }] }]);
  assert.deepEqual(buildWaitingHeatmapData(rows, range).values, [[1]]);
});

test('legacy steps remain supported and zero waits differ from missing samples', () => {
  const rows = snapshot([{ plan_of_care: [{ station: 'doc', ...completed('14', 0) },
    { station: 'lab', ...completed('15', 120) }] }]);
  const result = buildWaitingHeatmapData(rows, range);
  assert.deepEqual(result.values, [[0, null], [null, 2]]);
});

test('invalid durations, open waits, and day boundaries cannot enter the heatmap', () => {
  const rows = snapshot([{ plan_of_care: [
    { station: 'doc', ...completed('14', -60) },
    { station: 'doc', ...completed('14', Infinity) },
    { station: 'doc', ...completed('14', NaN) },
    { station: 'doc', ...completed('14', 60), waiting_start: new Date('invalid') },
    { station: 'doc', ...completed('14', 60), status: 'waiting' },
    { station: 'doc', ...completed('14', 60), waiting_start: range.startOfTomorrow },
    { station: 'doc', ...completed('14', 60), waiting_start: range.startOfToday },
  ] }]);
  const result = buildWaitingHeatmapData(rows, range);
  assert.equal(result.diagnostics.included, 1);
  assert.deepEqual(result.hours, [0]);
});

test('encounter history prevents fallback to an obsolete cumulative total', () => {
  const rows = snapshot([{ plan_of_care: [{ station: 'doc', ...completed('14', 600),
    encounters: [{ status: 'waiting', waiting_time: null }] }] }]);
  assert.deepEqual(buildWaitingHeatmapData(rows, range).values, []);
});

test('includeInProgress accepts measured waits without inventing elapsed open waits', () => {
  const rows = snapshot([{ plan_of_care: [{ station: 'doc', encounters: [
    { ...completed('14', 120), status: 'in_process' },
    { ...completed('14', null), status: 'waiting' }] }] }]);
  assert.deepEqual(buildWaitingHeatmapData(rows, range).values, []);
  assert.deepEqual(buildWaitingHeatmapData(rows, { ...range, includeInProgress: true }).values, [[2]]);
});

const patients = [
  { location_id: 'a', location_name: 'Clinic A', start_time: stamp('2026-10-01T15:00:00Z') },
  { location_id: 'b', start_time: stamp('2026-10-01T16:00:00Z'), complete: false },
  { start_time: stamp('2026-10-01T17:00:00Z') },
  { location_id: ' ', start_time: stamp('2026-10-01T18:00:00Z') },
  { location_id: 'a', start_time: stamp('2026-10-01T05:59:59Z') },
  { location_id: 'a', start_time: stamp('2026-10-02T06:00:00Z') },
];
test('location stacks reconcile to all registered visits, including missing locations', () => {
  const timeline = computeDailyVolumeTimeline(snapshot(patients), 360, 2, date('2026-10-01T06:00:00Z'));
  assert.deepEqual(timeline.labels, ['2026-09-30', '2026-10-01']);
  assert.deepEqual(timeline.values, [1, 4]);
  const series = buildLocationVolumeData({ patients, labels: timeline.labels });
  assert.deepEqual(timeline.labels.map((_, i) => series.reduce((n, s) => n + s.data[i], 0)), timeline.values);
  assert.deepEqual(series.find(s => s.locationId === '__UNASSIGNED__').data, [0, 2]);
  assert.equal(series.find(s => s.locationId === '__UNASSIGNED__').label, 'Sin ubicación');
});

test('shifted reports use report date across month/year boundaries, independent of server timezone', () => {
  const timeline = computeDailyVolumeTimeline([], 360, 3, date('2026-01-01T06:00:00Z'));
  assert.deepEqual(timeline.labels, ['2025-12-30', '2025-12-31', '2026-01-01']);
  assert.deepEqual(timeline.values, [0, 0, 0]);
});

test('invalid and missing start timestamps do not crash location aggregation', () => {
  assert.deepEqual(buildLocationVolumeData({ patients: [{ start_time: new Date('invalid') }, {}], labels: ['2026-10-01'] }), []);
});

test('historical query is bounded before the report-day end', async () => {
  const clauses = [];
  const query = { where(...args) { clauses.push(args); return this; }, get: async () => 'snapshot' };
  const lower = stamp('2026-09-01T06:00:00Z');
  assert.equal(await fetchLast30DaysPatients({ db: { collection: () => query },
    startOf30DaysAgoTimestamp: lower, startOfTomorrow: range.startOfTomorrow }), 'snapshot');
  assert.deepEqual(clauses, [['start_time', '>=', lower], ['start_time', '<', range.startOfTomorrow]]);
});
