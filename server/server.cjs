require("dotenv").config();

const express = require("express");
const http = require("http");
const Y = require("yjs");
const { WebSocketServer } = require("ws");
const authRoutes = require("./routes/authRoutes");
const {VerifyJWT} = require("./utils/authMiddleware")
const cors = require("cors")
const mongoose = require('mongoose');

const { setupWSConnection, setPersistence } = require("y-websocket/bin/utils");
const { MongodbPersistence } = require("y-mongodb-provider");

const bcryptjs = require ("bcryptjs");
const app = express();

app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true
}));
app.use(express.json());

app.use("/api/auth", authRoutes);

const port = process.env.PORT || 5000;
const mongodburi = process.env.MONGODB_URI;

const mongodbPersistence = new MongodbPersistence(mongodburi, {
    collectionName : "yjs-updates",
    flushSize : 100
});

setPersistence({
    bindState: async (docName, ydoc)=>{
        console.log(`loading initial state from mongodb from room:${docName}`)
  
try{
  const persistedYDoc = await mongodbPersistence.getYDoc(docName);

if(persistedYDoc && typeof persistedYDoc.destroy === 'function'){
  const newUpdates = Y.encodeStateAsUpdate(persistedYDoc);
    Y.applyUpdate(ydoc, newUpdates);
    console.log(`[YJS] state successfully restored for room: ${docName}`)
}
else{
  console.log(`[YJS] No previous state found for room: ${docName}. Starting with a blank canvas`)
}
}
catch(dbError){
  console.error(`[YJS DB Error] failed to fetch state for room: ${docName};`, dbError.message);
  console.log('[YJS] falling back to clean in-memory temporary canvas session')
}
ydoc.on('update', async (update)=>{
   try{
     await mongodbPersistence.storeUpdate(docName, update)
   }
   catch(saveError){
console.error(`[YJS DB Save Error] failed to save update:`, saveError.message);
   }
})
  },
  writeState: async (docName, ydoc)=>{
    console.log(`All clients disconnected. State finalized for room: ${docName}`);
    return Promise.resolve()
  }
});

const server = http.createServer(app);

app.get('/', (req, res) => {
  res.send('CanvasShare Yjs WebSocket Server Operational\n');
});

const wss = new WebSocketServer({server})

wss.on('connection', (conn, req) => {
  console.log('New user connected to the collaborative matrix');

  setupWSConnection(conn, req);
});

mongoose.connect(mongodburi)
  .then(() => {
    console.log('MongoDB connected!');
    server.listen(port, () => {
      console.log(`Collaborative Yjs server running at ws://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
  });