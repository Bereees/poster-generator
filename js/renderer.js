import { getProcessedDrawing } from './imageFilter.js';
import { resolveFooterColor, isLightFooterColor } from './contrast.js';
import { isVectorCategorySrc, loadScacchiAsset } from './scacchi.js';
import { isIntegralSrc } from './integral.js';
import { resolveAssetUrl } from './assets.js';

const imageCache = new Map();
const POSTER_FONT = 'Roboto';
let assetVersion = '';

export function setAssetVersion(version) {
  assetVersion = version || '';
  clearImageCache();
}

async function ensurePosterFont(fontSize) {
  if (!document.fonts) return;
  await document.fonts.load(`500 ${fontSize}px ${POSTER_FONT}`);
}

export function clearImageCache() {
  imageCache.clear();
}

export function loadImage(src) {
  const isTransient = /^(blob:|data:)/i.test(src);
  const cacheKey = isTransient ? src : assetVersion ? `${src}|${assetVersion}` : src;
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    const url = resolveAssetUrl(src);
    if (isTransient || !assetVersion) {
      img.src = url;
    } else {
      img.src = `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(assetVersion)}`;
    }
  });
  imageCache.set(cacheKey, promise);
  return promise;
}

function drawContainedImage(ctx, img, cell, bgColor, rotation = 0, fitScale = 1) {
  ctx.fillStyle = bgColor;
  ctx.fillRect(cell.x, cell.y, cell.width, cell.height);

  const scale = Math.min(cell.width / img.width, cell.height / img.height) * fitScale;
  const w = img.width * scale;
  const h = img.height * scale;

  if (!rotation) {
    const x = cell.x + (cell.width - w) / 2;
    const y = cell.y + (cell.height - h) / 2;
    ctx.drawImage(img, x, y, w, h);
    return;
  }

  const cx = cell.x + cell.width / 2;
  const cy = cell.y + cell.height / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(cell.x, cell.y, cell.width, cell.height);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function wrapParagraph(ctx, paragraph, maxWidth) {
  const words = paragraph.split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const lines = [];
  let line = words[0];

  for (let i = 1; i < words.length; i++) {
    const next = `${line} ${words[i]}`;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
    } else {
      lines.push(line);
      line = words[i];
    }
  }

  lines.push(line);
  return lines;
}

function wrapDescription(ctx, text, maxWidth) {
  return text
    .split('\n')
    .flatMap((paragraph) => {
      const lines = wrapParagraph(ctx, paragraph, maxWidth);
      return lines.length ? lines : [''];
    });
}

function fitDescriptionLayout(ctx, text, maxWidth, maxHeight, startFontSize) {
  const minFontSize = Math.max(10, Math.round(startFontSize * 0.35));
  let fontSize = startFontSize;

  while (fontSize >= minFontSize) {
    ctx.font = `500 ${fontSize}px "${POSTER_FONT}", sans-serif`;
    const lines = wrapDescription(ctx, text, maxWidth);
    const lineHeight = fontSize * 1.2;
    const blockHeight = lines.length * lineHeight;

    if (blockHeight <= maxHeight) {
      return { fontSize, lines, lineHeight };
    }

    fontSize -= Math.max(1, Math.round(fontSize * 0.08));
  }

  ctx.font = `500 ${minFontSize}px "${POSTER_FONT}", sans-serif`;
  const lines = wrapDescription(ctx, text, maxWidth);
  return { fontSize: minFontSize, lines, lineHeight: minFontSize * 1.2 };
}

function drawWrappedDescription(ctx, lines, x, bottomY, lineHeight) {
  ctx.textBaseline = 'bottom';
  let y = bottomY;

  for (let i = lines.length - 1; i >= 0; i--) {
    ctx.fillText(lines[i], x, y);
    if (i > 0) y -= lineHeight;
  }
}

async function drawFooter(ctx, layout, { description, logoSrc, footerColor }) {
  const { footer, logo, description: descStyle } = layout;

  const logoImg = await loadImage(logoSrc);
  const logoScale = logo.maxHeight / logoImg.height;
  const logoW = logoImg.width * logoScale;
  const logoH = logoImg.height * logoScale;
  const logoX = footer.x + footer.width - logoW - logo.paddingRight;
  const logoY = footer.y + footer.height - logoH - logo.paddingBottom;

  if (description) {
    const gapBeforeLogo = Math.round(footer.width * 0.03);
    const textMaxWidth = Math.min(
      descStyle.maxWidth,
      Math.max(0, logoX - footer.x - gapBeforeLogo)
    );
    const textMaxHeight = footer.height - descStyle.paddingBottom - Math.round(footer.height * 0.1);
    const textBottom = footer.y + footer.height - descStyle.paddingBottom;

    const fitted = fitDescriptionLayout(
      ctx,
      description,
      textMaxWidth,
      textMaxHeight,
      descStyle.fontSize
    );

    await ensurePosterFont(fitted.fontSize);
    ctx.fillStyle = footerColor;
    ctx.font = `500 ${fitted.fontSize}px "${POSTER_FONT}", sans-serif`;
    drawWrappedDescription(ctx, fitted.lines, footer.x, textBottom, fitted.lineHeight);
  }

  ctx.save();
  if (isLightFooterColor(footerColor)) {
    ctx.filter = 'brightness(0) invert(1)';
  }
  ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
  ctx.restore();
}

export async function renderPoster(canvas, format, layout, imageSrcs, options) {
  const {
    backgroundColor,
    description,
    logoSrc,
    rotations = [],
    tintColor = null,
    adaptiveFooter = false,
    scacchi = null,
    scacchiFitScale = 1,
    imageColors = null,
  } = options;
  canvas.width = format.widthPx;
  canvas.height = format.heightPx;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const images = await Promise.all(
    imageSrcs.map(async (src, i) => {
      const cellColor = imageColors?.[i] ?? null;

      if (scacchi && isVectorCategorySrc(src)) {
        const opts = cellColor ? { ...scacchi, color: cellColor } : scacchi;
        return loadScacchiAsset(src, opts, loadImage);
      }

      if (isIntegralSrc(src)) {
        return loadImage(src);
      }

      const tint = cellColor ?? tintColor;
      return getProcessedDrawing(src, loadImage, tint);
    })
  );

  layout.cells.forEach((cell, i) => {
    if (!images[i]) return;
    const fitScale = isVectorCategorySrc(imageSrcs[i]) ? scacchiFitScale : 1;
    drawContainedImage(ctx, images[i], cell, backgroundColor, rotations[i] ?? 0, fitScale);
  });

  await drawFooter(ctx, layout, {
    description,
    logoSrc,
    footerColor: resolveFooterColor(backgroundColor, adaptiveFooter),
  });
  return canvas;
}
