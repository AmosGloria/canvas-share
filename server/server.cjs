require("dotenv").config();

const express = require("express");
const http = require("http");
const Y = require("yjs");
const { WebSocketServer } = require("ws");

const { setupWSConnection, setPersistence } = require("y-websocket/bin/utils");
const { MongodbPersistence } = require("y-mongodb-provider");

const bcryptjs = require ("bcryptjs");

const port = process.env.PORT || 5000;
const mongodburi = process.env.MONGODB_URI;

const mongodbPersistence = new MongodbPersistence(mongodburi, {
    collectionName : "yjs-updates",
    flushSize : 100
});

setPersistence({
    bindState: async (docName, ydoc)=>{
        console.log(`loading initial state from mongodb from room:${docName}`)
  

const persistedYDoc = await mongodbPersistence.getYDoc(docName);

const newUpdates = Y.encodeStateAsUpdate(persistedYDoc);
    Y.applyUpdate(ydoc, newUpdates);

ydoc.on('update', async (update)=>{
    await mongodbPersistence.storeUpdate(docName, update)
})
persistedYDoc.destroy()
  },
  writeState: async (docName, ydoc)=>{
    console.log(`All clients disconnected. State finalized for room: ${docName}`);
    return Promise.resolve()
  }
});

const server = http.createServer((request, response)=>{
    response.writeHead(200, {'Content-Type' : 'text/plain'});
    response.end('CanvasShare Yjs WebSocket Server Operational\n');
})

const wss = new WebSocketServer({server})

wss.on('connection', (conn, req) => {
  console.log('New user connected to the collaborative matrix');

  setupWSConnection(conn, req);
});

server.listen(port, () => {
  console.log(`Collaborative Yjs server running at ws://localhost:${port}`);
});