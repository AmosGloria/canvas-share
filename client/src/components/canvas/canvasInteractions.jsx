const findElementAtPoint = (point, elements, zoom) => {
  const padding = 8 / zoom;

  for (let i = elements.length - 1; i >= 0; i -= 1) {
    const el = elements[i];
    const bounds = getElementBounds(el);
    if (isPointInsideBounds(point, bounds, padding)) return el;
  }

  return null;
};

 const handleSelectPointerDown = (worldPos, e) => {
    const currentElements = elementsRef.current;
    const currentSelection = selectedIdsRef.current;
    const selectedElements = currentElements.filter((el) =>
      currentSelection.includes(el.id),
    );
    const selectedElement =
      selectedElements.length === 1 ? selectedElements[0] : null;
    const selectedBounds = getElementBounds(selectedElement);
    const resizeHandle = getResizeHandleAtPoint(
      worldPos,
      selectedBounds,
      zoomRef.current,
    );

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

    const hitElement = findElementAtPoint(
      worldPos,
      currentElements,
      zoomRef.current,
    );
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

   const getNextSelection = (hitElement, shouldToggle) => {
    const currentSelection = selectedIdsRef.current;

    if (!hitElement) return [];

    if (!shouldToggle) {
      return currentSelection.includes(hitElement.id)
        ? currentSelection
        : [hitElement.id];
    }

    if (currentSelection.includes(hitElement.id)) {
      return currentSelection.filter((id) => id !== hitElement.id);
    }

    return [...currentSelection, hitElement.id];
  };