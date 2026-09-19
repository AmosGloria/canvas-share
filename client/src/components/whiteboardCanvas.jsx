import { useEffect, useRef, useState } from "react";
import { useWhiteboard } from "../hooks/useWhiteboard";
import ToolBox from "./ui/tool-box";

const cloneElement = (element) => ({
  ...moveElement(JSON.parse(JSON.stringify(element)), 24, 24),
  id: `${element.type || "element"}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
});

const moveElement = (element, dx, dy) => {
  if (element.points) {
    return { ...element, points: element.points.map(([x, y]) => [x + dx, y + dy]) };
  }
  if (element.start && element.end) {
    return {
      ...element,
      start: [element.start[0] + dx, element.start[1] + dy],
      end: [element.end[0] + dx, element.end[1] + dy],
    };
  }
  if (element.type === "text") return { ...element, x: element.x + dx, y: element.y + dy };
  return element;
};

const getElementBounds = (element) => {
  if (!element) return null;
  if (element.type === "text") return { x: element.x, y: element.y, width: 120, height: 24 };
  if (element.points?.length) {
    const xs = element.points.map(([x]) => x);
    const ys = element.points.map(([, y]) => y);
    return { x: Math.min(...xs) - 8, y: Math.min(...ys) - 8, width: Math.max(...xs) - Math.min(...xs) + 16, height: Math.max(...ys) - Math.min(...ys) + 16 };
  }
  if (element.start && element.end) {
    return { x: Math.min(element.start[0], element.end[0]) - 8, y: Math.min(element.start[1], element.end[1]) - 8, width: Math.abs(element.end[0] - element.start[0]) + 16, height: Math.abs(element.end[1] - element.start[1]) + 16 };
  }
  return null;
};

const isPointInBounds = (point, bounds) =>
  bounds && point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height;

export default function WhiteboardCanvas({ roomId = "room_brainstorm_2026" }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [textInput, setTextInput] = useState(null);
  const [zoom, setZoom] = useState(1);
  const isPanning = useRef(false);
  const isDrawing = useRef(false);
  const startPoint = useRef(null);
  const startPanPoint = useRef(null);
  const currentLine = useRef([]);
  const interactionRef = useRef(null);
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(1);
  const [fillColor, setFillColor] = useState("#ffffff");

  const { elements, addElements, clearElements, updateElements } =
    useWhiteboard(roomId);
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
      const { width: vw, height: vh } = containerRef.current.getBoundingClientRect();
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

  const getEventWorldCoordinates = (event) => ({
    x: (event.clientX - panRef.current.x) / zoomRef.current,
    y: (event.clientY - panRef.current.y) / zoomRef.current,
  });

  const redrawAll = (ctx, canvas, elementsToDraw, currentPan, currentZoom) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(currentPan.x, currentPan.y);
    ctx.scale(currentZoom, currentZoom);
    elementsToDraw.forEach((element) => {
      ctx.beginPath();
      ctx.strokeStyle = element.color || strokeColor;
      ctx.fillStyle = element.fillColor || "transparent";
      ctx.lineWidth = element.strokeWidth || 3;
      if (element.points?.length) {
        element.points.forEach(([x, y], index) => index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
        ctx.stroke();
      } else if (element.type === "text") {
        ctx.fillStyle = element.color || "#000000";
        ctx.font = `${element.fontSize || 16}px Arial`;
        ctx.fillText(element.text || "", element.x, element.y);
      } else if (element.start && element.end) {
        const width = element.end[0] - element.start[0];
        const height = element.end[1] - element.start[1];
        if (element.type === "circle") {
          const radius = Math.hypot(element.end[0] - element.start[0], element.end[1] - element.start[1]);
          ctx.arc(element.start[0], element.start[1], radius, 0, 2 * Math.PI);
        } else if (element.type === "diamond") {
          const midX = element.start[0] + width / 2;
          const midY = element.start[1] + height / 2;
          ctx.moveTo(midX, element.start[1]);
          ctx.lineTo(element.end[0], midY);
          ctx.lineTo(midX, element.end[1]);
          ctx.lineTo(element.start[0], midY);
          ctx.closePath();
        } else if (element.type === "arrow") {
          const angle = Math.atan2(height, width);
          ctx.moveTo(element.start[0], element.start[1]);
          ctx.lineTo(element.end[0], element.end[1]);
          ctx.moveTo(element.end[0], element.end[1]);
          ctx.lineTo(element.end[0] - 15 * Math.cos(angle - Math.PI / 6), element.end[1] - 15 * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(element.end[0], element.end[1]);
          ctx.lineTo(element.end[0] - 15 * Math.cos(angle + Math.PI / 6), element.end[1] - 15 * Math.sin(angle + Math.PI / 6));
        } else if (element.type === "rectangle" || element.type === "square") {
          const size = element.type === "square" ? Math.max(Math.abs(width), Math.abs(height)) : null;
          ctx.rect(element.start[0], element.start[1], size ? Math.sign(width || 1) * size : width, size ? Math.sign(height || 1) * size : height);
        } else {
          ctx.moveTo(element.start[0], element.start[1]);
          ctx.lineTo(element.end[0], element.end[1]);
        }
        if (element.fillColor && element.fillColor !== "transparent") ctx.fill();
        ctx.stroke();
      }
    });
    elementsToDraw.filter((element) => selectedElementIds.includes(element.id)).forEach((element) => {
      const bounds = getElementBounds(element);
      if (!bounds) return;
      ctx.setLineDash([6 / currentZoom, 4 / currentZoom]);
      ctx.strokeStyle = "#4f46e5";
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      ctx.setLineDash([]);
    });
    ctx.restore();
  };

  const handleTextSubmit = () => {
    if (!textInput || !textInput.value.trim()) {
      setTextInput(null);
      return;
    }
    const newElement = { id: `text-${Date.now()}`, type: "text", x: textInput.x, y: textInput.y, text: textInput.value.trim(), fontSize: 16, color: strokeColor };
    setCanvasElements((current) => [...current, newElement]);
    addElements([newElement]);
    setTextInput(null);
    setActiveTool("select");
  };

  const handleMouseDown = (event) => {
    if (textInput) return;
    if (event.button === 1 || activeTool === "pan") {
      isPanning.current = true;
      startPanPoint.current = { x: event.clientX - pan.x, y: event.clientY - pan.y };
      return;
    }
    const worldPos = getEventWorldCoordinates(event);
    if (activeTool === "text") {
      setTextInput({ ...worldPos, value: "" });
      return;
    }
    if (activeTool === "select") {
      const hit = [...elementsRef.current].reverse().find((element) => isPointInBounds(worldPos, getElementBounds(element)));
      setSelectedElementIds(hit ? [hit.id] : []);
      interactionRef.current = hit
        ? { type: "move", elementIds: [hit.id], startWorld: worldPos, originalElements: elementsRef.current }
        : null;
      return;
    }
    isDrawing.current = true;
    startPoint.current = worldPos;
    currentLine.current = [[worldPos.x, worldPos.y]];
  };

  const handleMouseMove = (event) => {
    if (isPanning.current && startPanPoint.current) {
      setPan({ x: event.clientX - startPanPoint.current.x, y: event.clientY - startPanPoint.current.y });
      return;
    }
    const worldPos = getEventWorldCoordinates(event);
    if (interactionRef.current?.type === "move") {
      const { startWorld, elementIds, originalElements } = interactionRef.current;
      const dx = worldPos.x - startWorld.x;
      const dy = worldPos.y - startWorld.y;
      setCanvasElements(originalElements.map((element) =>
        elementIds.includes(element.id) ? moveElement(element, dx, dy) : element,
      ));
      return;
    }
    if (!isDrawing.current) return;
    if (activeTool === "pencil" || activeTool === "eraser") {
      currentLine.current = [...currentLine.current, [worldPos.x, worldPos.y]];
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    redrawAll(canvas.getContext("2d"), canvas, elementsRef.current, panRef.current, zoomRef.current);
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.translate(panRef.current.x, panRef.current.y);
    ctx.scale(zoomRef.current, zoomRef.current);
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = fillColor;
    ctx.lineWidth = strokeWidth;
    const start = startPoint.current;
    if (activeTool === "circle") {
      ctx.beginPath();
      ctx.arc(start.x, start.y, Math.hypot(worldPos.x - start.x, worldPos.y - start.y), 0, 2 * Math.PI);
    } else if (activeTool === "rectangle" || activeTool === "square") {
      const width = worldPos.x - start.x;
      const height = worldPos.y - start.y;
      const size = activeTool === "square" ? Math.max(Math.abs(width), Math.abs(height)) : null;
      ctx.beginPath();
      ctx.rect(start.x, start.y, size ? Math.sign(width || 1) * size : width, size ? Math.sign(height || 1) * size : height);
    } else {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(worldPos.x, worldPos.y);
    }
    if (fillColor !== "transparent" && activeTool !== "line" && activeTool !== "arrow") ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  const handleMouseUp = (event) => {
    if (isPanning.current) {
      isPanning.current = false;
      return;
    }
    if (interactionRef.current?.type === "move") {
      persistElements(elementsRef.current);
      interactionRef.current = null;
      return;
    }
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const worldPos = getEventWorldCoordinates(event);
    const newElement = activeTool === "pencil" || activeTool === "eraser"
      ? { id: `line-${Date.now()}`, type: activeTool, points: currentLine.current, color: activeTool === "eraser" ? "#ffffff" : strokeColor, strokeWidth: activeTool === "eraser" ? 20 : strokeWidth }
      : { id: `shape-${Date.now()}`, type: activeTool, start: [startPoint.current.x, startPoint.current.y], end: [worldPos.x, worldPos.y], color: strokeColor, strokeWidth, fillColor };
    const nextElements = [...elementsRef.current, newElement];
    setCanvasElements(nextElements);
    addElements([newElement]);
    setSelectedElementIds([newElement.id]);
    setActiveTool("select");
    currentLine.current = [];
  };

  const handleWheel = (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    setZoom((currentZoom) => Math.min(3, Math.max(0.25, currentZoom - event.deltaY * 0.001)));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;
    redrawAll(canvas.getContext("2d"), canvas, canvasElements, pan, zoom);
  }, [canvasElements, dimensions, pan, zoom, selectedElementIds, selectionBox]);



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

    const nextElements = elementsRef.current.filter(
      (el) => !selectedIds.includes(el.id),
    );
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
    if (activeTool === "pan") return "grab";
    if (activeTool === "select") {
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
          fillColor={fillColor}
          setFillColor={setFillColor}
        />
      </div>

      {textInput && (
        <textarea
          autoFocus
          value={textInput.value}
          onChange={(e) =>
            setTextInput({ ...textInput, value: e.target.value })
          }
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
        onWheel={handleWheel}
        onDoubleClick={handleDuplicateSelected}
        style={{ cursor: getCursor() }}
        className="block bg-white touch-none w-full h-full"
      />
    </main>
  );
}
