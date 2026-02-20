import { useLayoutEffect, useState } from "react";

export function useTableScrollY(tableRef) {
  const [tableScrollY, setTableScrollY] = useState(0);

  useLayoutEffect(() => {
    const el = tableRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const wrapH = el.getBoundingClientRect().height;
      const thead = el.querySelector(".ant-table-thead");
      const headH = thead ? thead.getBoundingClientRect().height : 0;

      const FUDGE = 20;
      const y = Math.max(200, Math.floor(wrapH - headH - FUDGE));
      setTableScrollY(y);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [tableRef]);

  return tableScrollY;
}
