import test from 'node:test';
import assert from 'node:assert/strict';
import Chart from 'chart.js/auto';
import { generateWaitingHeatmapChart } from '../charts/waitingHeatmap.js';
import { generateDailyVolumeWithObservations } from '../charts/dailyVolumeWithObservations.js';

function newestChart() { return Object.values(Chart.instances).at(-1); }
test('rendered heatmap shows measured zero, blank missing samples, and centered labels', () => {
  const rows = [{ data: () => ({ plan_of_care: [
    { station: 'doc', status: 'complete', waiting_start: new Date('2026-10-01T14:00:00Z'), waiting_time: 0 },
    { station: 'lab', status: 'complete', waiting_start: new Date('2026-10-01T15:00:00Z'), waiting_time: 120 },
  ] }) }];
  const src = generateWaitingHeatmapChart(rows);
  const chart = newestChart();
  try {
    assert.match(src, /^data:image\/png;base64,/);
    const dataset = chart.data.datasets[0];
    assert.deepEqual(dataset.data.map(p => p.v), [0, null, null, 2]);
    const points = chart.getDatasetMeta(0).data;
    assert.notEqual(points[0].options.backgroundColor, 'rgba(255,255,255,1)');
    assert.equal(points[1].options.backgroundColor, 'rgba(255,255,255,1)');
    assert.equal(points[0].x + points[0].width / 2, chart.scales.x.getPixelForValue(0));
    assert.equal(points[0].y + points[0].height / 2, chart.scales.y.getPixelForValue(0));
  } finally { chart.destroy(); }
});

test('rendered visit chart stacks missing-location visits into the displayed total', () => {
  const src = generateDailyVolumeWithObservations({ labels: ['2026-10-01'],
    locationVolumeData: [{ locationId:'a', label:'Clinic A', data:[2] },
      { locationId:'__UNASSIGNED__', label:'Sin ubicación', data:[2] }],
    observations: [], typesById: {} });
  const chart = newestChart();
  try {
    assert.match(src, /^data:image\/png;base64,/);
    assert.equal(chart.options.scales.y.stacked, true);
    assert.equal(chart.data.datasets.reduce((sum, d) => sum + d.data[0], 0), 4);
    assert.equal(chart.scales.y.max, 4);
  } finally { chart.destroy(); }
});
