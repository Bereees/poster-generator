function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relativeLuminance(r, g, b) {
  const channel = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(lumA, lumB) {
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

const FOOTER_DARK = '#1a1a1a';
const FOOTER_LIGHT = '#ffffff';

export function getReadableFooterColor(backgroundColor) {
  const [r, g, b] = hexToRgb(backgroundColor);
  const bgLum = relativeLuminance(r, g, b);
  const darkLum = relativeLuminance(26, 26, 26);
  const lightLum = relativeLuminance(255, 255, 255);

  return contrastRatio(bgLum, darkLum) >= contrastRatio(bgLum, lightLum)
    ? FOOTER_DARK
    : FOOTER_LIGHT;
}

export function resolveFooterColor(backgroundColor, adaptiveFooter) {
  if (!adaptiveFooter) return FOOTER_DARK;
  return getReadableFooterColor(backgroundColor);
}

export function isLightFooterColor(color) {
  return color === FOOTER_LIGHT;
}
