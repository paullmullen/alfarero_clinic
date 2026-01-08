// src/utils/calculateRollingAverage.js
export function calculateRollingAverage(data, window = 15) {
  // Expect data: [{ date, count }, ...]
  // Output: [{ date, count, average }, ...]
  const out = [];
  const nums = data.map((d) => Number(d.count));
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = nums.slice(start, i + 1);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    out.push({ ...data[i], average: Number.isFinite(avg) ? avg : null });
  }
  return out;
}
