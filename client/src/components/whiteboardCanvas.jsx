import { useEffect, useRef, useState } from "react";
import { useWhiteboard } from "../hook/useWhiteboard";
import ToolBox from "./ui/tool-box";

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

  const { elements, addElements, clearElements } = useWhiteboard(roomId);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [activeTool, setActiveTool] = useState("pencil");

  const elementsRef = useRef(elements);
  useEffect(() => { elementsRef.current = elements; }, [elements]);
  const panRef = useRef(pan);
  useEffect(() => { panRef.current = pan; }, [pan]);
  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

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

  const redrawAll = (ctx, canvas, els, p, z) => {
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
      }
    });

    ctx.restore(); 
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;
    redrawAll(canvas.getContext("2d"), canvas, elements, pan, zoom);
  }, [elements, dimensions, pan, zoom]);

  const handleMouseDown = (e) => {
    if (textInput) return;

    if (e.button === 1 || activeTool === "pan") {
      isPanning.current = true;
      startPanPoint.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    const worldPos = getEventWorldCoordinates(e);

    if (activeTool === "text") {
      setTextInput({ x: worldPos.x, y: worldPos.y, value: "" });
      return;
    }

    isDrawing.current = true;
    startPoint.current = { x: worldPos.x, y: worldPos.y };
    currentLine.current = [[worldPos.x, worldPos.y]];
  };

  const handleMouseMove = (e) => {
    if (textInput) return;
    if (isPanning.current) {
      setPan({ x: e.clientX - startPanPoint.current.x, y: e.clientY - startPanPoint.current.y });
      return;
    }
    if (!isDrawing.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const worldPos = getEventWorldCoordinates(e);
    const p = panRef.current;
    const z = zoomRef.current;

    if (activeTool === "pencil" || activeTool === "eraser") {
      const pts = currentLine.current;
      currentLine.current = [...pts, [worldPos.x, worldPos.y]];

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(z, z);
      ctx.strokeStyle = activeTool === "eraser" ? "#FFFFFF" : "#000000";
      ctx.lineWidth = activeTool === "eraser" ? 20 : 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
      ctx.lineTo(worldPos.x, worldPos.y);
      ctx.stroke();
      ctx.restore();
    } else {
      redrawAll(ctx, canvas, elementsRef.current, p, z);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(z, z);

      // live preview shapes
      ctx.beginPath();
      ctx.strokeStyle = "#4f46e5";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (activeTool !== "text") {
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
        } else if (activeTool === "arrow") {
          const angle = Math.atan2(worldPos.y - sp.y, worldPos.x - sp.x);
          ctx.moveTo(sp.x, sp.y);
          ctx.lineTo(worldPos.x, worldPos.y);
          ctx.lineTo(worldPos.x - 15 * Math.cos(angle - Math.PI / 6), worldPos.y - 15 * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(worldPos.x, worldPos.y);
          ctx.lineTo(worldPos.x - 15 * Math.cos(angle + Math.PI / 6), worldPos.y - 15 * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
        }
      }

      ctx.restore();
      currentLine.current = [[worldPos.x, worldPos.y]];
    }
  };

  const handleMouseUp = (e) => {
    if (textInput) return;
    if (isPanning.current) { isPanning.current = false; return; }
    if (!isDrawing.current) return;
    isDrawing.current = false;

    const worldPos = getEventWorldCoordinates(e);
    let newElement = null;

    if ((activeTool === "pencil" || activeTool === "eraser") && currentLine.current.length > 1) {
      newElement = {
        id: `line-${Date.now()}`,
        type: activeTool,
        points: currentLine.current,
        color: "#000000",
        strokeWidth: 3,
      };
    } else if (activeTool !== "pencil" && activeTool !== "eraser" && activeTool !== "text") {
      newElement = {
        id: `shape-${Date.now()}`,
        type: activeTool,
        start: [startPoint.current.x, startPoint.current.y],
        end: [worldPos.x, worldPos.y],
        color: "#000000",
        strokeWidth: 3,
      };
    }

    if (newElement) addElements([newElement]);
    currentLine.current = [];
  };

  const handleTextSubmit = () => {
    if (!textInput || textInput.value.trim() === "") { setTextInput(null); return; }
    addElements([{
      id: `text-${Date.now()}`,
      type: "text",
      x: textInput.x,
      y: textInput.y,
      text: textInput.value.trim(),
      fontSize: 16,
      color: "#000000",
    }]);
    setTextInput(null);
  };

  const handleClearCanvas = () => {
    if (window.confirm("Clear the whiteboard for everyone?")) clearElements();
  };

  return (
    <main
      ref={containerRef}
      className="w-screen h-screen fixed inset-0 bg-white overflow-hidden select-none"
    >
      <div className="absolute z-10 flex w-fit">
        <ToolBox
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          onClearCanvas={handleClearCanvas}
        />
      </div>

      {textInput && (
        <textarea
          autoFocus
          value={textInput.value}
          onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTextSubmit(); }
            if (e.key === "Escape") { setTextInput(null); }
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
        style={{ cursor: activeTool === "pan" ? "grab" : "crosshair" }}
        className="block bg-white touch-none w-full h-full"
      />
    </main>
  );
}