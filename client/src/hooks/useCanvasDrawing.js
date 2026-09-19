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
        setPan({
          x: e.clientX - startPanPoint.current.x,
          y: e.clientY - startPanPoint.current.y,
        });
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
            interaction.elementIds.includes(el.id) ? moveElement(el, dx, dy) : el,
          );
          setCanvasElements(nextElements);
          return;
        }
  
        if (interaction.type === "resize") {
          const newBox = buildResizedBox(
            interaction.originalBox,
            interaction.handle,
            worldPos,
          );
          nextElements = interaction.originalElements.map((el) =>
            el.id === interaction.elementId
              ? resizeElement(el, interaction.originalBox, newBox)
              : el,
          );
          setCanvasElements(nextElements);
          return;
        }
  
        if (interaction.type === "marquee") {
          const nextBox = buildBoxFromPoints(interaction.startWorld, worldPos);
          const selectedByBox = interaction.originalElements
            .filter((el) => doBoundsIntersect(getElementBounds(el), nextBox))
            .map((el) => el.id);
          const mergedSelection = Array.from(
            new Set([...interaction.originalSelection, ...selectedByBox]),
          );
  
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
        ctx.strokeStyle = strokeColor;
        ctx.fillStyle = fillColor;
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
          const r = Math.sqrt(
            Math.pow(worldPos.x - sp.x, 2) + Math.pow(worldPos.y - sp.y, 2),
          );
          ctx.arc(sp.x, sp.y, r, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        } else if (activeTool === "diamond") {
          const midX = (sp.x + worldPos.x) / 2;
          const midY = (sp.y + worldPos.y) / 2;
          ctx.moveTo(midX, sp.y);
          ctx.lineTo(worldPos.x, midY);
          ctx.lineTo(midX, worldPos.y);
          ctx.lineTo(sp.x, midY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (activeTool === "line") {
          ctx.moveTo(sp.x, sp.y);
          ctx.lineTo(worldPos.x, worldPos.y);
          ctx.stroke();
        } else if (activeTool === "arrow") {
          const angle = Math.atan2(worldPos.y - sp.y, worldPos.x - sp.x);
          ctx.moveTo(sp.x, sp.y);
          ctx.lineTo(worldPos.x, worldPos.y);
          ctx.lineTo(
            worldPos.x - 15 * Math.cos(angle - Math.PI / 6),
            worldPos.y - 15 * Math.sin(angle - Math.PI / 6),
          );
          ctx.moveTo(worldPos.x, worldPos.y);
          ctx.lineTo(
            worldPos.x - 15 * Math.cos(angle + Math.PI / 6),
            worldPos.y - 15 * Math.sin(angle + Math.PI / 6),
          );
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
    
        if (
          (activeTool === "pencil" || activeTool === "eraser") &&
          currentLine.current.length > 1
        ) {
          newElement = {
            id: `line-${Date.now()}`,
            type: activeTool,
            points: currentLine.current,
            color: activeTool === "eraser" ? "#FFFFFF" : strokeColor,
            strokeWidth: activeTool === "eraser" ? 20 : strokeWidth,
          };
        } else if (
          activeTool !== "pencil" &&
          activeTool !== "eraser" &&
          activeTool !== "text"
        ) {
          newElement = {
            id: `shape-${Date.now()}`,
            type: activeTool,
            start: [startPoint.current.x, startPoint.current.y],
            end: [worldPos.x, worldPos.y],
            color: strokeColor,
            strokeWidth: strokeWidth,
            fillColor: fillColor,
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