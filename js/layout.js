const MARGIN_SIDE_RATIO = 0.05;
const MARGIN_TOP_RATIO = 0.05;
const MARGIN_BOTTOM_RATIO = 0.12;
const GAP_PX = 2;

export function computeLayout(format) {
  const { widthPx: W, heightPx: H, grid } = format;

  const margin = {
    left: Math.round(W * MARGIN_SIDE_RATIO),
    right: Math.round(W * MARGIN_SIDE_RATIO),
    top: Math.round(H * MARGIN_TOP_RATIO),
    bottom: Math.round(H * MARGIN_BOTTOM_RATIO),
  };

  const footerHeight = margin.bottom;
  const footer = {
    x: margin.left,
    y: H - footerHeight,
    width: W - margin.left - margin.right,
    height: footerHeight,
  };

  const gridArea = {
    x: margin.left,
    y: margin.top,
    width: W - margin.left - margin.right,
    height: footer.y - margin.top,
  };

  const gap = GAP_PX;
  const cellWidth = Math.floor((gridArea.width - gap * (grid.cols - 1)) / grid.cols);
  const cellHeight = Math.floor((gridArea.height - gap * (grid.rows - 1)) / grid.rows);

  const cells = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      cells.push({
        x: gridArea.x + col * (cellWidth + gap),
        y: gridArea.y + row * (cellHeight + gap),
        width: cellWidth,
        height: cellHeight,
      });
    }
  }

  const isVertical = H > W;
  const logoHeightRatio = isVertical ? 0.58 : 0.65;

  return {
    width: W,
    height: H,
    margin,
    gap,
    grid: gridArea,
    footer,
    cells,
    logo: {
      maxHeight: Math.round(footerHeight * logoHeightRatio),
      paddingRight: Math.round(margin.right * 0.5),
      paddingBottom: Math.round(footerHeight * 0.22),
    },
    description: {
      paddingBottom: Math.round(footerHeight * 0.24),
      fontSize: Math.round(footerHeight * 0.22),
      maxWidth: Math.round(footer.width * 0.6),
    },
  };
}
