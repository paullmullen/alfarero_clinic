import { useState, useCallback } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { firestore } from "../helpers/firebaseConfig";
import { Timestamp } from "firebase/firestore";
import dayjs from "dayjs";

export function useDateRange(initialStart, initialEnd) {
  const [dateRange, setDateRange] = useState([initialStart, initialEnd]);
  const [pickerRange, setPickerRange] = useState([
    dayjs(initialStart.toDate()),
    dayjs(initialEnd.toDate()),
  ]);

  const handleDateChange = useCallback(async (values) => {
    let start = dayjs(values[0]).toDate();
    let end = dayjs(values[1]).toDate();

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const fsStart = Timestamp.fromDate(start);
    const fsEnd = Timestamp.fromDate(end);

    setDateRange([fsStart, fsEnd]);
    setPickerRange([dayjs(start), dayjs(end)]);

    const ref = doc(firestore, "run_aggregation", "timestamp");
    await updateDoc(ref, { range_start: fsStart, range_end: fsEnd });
  }, []);

  return {
    dateRange,
    pickerRange,
    handleDateChange,
    setDateRange,
    setPickerRange,
  };
}
