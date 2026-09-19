import { useEffect, useRef, useState } from "react";
import { useWhiteboard } from "../hooks/useWhiteboard";
import ToolBox from "./ui/tool-box";

const SELECTION_COLOR = "#4f46e5";
const HANDLE_SIZE = 10;
const DUPLICATE_OFFSET = 24;

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
        onDoubleClick={handleDuplicateSelected}
        style={{ cursor: getCursor() }}
        className="block bg-white touch-none w-full h-full"
      />
    </main>
  );
}
