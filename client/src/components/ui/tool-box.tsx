import React from "react";

interface ToolBoxProps{
    activeTool:string,
    setActiveTool : (toolId:string)=>void,
    onClearCanvas: ()=>void
}

export default function ToolBox({ activeTool, setActiveTool, onClearCanvas }:ToolBoxProps) {
  const drawingTools = [
    { id: "pencil", label: "✏️ Sketch" },
    { id: "eraser", label: "🧽 Eraser" },
    { id: "text", label: "🔤 Text" },
  ];

  const shapeTools = [
    { id: "rectangle", label: "⬜ Rectangle" },
    { id: "square", label: "⏹️ Square" },
    { id: "circle", label: "⭕ Circle" },
    { id: "diamond", label: "🔷 Diamond" },
    { id: "arrow", label: "➡️ Arrow" },
  ];

  return (
    <main className="flex flex-col lg:flex-row">
      <div className="flex items-center">
        {drawingTools.map((tool) => (
          <button
            key={tool.id}
            onClick={()=>setActiveTool(tool.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide border transition-all duration-200 whitespace-nowrap ${
              activeTool === tool.id
                ? "bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20"
                : "text-slate-300 border-transparent hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            {tool.label}
          </button>
        ))}
      </div>

      <section>
        <div className="flex">
          {shapeTools.map((tool) => (
            <button
              key={tool.id}
              onClick={()=>setActiveTool(tool.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide border transition-all duration-200 whitespace-nowrap ${
                activeTool ===tool.id?
                 "bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20"
                : "text-slate-300 border-transparent hover:bg-slate-800/80 hover:text-white"
              }`}
            >{tool.label}</button>
          ))}
        </div>
      </section>

      <div className="w-[1px] h-6 bg-slate-700/80 shrink-0" />
      <button
        onClick={onClearCanvas}
        className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-400 border border-transparent hover:border-rose-500/30 hover:bg-rose-500/10 transition-all duration-200 whitespace-nowrap"
      >
        🗑️ Clear All
      </button>
    </main>
  );
}
