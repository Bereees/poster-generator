const PIECE_GROUPS = [
  ['cavallo', /cavallo|marinocav/i],
  ['regina', /regina|marinoregina/i],
  ['torre', /torre/i],
  ['pedone', /pedone/i],
  ['re', /marinore|^re\d/i],
  ['tedesco', /tedesco/i],
  ['bicefalo', /bicefalo/i],
];

export function getSimilarityGroup(src) {
  const name = src.split('/').pop().replace(/\.[^.]+$/, '').toLowerCase();

  if (src.includes('immagini/scacchi/')) {
    for (const [group, pattern] of PIECE_GROUPS) {
      if (pattern.test(name)) return group;
    }
    return name.replace(/\s+\d+$/, '').trim() || name;
  }

  return src;
}

function getNeighborIndices(index, cols, rows) {
  const col = index % cols;
  const row = Math.floor(index / cols);
  const neighbors = [];
  if (col > 0) neighbors.push(index - 1);
  if (col < cols - 1) neighbors.push(index + 1);
  if (row > 0) neighbors.push(index - cols);
  if (row < rows - 1) neighbors.push(index + cols);
  return neighbors;
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function isCompatible(candidate, placed, index, cols, rows) {
  const group = getSimilarityGroup(candidate);
  for (const neighborIndex of getNeighborIndices(index, cols, rows)) {
    const neighbor = placed[neighborIndex];
    if (!neighbor) continue;
    if (neighbor === candidate) return false;
    if (getSimilarityGroup(neighbor) === group) return false;
  }
  return true;
}

function countAdjacentSimilar(placed, cols, rows) {
  let conflicts = 0;
  for (let i = 0; i < placed.length; i++) {
    if (!placed[i]) continue;
    const group = getSimilarityGroup(placed[i]);
    for (const neighborIndex of getNeighborIndices(i, cols, rows)) {
      if (neighborIndex > i && placed[neighborIndex] && getSimilarityGroup(placed[neighborIndex]) === group) {
        conflicts++;
      }
    }
  }
  return conflicts;
}

function fillGrid(pool, count, cols, rows, strict) {
  const result = new Array(count).fill(null);

  for (let i = 0; i < count; i++) {
    const candidates = shuffle(pool).filter((src) => isCompatible(src, result, i, cols, rows));
    if (candidates.length) {
      result[i] = candidates[0];
      continue;
    }
    if (strict) return null;
    result[i] = pool[Math.floor(Math.random() * pool.length)];
  }

  return result;
}

export function buildImagePool(manifest, selectedCategoryIds) {
  if (!selectedCategoryIds.length) return [];
  const idSet = new Set(selectedCategoryIds);
  return manifest.categories
    .filter((c) => idSet.has(c.id) && c.images.length > 0)
    .flatMap((c) => c.images);
}

export function sampleImages(pool, count, grid = null, options = {}) {
  if (!pool.length) return [];

  const { randomizeFigures = true } = options;

  if (!randomizeFigures) {
    const figure = pool[Math.floor(Math.random() * pool.length)];
    return Array(count).fill(figure);
  }

  const cols = grid?.cols ?? 1;
  const rows = grid?.rows ?? count;

  if (count === 1) {
    return [pool[Math.floor(Math.random() * pool.length)]];
  }

  let best = null;
  let bestConflicts = Infinity;

  for (let attempt = 0; attempt < 80; attempt++) {
    const candidate = fillGrid(pool, count, cols, rows, attempt < 60);
    if (!candidate) continue;

    const conflicts = countAdjacentSimilar(candidate, cols, rows);
    if (conflicts === 0) return candidate;
    if (conflicts < bestConflicts) {
      bestConflicts = conflicts;
      best = candidate;
    }
  }

  if (best) return best;

  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return result;
}
