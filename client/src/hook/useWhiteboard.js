import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import {WebsocketProvider} from "y-websocket";

export function useWhiteboard(roomId){
    const [elements, setElements] = useState([]);
    const sharedElementsRef = useRef(null);
    const providerRef = useRef(null);

    useEffect(()=>{
        const ydoc = new Y.Doc();
        const provider = new WebsocketProvider(
            'ws://localhost:5000',
            roomId,
            ydoc
        )
        providerRef.current = provider;

        const yElements = ydoc.getArray("canvas-elements");
        sharedElementsRef.current = yElements;

        const handleChange = () => {
            setElements(yElements.toArray())
        }
        yElements.observe(handleChange);

        return ()=>{
            yElements.unobserve(handleChange);
            provider.destroy();
            ydoc.destroy();
            console.log(`disconnected from room: ${roomId}`)
        }
    },
[roomId]);

const addElements = (newElements) => {
if(sharedElementsRef.current){
    sharedElementsRef.current.push(newElements)
}
}

return{
    elements, addElements, provider: providerRef.current
}
}