import { buildArrivalTimeData } from "./buildArrivalTimeData";
const instant = "2026-10-02T14:15:00.000Z"; // 08:15 Guatemala
const seconds = Date.parse(instant) / 1000;
test("ISO, Date, Firestore, and serialized timestamps count in the same clinic hour", () => {
  const values = [instant, new Date(instant), Date.parse(instant),
    { toDate: () => new Date(instant) }, { seconds, nanoseconds: 0 },
    { _seconds: seconds, _nanoseconds: 0 }];
  const rows = buildArrivalTimeData(values.map(start_time => ({ start_time })));
  expect(rows).toHaveLength(24);
  expect(rows[8]).toEqual({ hour: 8, count: 6 });
  expect(rows.reduce((sum, row) => sum + row.count, 0)).toBe(6);
});
test("midnight and late arrivals use clinic hours, not the browser timezone", () => {
  const rows = buildArrivalTimeData([
    { start_time: "2026-10-02T06:00:00Z" }, { start_time: "2026-10-03T05:59:59Z" },
  ]);
  expect(rows[0].count).toBe(1);
  expect(rows[23].count).toBe(1);
});
test("invalid and missing timestamps do not fabricate midnight arrivals", () => {
  const rows = buildArrivalTimeData([{}, null, ...[null, "", "invalid", {},
    new Date("invalid"), { seconds: Infinity }].map(start_time => ({ start_time }))]);
  expect(rows.every(row => row.count === 0)).toBe(true);
});
test("empty results preserve all 24 zero buckets", () => {
  expect(buildArrivalTimeData()).toEqual(Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 })));
});
