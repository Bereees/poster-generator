export function buildImagePool(manifest, selectedCategoryIds) {
  if (!selectedCategoryIds.length) return [];
  const idSet = new Set(selectedCategoryIds);
  return manifest.categories
    .filter((c) => idSet.has(c.id) && c.images.length > 0)
    .flatMap((c) => c.images);
}

export function sampleImages(pool, count) {
  if (!pool.length) return [];
  const result = [];
  for (let i = 0; i < count; i++) {
    const index = Math.floor(Math.random() * pool.length);
    result.push(pool[index]);
  }
  return result;
}
