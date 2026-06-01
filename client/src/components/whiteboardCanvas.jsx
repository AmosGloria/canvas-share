import { useEffect, useRef, useState } from "react";
import { useWhiteboard } from "../hook/useWhiteboard";

export default function WhiteboardCanvas({roomId = "room_brainstorm_2026"}){
const canvasRef = useRef(null);
const isDrawing = useRef(false);
const currentLine = useRef([]);

const {elements, addElements} = useWhiteboard(roomId);

useEffect(()=>{
    const canvas = canvasRef.current;
    if(!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    elements.forEach(element =>{
        if(element.type === "pencil" && element.points.length > 0){
            ctx.beginPath();
            ctx.strokeStyle = element.color || '#000000';
            ctx.lineWidth = element.strokeWidth || 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

    element.points.forEach((point, index)=>{
        if(index === 0) ctx.moveTo(point[0], point[1])
            else ctx.lineTo(point[0], point[1])
    })
    ctx.stroke()
        }
    })
}, [elements]);

const handleMouseDown=(e)=>{
    isDrawing.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    currentLine.current = [[e.clientX - rect.left, e.clientY - rect.top]];
};

const handleMouseMove=(e)=>{
    if(!isDrawing.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const newPoint = [e.clientX - rect.left, e.clientY - rect.top];
    currentLine.current = [...currentLine.current, newPoint];
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = '#00000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineTo(newPoint[0], newPoint[1]);
    ctx.stroke();
};

const handleMouseUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    const newElement = {
      id: `line-${Date.now()}`,
      type: 'pencil',
      points: currentLine.current,
      color: '#00000',
      strokeWidth: 3
    };
    addElements([newElement]);
currentLine.current = [];
}

return(
    <main className="p-4">
        <canvas
        ref={canvasRef}
        width={1200}
        height={600}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}>

        </canvas>
    </main>
)
}