const moveElement = (el, dx, dy) => {
  if (el.points) {
    return { ...el, points: el.points.map((pt) => [pt[0] + dx, pt[1] + dy]) };
  }

  if (el.start && el.end) {
    return {
      ...el,
      start: [el.start[0] + dx, el.start[1] + dy],
      end: [el.end[0] + dx, el.end[1] + dy],
    };
  }

  if (el.type === "text") {
    return { ...el, x: el.x + dx, y: el.y + dy };
  }

  return el;
};

const resizeElement = (el, oldBox, newBox) => {
  if (!oldBox) return el;

  if (el.points) {
    return {
      ...el,
      points: el.points.map((pt) => scalePoint(pt, oldBox, newBox)),
    };
  }

  if (el.start && el.end) {
    return {
      ...el,
      start: scalePoint(el.start, oldBox, newBox),
      end: scalePoint(el.end, oldBox, newBox),
    };
  }

  if (el.type === "text") {
    const yScale = newBox.height / (oldBox.height || 1);
    return {
      ...el,
      x: newBox.x,
      y: newBox.y,
      fontSize: Math.max(10, (el.fontSize || 16) * yScale),
    };
  }

  return el;
};

const cloneElement = (el) => {
  const cloned = JSON.parse(JSON.stringify(el));
  return moveElement(
    {
      ...cloned,
      id: `${el.type || "element"}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    },
    DUPLICATE_OFFSET,
    DUPLICATE_OFFSET,
  );
};