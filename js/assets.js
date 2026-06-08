export function resolveAssetUrl(src) {
  if (/^(blob:|data:|https?:)/i.test(src)) return src;
  return new URL(src, document.baseURI).href;
}
