const INTEGRAL_CATEGORY = 'integrali';

const INTEGRAL_FILES = new Set([
  'immagini/disegni/disegno9.png',
  'immagini/disegni/disegno36.png',
  'immagini/disegni/disegno38.png',
  'immagini/disegni/disegno39.png',
]);

export function isIntegralSrc(src) {
  if (src.includes(`immagini/${INTEGRAL_CATEGORY}/`)) return true;
  return INTEGRAL_FILES.has(src);
}

export function hasIntegralCategory(selectedCategories) {
  return selectedCategories.has(INTEGRAL_CATEGORY);
}
