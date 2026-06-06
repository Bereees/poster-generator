export const GRIDS = {
  '2x3': { cols: 2, rows: 3, label: '2 × 3' },
  '3x3': { cols: 3, rows: 3, label: '3 × 3' },
  '3x4': { cols: 3, rows: 4, label: '3 × 4' },
  '3x5': { cols: 3, rows: 5, label: '3 × 5' },
  '4x4': { cols: 4, rows: 4, label: '4 × 4' },
  '4x5': { cols: 4, rows: 5, label: '4 × 5' },
  '4x6': { cols: 4, rows: 6, label: '4 × 6' },
  '5x5': { cols: 5, rows: 5, label: '5 × 5' },
  '5x6': { cols: 5, rows: 6, label: '5 × 6' },
  '5x7': { cols: 5, rows: 7, label: '5 × 7' },
  '6x6': { cols: 6, rows: 6, label: '6 × 6' },
  '6x7': { cols: 6, rows: 7, label: '6 × 7' },
  '6x9': { cols: 6, rows: 9, label: '6 × 9' },
};

export function getGrid(id) {
  const grid = GRIDS[id];
  if (!grid) throw new Error(`Unknown grid: ${id}`);
  return grid;
}

export function getCellCount(gridId) {
  const { cols, rows } = getGrid(gridId);
  return cols * rows;
}
