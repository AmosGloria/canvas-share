import React from "react";
import {
  LuPencil, 
  LuCircle, 
  LuSquare, 
  LuRectangleHorizontal, 
  LuEraser, 
  LuDiamond, 
  LuArrowRight, 
  LuTrash2, LuCopy} from "react-icons/lu";
import { MdTextFields, MdDeleteSweep, MdHorizontalRule } from "react-icons/md";

interface ToolBoxProps {
  activeTool: string;
  setActiveTool: (toolId: string) => void;
  onClearCanvas: () => void;
  onDuplicateSelected?: () => void;
  onDeleteSelected?: () => void;
  hasSelectedElement?: boolean;
  selectedCount?: number;
}

export default function ToolBox({
  activeTool,
  setActiveTool,
  onClearCanvas,
  onDuplicateSelected,
  onDeleteSelected,
  hasSelectedElement = false,
  selectedCount = 0,
}: ToolBoxProps) {
  const tools = [
    { id: "select", icon: "🖱️", label: "Select" },
    { id: "pencil", icon: <LuPencil/>, label: "Sketch" },
    { id: "eraser", icon: <LuEraser/>, label: "Eraser" },
    { id: "text", icon: <MdTextFields/>, label: "Text" },
    { id: "rectangle", icon:<LuRectangleHorizontal/>, label: "Rectangle" },
    { id: "square", icon: <LuSquare/>, label: "Square" },
    { id: "circle", icon: <LuCircle/>, label: "Circle" },
    { id: "diamond", icon: <LuDiamond/>, label: "Diamond" },
    { id: "arrow", icon: <LuArrowRight/>, label: "Arrow" },
    { id: "line", icon: <MdHorizontalRule/>, label: "Line"},
  ];

  const selectedLabel =
    selectedCount > 1 ? `${selectedCount} selected` : "1 selected";

  return (
    <main className="inline-flex flex-col lg:flex-row items-center gap-1 rounded-2xl bg-slate-950/95 p-2 shadow-xl">
      {tools.map((tool) => (
        <button
          key={tool.id}
          type="button"
          onClick={() => setActiveTool(tool.id)}
          title={tool.label}
          aria-label={tool.label}
          className={`w-9 h-9 flex shrink-0 items-center justify-center rounded-xl text-sm font-semibold border transition-all duration-200 ${
            activeTool === tool.id
              ? "bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20"
              : "text-slate-300 border-transparent hover:bg-slate-800/80 hover:text-white"
          }`}
        >
          <span aria-hidden="true">{tool.icon}</span>
        </button>
      ))}

      {hasSelectedElement && (
        <span
          title={selectedLabel}
          aria-label={selectedLabel}
          className="w-9 h-9 flex shrink-0 items-center justify-center rounded-xl text-xs font-bold text-indigo-200 bg-indigo-500/10 border border-indigo-400/20"
        >
          <span aria-hidden="true">✅</span>
        </span>
      )}

      <button
        type="button"
        onClick={onDuplicateSelected}
        disabled={!hasSelectedElement}
        title="Duplicate selected object(s). Shortcut: Ctrl/Cmd + D"
        aria-label="Duplicate selected object(s)"
        className={`w-9 h-9 flex shrink-0 items-center justify-center rounded-xl text-sm font-bold border transition-all duration-200 ${
          hasSelectedElement
            ? "text-emerald-300 border-transparent hover:border-emerald-500/30 hover:bg-emerald-500/10"
            : "text-slate-600 border-transparent cursor-not-allowed"
        }`}
      >
        <LuCopy/>
      </button>

      <button
        type="button"
        onClick={onDeleteSelected}
        disabled={!hasSelectedElement}
        title="Delete selected object(s). Shortcut: Delete or Backspace"
        aria-label="Delete selected object(s)"
        className={`w-9 h-9 flex shrink-0 items-center justify-center rounded-xl text-sm font-bold border transition-all duration-200 ${
          hasSelectedElement
            ? "text-amber-300 border-transparent hover:border-amber-500/30 hover:bg-amber-500/10"
            : "text-slate-600 border-transparent cursor-not-allowed"
        }`}
      >
        <LuTrash2/>
      </button>

      <button
        type="button"
        onClick={onClearCanvas}
        title="Clear all objects"
        aria-label="Clear all objects"
        className="w-9 h-9 flex shrink-0 items-center justify-center rounded-xl text-sm font-bold text-rose-400 border border-transparent hover:border-rose-500/30 hover:bg-rose-500/10 transition-all duration-200"
      >
        <MdDeleteSweep/>
      </button>
    </main>
  );
}