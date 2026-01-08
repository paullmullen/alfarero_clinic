// src/utils/calculateRollingAverage.js
export const calculateRollingAverage = (data, windowSize = 15) => {
  const rollingAverages = [];
  for (let i = 0; i < data.length; i++) {
    const windowData = data.slice(Math.max(0, i - windowSize + 1), i + 1);
    const average =
      windowData.reduce((sum, point) => sum + point.count, 0) /
      windowData.length;

    rollingAverages.push({
      date: data[i].date,
      count: data[i].count,
      average,
    });
  }
  return rollingAverages;
};
