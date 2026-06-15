export const CATEGORY_LOGOS = {
  articoli: { src: 'immagini/logoritamaria.svg' },
  disegni: { src: 'immagini/logoannamori.svg', scale: 0.72 },
  necropoli: { src: 'immagini/logomarialuisa.svg' },
  poesie: { src: 'immagini/logogori.svg', scale: 0.85 },
  scacchi: { src: 'immagini/logoantonio.svg' },
};

export function getCategoryLogo(categoryId) {
  return CATEGORY_LOGOS[categoryId] ?? null;
}
