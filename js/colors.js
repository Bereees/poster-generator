function hslToHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function randomHexColor() {
  const h = Math.random() * 360;
  const s = 0.55 + Math.random() * 0.4;
  const l = 0.28 + Math.random() * 0.32;
  return hslToHex(h, s, l);
}

export function randomHexColors(count) {
  return Array.from({ length: count }, () => randomHexColor());
}
