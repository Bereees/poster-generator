const processCache = new Map();
const WHITE_THRESHOLD = 245;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function processDrawingImage(sourceImg, tintColor) {
  const w = sourceImg.naturalWidth || sourceImg.width;
  const h = sourceImg.naturalHeight || sourceImg.height;
  if (!w || !h) return sourceImg;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(sourceImg, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const { data } = imageData;
  const tint = tintColor ? hexToRgb(tintColor) : null;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue;

    const lum = Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
    const ink = 1 - lum / 255;

    if (lum >= WHITE_THRESHOLD) {
      data[i + 3] = 0;
      continue;
    }

    if (tint) {
      data[i] = Math.round(tint[0] * ink);
      data[i + 1] = Math.round(tint[1] * ink);
      data[i + 2] = Math.round(tint[2] * ink);
    } else {
      data[i] = lum;
      data[i + 1] = lum;
      data[i + 2] = lum;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export async function getProcessedDrawing(src, loadImage, tintColor) {
  const cacheKey = `${src}|${tintColor ?? 'bw'}`;
  if (processCache.has(cacheKey)) return processCache.get(cacheKey);

  const promise = loadImage(src)
    .then((img) => processDrawingImage(img, tintColor))
    .catch((err) => {
      processCache.delete(cacheKey);
      console.error(`Filtro immagine fallito: ${src}`, err);
      return loadImage(src);
    });
  processCache.set(cacheKey, promise);
  return promise;
}
