const INTEGRAL_CATEGORY = 'integrali';

export function isIntegralSrc(src) {
  return src.includes(`immagini/${INTEGRAL_CATEGORY}/`);
}

export function hasIntegralCategory(selectedCategories) {
  return selectedCategories.has(INTEGRAL_CATEGORY);
}
