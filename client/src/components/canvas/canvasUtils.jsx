const getElementBounds = (el) => {
  if (!el) return null;

  if ((el.type === "pencil" || el.type === "eraser") && el.points?.length > 0) {
    const xs = el.points.map((pt) => pt[0]);
    const ys = el.points.map((pt) => pt[1]);
    const pad = (el.type === "eraser" ? 20 : el.strokeWidth || 3) + 6;
    return {
      x: Math.min(...xs) - pad,
      y: Math.min(...ys) - pad,
      width: Math.max(...xs) - Math.min(...xs) + pad * 2,
      height: Math.max(...ys) - Math.min(...ys) + pad * 2,
    };
  }

  if (
    ["rectangle", "square", "diamond", "arrow", "line"].includes(el.type) &&
    el.start &&
    el.end
  ) {
    const x = Math.min(el.start[0], el.end[0]);
    const y = Math.min(el.start[1], el.end[1]);
    const width = Math.abs(el.end[0] - el.start[0]);
    const height = Math.abs(el.end[1] - el.start[1]);
    const pad = el.type === "arrow" ? 18 : 6;
    return {
      x: x - pad,
      y: y - pad,
      width: width + pad * 2,
      height: height + pad * 2,
    };
  }

  if (el.type === "circle" && el.start && el.end) {
    const r = Math.sqrt(
      Math.pow(el.end[0] - el.start[0], 2) +
        Math.pow(el.end[1] - el.start[1], 2),
    );
    return {
      x: el.start[0] - r - 6,
      y: el.start[1] - r - 6,
      width: r * 2 + 12,
      height: r * 2 + 12,
    };
  }

  if (el.type === "text") {
    const fontSize = el.fontSize || 16;
    const lines = (el.text || "").split("\n");
    const maxLength = Math.max(...lines.map((line) => line.length), 1);
    return {
      x: el.x,
      y: el.y,
      width: Math.max(80, maxLength * fontSize * 0.62),
      height: Math.max(24, lines.length * fontSize * 1.35),
    };
  }

  return null;
};

const isPointInsideBounds = (point, bounds, padding = 0) => {
  if (!bounds) return false;
  return (
    point.x >= bounds.x - padding &&
    point.x <= bounds.x + bounds.width + padding &&
    point.y >= bounds.y - padding &&
    point.y <= bounds.y + bounds.height + padding
  );
};

const doBoundsIntersect = (a, b) => {
  if (!a || !b) return false;
  return !(
    a.x + a.width < b.x ||
    a.x > b.x + b.width ||
    a.y + a.height < b.y ||
    a.y > b.y + b.height
  );
};

const buildBoxFromPoints = (start, end) => ({
  x: Math.min(start.x, end.x),
  y: Math.min(start.y, end.y),
  width: Math.abs(end.x - start.x),
  height: Math.abs(end.y - start.y),
});

const getCombinedBounds = (els) => {
  const bounds = els.map(getElementBounds).filter(Boolean);
  if (bounds.length === 0) return null;

  const left = Math.min(...bounds.map((box) => box.x));
  const top = Math.min(...bounds.map((box) => box.y));
  const right = Math.max(...bounds.map((box) => box.x + box.width));
  const bottom = Math.max(...bounds.map((box) => box.y + box.height));

  return { x: left, y: top, width: right - left, height: bottom - top };
};

const getResizeHandles = (bounds) => {
  if (!bounds) return [];
  const { x, y, width, height } = bounds;
  const cx = x + width / 2;
  const cy = y + height / 2;
  return [
    { id: "nw", x, y },
    { id: "n", x: cx, y },
    { id: "ne", x: x + width, y },
    { id: "e", x: x + width, y: cy },
    { id: "se", x: x + width, y: y + height },
    { id: "s", x: cx, y: y + height },
    { id: "sw", x, y: y + height },
    { id: "w", x, y: cy },
  ];
};

const getResizeHandleAtPoint = (point, bounds, zoom) => {
  const size = HANDLE_SIZE / zoom;
  return getResizeHandles(bounds).find((handle) =>
    isPointInsideBounds(point, {
      x: handle.x - size / 2,
      y: handle.y - size / 2,
      width: size,
      height: size,
    }),
  );
};

const scalePoint = (point, oldBox, newBox) => {
  const oldWidth = oldBox.width || 1;
  const oldHeight = oldBox.height || 1;
  const xRatio = (point[0] - oldBox.x) / oldWidth;
  const yRatio = (point[1] - oldBox.y) / oldHeight;

  return [newBox.x + xRatio * newBox.width, newBox.y + yRatio * newBox.height];
};

const buildResizedBox = (originalBox, handle, point) => {
  let left = originalBox.x;
  let top = originalBox.y;
  let right = originalBox.x + originalBox.width;
  let bottom = originalBox.y + originalBox.height;

  if (handle.includes("w")) left = point.x;
  if (handle.includes("e")) right = point.x;
  if (handle.includes("n")) top = point.y;
  if (handle.includes("s")) bottom = point.y;

  const minSize = 12;
  if (right - left < minSize) right = left + minSize;
  if (bottom - top < minSize) bottom = top + minSize;

  return { x: left, y: top, width: right - left, height: bottom - top };
};