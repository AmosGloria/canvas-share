  const redrawAll = (
    ctx,
    canvas,
    els,
    p,
    z,
    selectedIds = selectedElementIds,
    activeSelectionBox = selectionBox,
  ) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(z, z);

    els.forEach((el) => {
      ctx.beginPath();
      ctx.strokeStyle = el.color || "#000000";
      ctx.lineWidth = el.strokeWidth || 3;
      ctx.fillStyle = el.fillColor || "transparent";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (
        (el.type === "pencil" || el.type === "eraser") &&
        el.points?.length > 0
      ) {
        ctx.strokeStyle =
          el.type === "eraser" ? "#FFFFFF" : el.color || "#000000";
        ctx.lineWidth = el.type === "eraser" ? 20 : el.strokeWidth || 3;
        el.points.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt[0], pt[1]);
          else ctx.lineTo(pt[0], pt[1]);
        });
        ctx.stroke();
      } else if (
        (el.type === "rectangle" || el.type === "square") &&
        el.start &&
        el.end
      ) {
        let w = el.end[0] - el.start[0];
        let h = el.end[1] - el.start[1];
        if (el.type === "square") {
          const s = Math.max(Math.abs(w), Math.abs(h));
          w = w < 0 ? -s : s;
          h = h < 0 ? -s : s;
        }
        if (el.fillColor && el.fillColor !== "transparent") {
          ctx.fillRect(el.start[0], el.start[1], w, h);
        }
        ctx.strokeRect(el.start[0], el.start[1], w, h);
      } else if (el.type === "circle" && el.start && el.end) {
        const r = Math.sqrt(
          Math.pow(el.end[0] - el.start[0], 2) +
            Math.pow(el.end[1] - el.start[1], 2),
        );
        ctx.arc(el.start[0], el.start[1], r, 0, 2 * Math.PI);
        if (el.fillColor && el.fillColor !== "transparent") {
          ctx.fillStyle = el.fillColor;
          ctx.fill();
        }
        ctx.stroke();
      } else if (el.type === "text") {
        ctx.font = `${el.fontSize || 16}px Arial`;
        ctx.fillStyle = el.fillColor || fillColor;

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
        if (el.fillColor && el.fillColor !== "transparent") {
          ctx.fillStyle = el.fillColor;
          ctx.fill();
        }
        ctx.stroke();
      } else if (el.type === "arrow" && el.start && el.end) {
        const angle = Math.atan2(
          el.end[1] - el.start[1],
          el.end[0] - el.start[0],
        );
        const hl = 15;
        ctx.moveTo(el.start[0], el.start[1]);
        ctx.lineTo(el.end[0], el.end[1]);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(el.end[0], el.end[1]);
        ctx.lineTo(
          el.end[0] - hl * Math.cos(angle - Math.PI / 6),
          el.end[1] - hl * Math.sin(angle - Math.PI / 6),
        );
        ctx.moveTo(el.end[0], el.end[1]);
        ctx.lineTo(
          el.end[0] - hl * Math.cos(angle + Math.PI / 6),
          el.end[1] - hl * Math.sin(angle + Math.PI / 6),
        );
        ctx.stroke();
      } else if (el.type === "line" && el.start && el.end) {
        ctx.beginPath();
        ctx.moveTo(el.start[0], el.start[1]);
        ctx.lineTo(el.end[0], el.end[1]);
        ctx.stroke();
      }
    });

    const selectedEls = els.filter((el) => selectedIds.includes(el.id));
    drawSelections(ctx, selectedEls, z);
    drawSelectionBox(ctx, activeSelectionBox, z);

    ctx.restore();
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
        if (bounds)
          ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      });
  
      if (selectedEls.length > 1) {
        const combinedBounds = getCombinedBounds(selectedEls);
        if (combinedBounds) {
          ctx.setLineDash([]);
          ctx.strokeRect(
            combinedBounds.x,
            combinedBounds.y,
            combinedBounds.width,
            combinedBounds.height,
          );
        }
      }
  
      if (selectedEls.length === 1) {
        const bounds = getElementBounds(selectedEls[0]);
        const handleSize = HANDLE_SIZE / z;
        ctx.setLineDash([]);
  
        getResizeHandles(bounds).forEach((handle) => {
          ctx.beginPath();
          ctx.rect(
            handle.x - handleSize / 2,
            handle.y - handleSize / 2,
            handleSize,
            handleSize,
          );
          ctx.fill();
          ctx.stroke();
        });
      }
  
      ctx.restore();
    };