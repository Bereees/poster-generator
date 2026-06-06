const imageCache = new Map();
const POSTER_FONT = 'Roboto';

async function ensurePosterFont(fontSize) {
  if (!document.fonts) return;
  await document.fonts.load(`500 ${fontSize}px ${POSTER_FONT}`);
}

export function loadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src);
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
  imageCache.set(src, promise);
  return promise;
}

function drawContainedImage(ctx, img, cell, bgColor) {
  ctx.fillStyle = bgColor;
  ctx.fillRect(cell.x, cell.y, cell.width, cell.height);

  const scale = Math.min(cell.width / img.width, cell.height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = cell.x + (cell.width - w) / 2;
  const y = cell.y + (cell.height - h) / 2;
  ctx.drawImage(img, x, y, w, h);
}

async function drawFooter(ctx, layout, { description, logoSrc }) {
  const { footer, logo, description: descStyle } = layout;

  if (description) {
    await ensurePosterFont(descStyle.fontSize);
    ctx.fillStyle = '#1a1a1a';
    ctx.font = `500 ${descStyle.fontSize}px "${POSTER_FONT}", sans-serif`;
    ctx.textBaseline = 'bottom';
    const textY = footer.y + footer.height - descStyle.paddingBottom;
    ctx.fillText(description, footer.x, textY, descStyle.maxWidth);
  }

  const logoImg = await loadImage(logoSrc);
  const maxH = logo.maxHeight;
  const scale = maxH / logoImg.height;
  const w = logoImg.width * scale;
  const h = logoImg.height * scale;
  const x = footer.x + footer.width - w - logo.paddingRight;
  const y = footer.y + footer.height - h - logo.paddingBottom;
  ctx.drawImage(logoImg, x, y, w, h);
}

export async function renderPoster(canvas, format, layout, imageSrcs, options) {
  const { backgroundColor, description, logoSrc } = options;
  canvas.width = format.widthPx;
  canvas.height = format.heightPx;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const images = await Promise.all(imageSrcs.map(loadImage));
  layout.cells.forEach((cell, i) => {
    if (images[i]) drawContainedImage(ctx, images[i], cell, backgroundColor);
  });

  await drawFooter(ctx, layout, { description, logoSrc });
  return canvas;
}
