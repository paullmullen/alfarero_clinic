import { usePatientsData } from "./usePatientsData";
import { fetchPatientsData } from "../helpers/fetchPatientsData";

jest.mock("react", () => ({ useCallback: callback => callback }));
jest.mock("../helpers/fetchPatientsData", () => ({ fetchPatientsData: jest.fn() }));

test("statistics loader returns nonzero bars from ISO and serialized endpoint timestamps", async () => {
  const patients = [
    { pt_no: 1, start_time: { _seconds: Date.parse("2026-10-02T14:00:00Z") / 1000 }, station_type: "doc" },
    { pt_no: 2, start_time: "2026-10-02T14:30:00Z", station_type: "lab" },
  ];
  fetchPatientsData.mockResolvedValue(patients);
  const range = ["start", "end"];
  const result = await usePatientsData(value => `translated:${value}`)(range);
  expect(fetchPatientsData).toHaveBeenCalledWith(range, process.env.REACT_APP_FIREBASE_DB, "both");
  expect(result.arrival[8]).toEqual({ hour: 8, count: 2 });
  expect(result.processed[0]).toEqual({ ...patients[0], station_type: "translated:doc" });
});
