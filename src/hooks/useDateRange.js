import { useState, useCallback } from "react";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { firestore } from "../helpers/firebaseConfig";
import dayjs from "dayjs";

export function useDateRange(initialStart, initialEnd) {
  // Store the "query range" as [inclusiveStart, exclusiveEnd] (Firestore Timestamps)
  const [dateRange, setDateRange] = useState([initialStart, initialEnd]);
  // Store the "picker range" as the exact days user selected (dayjs)
  const [pickerRange, setPickerRange] = useState([
    dayjs(initialStart.toDate()),
    dayjs(initialEnd.toDate()),
  ]);

  const handleDateChange = useCallback(async (values) => {
    if (!values || !values[0] || !values[1]) return;

    // 1) Normalize to local day boundaries:
    const startDay = dayjs(values[0]).startOf("day"); // inclusive start
    const endDayExclusive = dayjs(values[1]).add(1, "day").startOf("day"); // exclusive end

    // 2) Convert to JS Date (for Timestamp)
    const startDate = startDay.toDate();
    const endDateExclusive = endDayExclusive.toDate();

    // 3) Firestore Timestamps
    const fsStart = Timestamp.fromDate(startDate);
    const fsEndExclusive = Timestamp.fromDate(endDateExclusive);

    // 4) Update state for queries and UI
    setDateRange([fsStart, fsEndExclusive]); // queries should use >= start && < end
    setPickerRange([startDay, dayjs(values[1])]); // keep UI showing the selected end day

    // 5) Persist range (store exclusive end to avoid edge bugs)
    const ref = doc(firestore, "run_aggregation", "timestamp");
    await updateDoc(ref, { range_start: fsStart, range_end: fsEndExclusive });
  }, []);

  return {
    dateRange, // [inclusiveStart, exclusiveEnd] as Firestore Timestamps
    pickerRange, // [startDay, endDay] as dayjs (for the RangePicker UI)
    handleDateChange,
    setDateRange,
    setPickerRange,
  };
}
