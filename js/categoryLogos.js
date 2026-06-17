export const CATEGORY_LOGOS = {
  articoli: 'immagini/logoritamaria.svg',
  disegni: 'immagini/logoannamori.svg',
  necropoli: 'immagini/logomarialuisa.svg',
  necropolilogo: 'immagini/logomarialuisa.svg',
  poesie: 'immagini/logogori.svg',
  scacchi: 'immagini/logoantonio.svg',
  scacchicomplessi: 'immagini/logoantonio.svg',
  stemmi: 'immagini/logoannamori.svg',
};

export function getCategoryLogo(categoryId) {
  return CATEGORY_LOGOS[categoryId] ?? null;
}
