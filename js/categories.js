export const CATEGORY_DISPLAY_ORDER = [
  'articoli',
  'disegni',
  'stemmi',
  'necropoli',
  'poesie',
  'scacchi',
];

export function sortCategories(categories) {
  const order = new Map(CATEGORY_DISPLAY_ORDER.map((id, index) => [id, index]));
  return [...categories].sort((a, b) => {
    const aOrder = order.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = order.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.id.localeCompare(b.id);
  });
}
