import { shouldAutoPrintTicket } from "./shouldAutoPrintTicket";

const plan = [
  { station: "nur", status: "waiting", route_order: 1 },
  { station: "doc", status: "planned", route_order: 2 },
  { station: "lab", status: "pending", route_order: null },
];

test("existing locations without settings do not auto-print", () => {
  expect(shouldAutoPrintTicket({}, plan)).toBe(false);
  expect(shouldAutoPrintTicket(null, plan)).toBe(false);
});

test("an empty selection disables auto-printing", () => {
  expect(shouldAutoPrintTicket({ auto_print_stations: [] }, plan)).toBe(false);
});

test.each(["nur", "doc"])("a visit containing %s triggers printing", (station) => {
  expect(shouldAutoPrintTicket({ auto_print_stations: [station] }, plan)).toBe(true);
});

test("multiple matches produce one print decision", () => {
  expect(shouldAutoPrintTicket({ auto_print_stations: ["nur", "doc"] }, plan)).toBe(true);
});

test("an unused pending station does not trigger printing", () => {
  expect(shouldAutoPrintTicket({ auto_print_stations: ["lab"] }, plan)).toBe(false);
});

test("the patient's location controls the decision independently of available services", () => {
  const locationA = { stations: [], auto_print_stations: ["doc"] };
  const locationB = { stations: ["doc"], auto_print_stations: ["lab"] };
  expect(shouldAutoPrintTicket(locationA, plan)).toBe(true);
  expect(shouldAutoPrintTicket(locationB, plan)).toBe(false);
});

test("empty or missing plans do not trigger printing", () => {
  expect(shouldAutoPrintTicket({ auto_print_stations: ["doc"] }, [])).toBe(false);
  expect(shouldAutoPrintTicket({ auto_print_stations: ["doc"] }, undefined)).toBe(false);
});
