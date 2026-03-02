import { useEffect, useRef } from "react";

export function useAutoScroll({
  tableRef,
  scrollingRef,
  scrollSpeed,
  pauseTopMs = 1200,
  pauseBottomMs = 1500,
  deps = [],
}) {
  const pauseRef = useRef(false);
  const pauseTimerRef = useRef(null);

  useEffect(() => {
    const tableBody = tableRef.current?.querySelector(".ant-table-body");
    if (!tableBody) return;

    const clearPauseTimer = () => {
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }
    };

    const pause = (ms) => {
      pauseRef.current = true;
      clearPauseTimer();
      pauseTimerRef.current = setTimeout(() => {
        pauseRef.current = false;
      }, ms);
    };

    // Reset on init / data change
    tableBody.scrollTop = 0;
    pauseRef.current = false;

    // Pause at the top immediately so row 1 is readable
    pause(pauseTopMs);

    const scrollInterval = setInterval(() => {
      if (!scrollingRef.current) return;
      if (pauseRef.current) return;

      // If there isn't enough content to scroll, do nothing
      if (tableBody.scrollHeight <= tableBody.clientHeight + 2) return;

      const atBottom =
        tableBody.scrollTop + tableBody.clientHeight >=
        tableBody.scrollHeight - 2;

      if (atBottom) {
        // Pause at bottom, then reset to top and pause again
        pauseRef.current = true;
        clearPauseTimer();
        pauseTimerRef.current = setTimeout(() => {
          tableBody.scrollTop = 0;
          pause(pauseTopMs);
        }, pauseBottomMs);
        return;
      }

      tableBody.scrollTop += scrollSpeed;
    }, 50);

    return () => {
      clearInterval(scrollInterval);
      clearPauseTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableRef, scrollingRef, scrollSpeed, pauseTopMs, pauseBottomMs, ...deps]);
}
