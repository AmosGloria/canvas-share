import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { useAuth } from "./authContext";

export function useWhiteboard(roomId) {
  const { token } = useAuth();

  const [elements, setElements] = useState([]);
  const sharedElementsRef = useRef(null);
  const providerRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;

    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(
      `ws://localhost:5000?roomId=${roomId}&token=${token || "anonymous"}`,
      roomId,
      ydoc,
    );
    providerRef.current = provider;

    const yElements = ydoc.getArray("canvas-elements");
    sharedElementsRef.current = yElements;

    const handleChange = () => {
      setElements(yElements.toArray());
    };
    yElements.observe(handleChange);

    return () => {
      yElements.unobserve(handleChange);
      provider.destroy();
      ydoc.destroy();
      console.log(`disconnected from room: ${roomId}`);
    };
  }, [roomId, token]);

  const addElements = (newElements) => {
    if (!sharedElementsRef.current) return;

    const elementsToAdd = Array.isArray(newElements) ? newElements : [newElements];
    if (elementsToAdd.length === 0) return;

    sharedElementsRef.current.push(elementsToAdd);
  };

  const clearElements = () => {
    if (!sharedElementsRef.current) return;
    sharedElementsRef.current.delete(0, sharedElementsRef.current.length);
  };

  return {
    elements,
    addElements,
    clearElements,
    provider: providerRef.current,
  };
}
