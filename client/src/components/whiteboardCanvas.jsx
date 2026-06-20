import { useEffect, useRef, useState } from "react";
import { useWhiteboard } from "../hook/useWhiteboard";
import ToolBox from "./ui/tool-box";

const SELECTION_COLOR = "#4f46e5";
const HANDLE_SIZE = 10;
const DUPLICATE_OFFSET = 24;

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

  if (["rectangle", "square", "diamond", "arrow", "line"].includes(el.type) && el.start && el.end) {
    const x = Math.min(el.start[0], el.end[0]);
    const y = Math.min(el.start[1], el.end[1]);
    const width = Math.abs(el.end[0] - el.start[0]);
    const height = Math.abs(el.end[1] - el.start[1]);
    const pad = el.type === "arrow" ? 18 : 6;
    return { x: x - pad, y: y - pad, width: width + pad * 2, height: height + pad * 2 };
  }

  if (el.type === "circle" && el.start && el.end) {
    const r = Math.sqrt(Math.pow(el.end[0] - el.start[0], 2) + Math.pow(el.end[1] - el.start[1], 2));
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
    })
  );
};

const findElementAtPoint = (point, elements, zoom) => {
  const padding = 8 / zoom;

  for (let i = elements.length - 1; i >= 0; i -= 1) {
    const el = elements[i];
    const bounds = getElementBounds(el);
    if (isPointInsideBounds(point, bounds, padding)) return el;
  }

  return null;
};

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

const scalePoint = (point, oldBox, newBox) => {
  const oldWidth = oldBox.width || 1;
  const oldHeight = oldBox.height || 1;
  const xRatio = (point[0] - oldBox.x) / oldWidth;
  const yRatio = (point[1] - oldBox.y) / oldHeight;

  return [newBox.x + xRatio * newBox.width, newBox.y + yRatio * newBox.height];
};

const resizeElement = (el, oldBox, newBox) => {
  if (!oldBox) return el;

  if (el.points) {
    return { ...el, points: el.points.map((pt) => scalePoint(pt, oldBox, newBox)) };
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
    DUPLICATE_OFFSET
  );
};

export default function WhiteboardCanvas({ roomId = "room_brainstorm_2026" }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const isDrawing = useRef(false);
  const startPoint = useRef({ x: 0, y: 0 });
  const currentLine = useRef([]);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [textInput, setTextInput] = useState(null);
  const [zoom, setZoom] = useState(1);
  const isPanning = useRef(false);
  const startPanPoint = useRef({ x: 0, y: 0 });
  const interactionRef = useRef(null);
  const [strokeColor, setStrokeColor] = useState("#000000"); 
  const [strokeWidth, setStrokeWidth] = useState(1); 

  const { elements, addElements, clearElements, updateElements } = useWhiteboard(roomId);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [activeTool, setActiveTool] = useState("pencil");
  const [selectedElementIds, setSelectedElementIds] = useState([]);
  const [selectionBox, setSelectionBox] = useState(null);
  const [canvasElements, setCanvasElements] = useState([]);

  const elementsRef = useRef(canvasElements);
  useEffect(() => {
    elementsRef.current = canvasElements;
  }, [canvasElements]);

  const selectedIdsRef = useRef(selectedElementIds);
  useEffect(() => {
    selectedIdsRef.current = selectedElementIds;
  }, [selectedElementIds]);

  useEffect(() => {
    if (!interactionRef.current) setCanvasElements(elements || []);
  }, [elements]);

  const panRef = useRef(pan);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setDimensions({ width: vw, height: vh });
      const canvas = canvasRef.current;
      canvas.width = vw * 5;
      canvas.height = vh * 5;
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const persistElements = (nextElements) => {
    if (typeof updateElements === "function") {
      updateElements(nextElements);
      return;
    }

    clearElements();
    window.setTimeout(() => addElements(nextElements), 0);
  };

  const getEventWorldCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const p = panRef.current;
    const z = zoomRef.current;

    return {
      x: (e.clientX - rect.left - p.x) / z,
      y: (e.clientY - rect.top - p.y) / z,
    };
  };

  const drawSelectionBox = (ctx, box, z) => {
    if (!box) return;

    ctx.save();
    ctx.strokeStyle = SELECTION_COLOR;
    ctx.fillStyle = "rgba(79, 70, 229, 0.08)";
    ctx.lineWidth = 1.5 / z;
    ctx.setLineDash([6 / z, 4 / z]);
    ctx.fillRect(box.x, box.y, box.width, box.height);
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    ctx.restore();
  };

  const drawSelections = (ctx, selectedEls, z) => {
    if (selectedEls.length === 0) return;

    ctx.save();
    ctx.strokeStyle = SELECTION_COLOR;
    ctx.fillStyle = "#ffffff";
    ctx.lineWidth = 1.5 / z;
    ctx.setLineDash([6 / z, 4 / z]);

    selectedEls.forEach((selectedEl) => {
      const bounds = getElementBounds(selectedEl);
      if (bounds) ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    });

    if (selectedEls.length > 1) {
      const combinedBounds = getCombinedBounds(selectedEls);
      if (combinedBounds) {
        ctx.setLineDash([]);
        ctx.strokeRect(combinedBounds.x, combinedBounds.y, combinedBounds.width, combinedBounds.height);
      }
    }

    if (selectedEls.length === 1) {
      const bounds = getElementBounds(selectedEls[0]);
      const handleSize = HANDLE_SIZE / z;
      ctx.setLineDash([]);

      getResizeHandles(bounds).forEach((handle) => {
        ctx.beginPath();
        ctx.rect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
        ctx.fill();
        ctx.stroke();
      });
    }

    ctx.restore();
  };

  const redrawAll = (ctx, canvas, els, p, z, selectedIds = selectedElementIds, activeSelectionBox = selectionBox) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(z, z);

    els.forEach((el) => {
      ctx.beginPath();
      ctx.strokeStyle = el.color || "#000000";
      ctx.lineWidth = el.strokeWidth || 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if ((el.type === "pencil" || el.type === "eraser") && el.points?.length > 0) {
        ctx.strokeStyle = el.type === "eraser" ? "#FFFFFF" : el.color || "#000000";
        ctx.lineWidth = el.type === "eraser" ? 20 : el.strokeWidth || 3;
        el.points.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt[0], pt[1]);
          else ctx.lineTo(pt[0], pt[1]);
        });
        ctx.stroke();
      } else if ((el.type === "rectangle" || el.type === "square") && el.start && el.end) {
        let w = el.end[0] - el.start[0];
        let h = el.end[1] - el.start[1];
        if (el.type === "square") {
          const s = Math.max(Math.abs(w), Math.abs(h));
          w = w < 0 ? -s : s;
          h = h < 0 ? -s : s;
        }
        ctx.strokeRect(el.start[0], el.start[1], w, h);
      } else if (el.type === "circle" && el.start && el.end) {
        const r = Math.sqrt(Math.pow(el.end[0] - el.start[0], 2) + Math.pow(el.end[1] - el.start[1], 2));
        ctx.arc(el.start[0], el.start[1], r, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (el.type === "text") {
        ctx.font = `${el.fontSize || 16}px Arial`;
        ctx.fillStyle = el.color || "#000000";
        ctx.textBaseline = "top";
        (el.text || "").split("\n").forEach((line, i) => {
          ctx.fillText(line, el.x, el.y + i * (el.fontSize || 20));
        });
      } else if (el.type === "diamond" && el.start && el.end) {
        const midX = (el.start[0] + el.end[0]) / 2;
        const midY = (el.start[1] + el.end[1]) / 2;
        ctx.moveTo(midX, el.start[1]);
        ctx.lineTo(el.end[0], midY);
        ctx.lineTo(midX, el.end[1]);
        ctx.lineTo(el.start[0], midY);
        ctx.closePath();
        ctx.stroke();
      } else if (el.type === "arrow" && el.start && el.end) {
        const angle = Math.atan2(el.end[1] - el.start[1], el.end[0] - el.start[0]);
        const hl = 15;
        ctx.moveTo(el.start[0], el.start[1]);
        ctx.lineTo(el.end[0], el.end[1]);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(el.end[0], el.end[1]);
        ctx.lineTo(el.end[0] - hl * Math.cos(angle - Math.PI / 6), el.end[1] - hl * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(el.end[0], el.end[1]);
        ctx.lineTo(el.end[0] - hl * Math.cos(angle + Math.PI / 6), el.end[1] - hl * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      } else if(el.type === "line" && el.start && el.end) {
        ctx.beginPath();
        ctx.moveTo(el.start[0], el.start[1]);
        ctx.lineTo(el.end[0], el.end[1]);
        ctx.stroke()
      }
    });

    const selectedEls = els.filter((el) => selectedIds.includes(el.id));
    drawSelections(ctx, selectedEls, z);
    drawSelectionBox(ctx, activeSelectionBox, z);

    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;
    redrawAll(canvas.getContext("2d"), canvas, canvasElements, pan, zoom);
  }, [canvasElements, dimensions, pan, zoom, selectedElementIds, selectionBox]);

  const getNextSelection = (hitElement, shouldToggle) => {
    const currentSelection = selectedIdsRef.current;

    if (!hitElement) return [];

    if (!shouldToggle) {
      return currentSelection.includes(hitElement.id) ? currentSelection : [hitElement.id];
    }

    if (currentSelection.includes(hitElement.id)) {
      return currentSelection.filter((id) => id !== hitElement.id);
    }

    return [...currentSelection, hitElement.id];
  };

  const handleSelectPointerDown = (worldPos, e) => {
    const currentElements = elementsRef.current;
    const currentSelection = selectedIdsRef.current;
    const selectedElements = currentElements.filter((el) => currentSelection.includes(el.id));
    const selectedElement = selectedElements.length === 1 ? selectedElements[0] : null;
    const selectedBounds = getElementBounds(selectedElement);
    const resizeHandle = getResizeHandleAtPoint(worldPos, selectedBounds, zoomRef.current);

    if (selectedElement && resizeHandle) {
      interactionRef.current = {
        type: "resize",
        elementId: selectedElement.id,
        handle: resizeHandle.id,
        startWorld: worldPos,
        originalElements: currentElements,
        originalBox: selectedBounds,
      };
      return;
    }

    const hitElement = findElementAtPoint(worldPos, currentElements, zoomRef.current);
    const shouldToggle = e.shiftKey || e.ctrlKey || e.metaKey;

    if (hitElement) {
      const nextSelection = getNextSelection(hitElement, shouldToggle);
      setSelectedElementIds(nextSelection);

      if (nextSelection.includes(hitElement.id)) {
        interactionRef.current = {
          type: "move",
          elementIds: nextSelection,
          startWorld: worldPos,
          originalElements: currentElements,
        };
      }

      return;
    }

    setSelectionBox({ x: worldPos.x, y: worldPos.y, width: 0, height: 0 });
    if (!shouldToggle) setSelectedElementIds([]);

    interactionRef.current = {
      type: "marquee",
      startWorld: worldPos,
      currentWorld: worldPos,
      originalSelection: shouldToggle ? currentSelection : [],
      originalElements: currentElements,
    };
  };

  const handleMouseDown = (e) => {
    if (textInput) return;

    if (e.button === 1 || activeTool === "pan") {
      isPanning.current = true;
      startPanPoint.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    const worldPos = getEventWorldCoordinates(e);

    if (activeTool === "select") {
      handleSelectPointerDown(worldPos, e);
      return;
    }

    if (activeTool === "text") {
      setTextInput({ x: worldPos.x, y: worldPos.y, value: "" });
      setSelectedElementIds([]);
      return;
    }

    isDrawing.current = true;
    setSelectedElementIds([]);
    startPoint.current = { x: worldPos.x, y: worldPos.y };
    currentLine.current = [[worldPos.x, worldPos.y]];
  };

  const handleMouseMove = (e) => {
    if (textInput) return;

    if (isPanning.current) {
      setPan({ x: e.clientX - startPanPoint.current.x, y: e.clientY - startPanPoint.current.y });
      return;
    }

    const worldPos = getEventWorldCoordinates(e);

    if (interactionRef.current) {
      const interaction = interactionRef.current;
      let nextElements = interaction.originalElements;

      if (interaction.type === "move") {
        const dx = worldPos.x - interaction.startWorld.x;
        const dy = worldPos.y - interaction.startWorld.y;
        nextElements = interaction.originalElements.map((el) =>
          interaction.elementIds.includes(el.id) ? moveElement(el, dx, dy) : el
        );
        setCanvasElements(nextElements);
        return;
      }

      if (interaction.type === "resize") {
        const newBox = buildResizedBox(interaction.originalBox, interaction.handle, worldPos);
        nextElements = interaction.originalElements.map((el) =>
          el.id === interaction.elementId ? resizeElement(el, interaction.originalBox, newBox) : el
        );
        setCanvasElements(nextElements);
        return;
      }

      if (interaction.type === "marquee") {
        const nextBox = buildBoxFromPoints(interaction.startWorld, worldPos);
        const selectedByBox = interaction.originalElements
          .filter((el) => doBoundsIntersect(getElementBounds(el), nextBox))
          .map((el) => el.id);
        const mergedSelection = Array.from(new Set([...interaction.originalSelection, ...selectedByBox]));

        setSelectionBox(nextBox);
        setSelectedElementIds(mergedSelection);
        return;
      }
    }

    if (!isDrawing.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const p = panRef.current;
    const z = zoomRef.current;

    if (activeTool === "pencil" || activeTool === "eraser") {
      const pts = currentLine.current;
      currentLine.current = [...pts, [worldPos.x, worldPos.y]];

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(z, z);
      ctx.strokeStyle = activeTool === "eraser" ? "#FFFFFF" : strokeColor;
      ctx.lineWidth = activeTool === "eraser" ? 20 : strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
      ctx.lineTo(worldPos.x, worldPos.y);
      ctx.stroke();
      ctx.restore();
    } else {
      redrawAll(ctx, canvas, elementsRef.current, p, z, [], null);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(z, z);

      ctx.beginPath();
      ctx.strokeStyle = SELECTION_COLOR;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const sp = startPoint.current;
      if (activeTool === "rectangle" || activeTool === "square") {
        let w = worldPos.x - sp.x;
        let h = worldPos.y - sp.y;
        if (activeTool === "square") {
          const s = Math.max(Math.abs(w), Math.abs(h));
          w = w < 0 ? -s : s;
          h = h < 0 ? -s : s;
        }
        ctx.strokeRect(sp.x, sp.y, w, h);
      } else if (activeTool === "circle") {
        const r = Math.sqrt(Math.pow(worldPos.x - sp.x, 2) + Math.pow(worldPos.y - sp.y, 2));
        ctx.arc(sp.x, sp.y, r, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (activeTool === "diamond") {
        const midX = (sp.x + worldPos.x) / 2;
        const midY = (sp.y + worldPos.y) / 2;
        ctx.moveTo(midX, sp.y);
        ctx.lineTo(worldPos.x, midY);
        ctx.lineTo(midX, worldPos.y);
        ctx.lineTo(sp.x, midY);
        ctx.closePath();
        ctx.stroke();
      }else if(activeTool === "line"){
        ctx.moveTo(sp.x, sp.y);
        ctx.lineTo(worldPos.x, worldPos.y);
        ctx.stroke()
      }
       else if (activeTool === "arrow") {
        const angle = Math.atan2(worldPos.y - sp.y, worldPos.x - sp.x);
        ctx.moveTo(sp.x, sp.y);
        ctx.lineTo(worldPos.x, worldPos.y);
        ctx.lineTo(worldPos.x - 15 * Math.cos(angle - Math.PI / 6), worldPos.y - 15 * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(worldPos.x, worldPos.y);
        ctx.lineTo(worldPos.x - 15 * Math.cos(angle + Math.PI / 6), worldPos.y - 15 * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }

      ctx.restore();
      currentLine.current = [[worldPos.x, worldPos.y]];
    }
  };

  const handleMouseUp = (e) => {
    if (textInput) return;

    if (isPanning.current) {
      isPanning.current = false;
      return;
    }

    if (interactionRef.current) {
      const interaction = interactionRef.current;
      if (interaction.type === "move" || interaction.type === "resize") {
        persistElements(elementsRef.current);
      }
      setSelectionBox(null);
      interactionRef.current = null;
      return;
    }

    if (!isDrawing.current) return;
    isDrawing.current = false;

    const worldPos = getEventWorldCoordinates(e);
    let newElement = null;

    if ((activeTool === "pencil" || activeTool === "eraser") && currentLine.current.length > 1) {
      newElement = {
        id: `line-${Date.now()}`,
        type: activeTool,
        points: currentLine.current,
        color: activeTool === "eraser" ? "#FFFFFF" : strokeColor,
        strokeWidth: activeTool === "eraser" ? 20 : strokeWidth,
      };
    } else if (activeTool !== "pencil" && activeTool !== "eraser" && activeTool !== "text") {
      newElement = {
        id: `shape-${Date.now()}`,
        type: activeTool,
        start: [startPoint.current.x, startPoint.current.y],
        end: [worldPos.x, worldPos.y],
        color: strokeColor,
        strokeWidth: strokeWidth,
      };
    }

    if (newElement) {
      const nextElements = [...elementsRef.current, newElement];
      setCanvasElements(nextElements);
      addElements([newElement]);
      setSelectedElementIds([newElement.id]);
      setActiveTool("select");
    }

    currentLine.current = [];
  };

  const handleTextSubmit = () => {
    if (!textInput || textInput.value.trim() === "") {
      setTextInput(null);
      return;
    }

    const newTextElement = {
      id: `text-${Date.now()}`,
      type: "text",
      x: textInput.x,
      y: textInput.y,
      text: textInput.value.trim(),
      fontSize: 16,
      color: "#000000",
    };

    const nextElements = [...elementsRef.current, newTextElement];
    setCanvasElements(nextElements);
    addElements([newTextElement]);
    setSelectedElementIds([newTextElement.id]);
    setActiveTool("select");
    setTextInput(null);
  };

  const handleDuplicateSelected = () => {
    const selectedIds = selectedIdsRef.current;
    if (selectedIds.length === 0) return;

    const duplicates = elementsRef.current
      .filter((el) => selectedIds.includes(el.id))
      .map((el) => cloneElement(el));

    if (duplicates.length === 0) return;

    const nextElements = [...elementsRef.current, ...duplicates];
    setCanvasElements(nextElements);
    addElements(duplicates);
    setSelectedElementIds(duplicates.map((el) => el.id));
    setActiveTool("select");
  };

  const handleDeleteSelected = () => {
    const selectedIds = selectedIdsRef.current;
    if (selectedIds.length === 0) return;

    const nextElements = elementsRef.current.filter((el) => !selectedIds.includes(el.id));
    setSelectedElementIds([]);
    setCanvasElements(nextElements);
    persistElements(nextElements);
  };

  useEffect(() => {
    const handleKeyboardShortcut = (e) => {
      if (textInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleDuplicateSelected();
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIdsRef.current.length > 0) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }

      if (e.key === "Escape") {
        setSelectedElementIds([]);
        setSelectionBox(null);
        interactionRef.current = null;
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  });

  const handleClearCanvas = () => {
    if (window.confirm("Clear the whiteboard for everyone?")) {
      setSelectedElementIds([]);
      setSelectionBox(null);
      setCanvasElements([]);
      clearElements();
    }
  };

  const getCursor = () => {
    if (activeTool === "pan") return isPanning.current ? "grabbing" : "grab";
    if (activeTool === "select") {
      if (interactionRef.current?.type === "marquee") return "crosshair";
      if (interactionRef.current?.type === "move") return "move";
      if (interactionRef.current?.type === "resize") return "nwse-resize";
      return "default";
    }
    return "crosshair";
  };

  return (
    <main
      ref={containerRef}
      className="w-screen h-screen fixed inset-0 bg-white overflow-hidden select-none"
    >
      <div className="fixed z-10 top-3 left-3 w-fit">
        <ToolBox
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          onClearCanvas={handleClearCanvas}
          onDuplicateSelected={handleDuplicateSelected}
          onDeleteSelected={handleDeleteSelected}
          hasSelectedElement={selectedElementIds.length > 0}
          selectedCount={selectedElementIds.length}
          strokeColor={strokeColor}
          setStrokeColor={setStrokeColor}
          strokeWidth={strokeWidth}
          setStrokeWidth={setStrokeWidth}
        />
      </div>

      {textInput && (
        <textarea
          autoFocus
          value={textInput.value}
          onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleTextSubmit();
            }
            if (e.key === "Escape") setTextInput(null);
          }}
          style={{
            position: "fixed",
            top: textInput.y * zoom + pan.y,
            left: textInput.x * zoom + pan.x,
            font: `${16 * zoom}px Arial`,
            color: "#000000",
            background: "transparent",
            border: "1px dashed #4f46e5",
            outline: "none",
            padding: 0,
            margin: 0,
            resize: "both",
            minWidth: "100px",
            minHeight: "24px",
            zIndex: 50,
          }}
        />
      )}

      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDuplicateSelected}
        style={{ cursor: getCursor() }}
        className="block bg-white touch-none w-full h-full"
      />
    </main>
  );
}
