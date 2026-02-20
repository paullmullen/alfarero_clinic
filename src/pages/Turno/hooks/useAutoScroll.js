import { useEffect } from "react";

export function useAutoScroll({
  tableRef,
  scrollingRef,
  scrollSpeed,
  deps = [],
}) {
  useEffect(() => {
    const tableBody = tableRef.current?.querySelector(".ant-table-body");
    if (!tableBody) return;

    const scrollInterval = setInterval(() => {
      if (!scrollingRef.current) return;

      const atBottom =
        tableBody.scrollTop + tableBody.clientHeight >=
        tableBody.scrollHeight - 2;

      tableBody.scrollTop = atBottom ? 0 : tableBody.scrollTop + scrollSpeed;
    }, 50);

    return () => clearInterval(scrollInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableRef, scrollingRef, scrollSpeed, ...deps]);
}
