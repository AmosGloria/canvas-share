Canvas Share

Canvas Share is a real-time collaborative whiteboard application that allows multiple users to draw, sketch, and annotate simultaneously. It features a rich set of drawing tools, customizable stroke and fill colors, and live updates across connected clients using Yjs and WebSockets.

Future feature: Integration of video conferencing to allow live audio/video collaboration while drawing.

Features
Real-time collaboration – Multiple users can draw simultaneously with updates synchronized instantly.
Drawing tools:
Pencil / Freehand sketch
Eraser
Text
Shapes: Rectangle, Square, Circle, Diamond, Arrow, Line
Customizable styles:
Stroke color and thickness
Fill color for shapes
Selection and editing:
Select, duplicate, delete objects
Clear canvas – Only the creator of a shape can clear it globally, while others can clear their own local canvas.
Infinite canvas – Expanding canvas size to accommodate ongoing drawing.
Persistent storage – Yjs updates stored in MongoDB for real-time state persistence.
Planned: Video conferencing to support live voice/video interaction.
Tech Stack
Frontend: React.js, Tailwind CSS, HTML5 Canvas
Backend: Node.js, Express
Real-time Collaboration: WebSockets via Yjs
Database: MongoDB (local Docker or MongoDB Atlas free tier)
Deployment-ready: Dockerized backend for scalable hosting
Installation
Prerequisites
Node.js ≥ 18
Docker (for local MongoDB)
npm or yarn
Steps
Clone the repository:
git clone https://github.com/AmosGloria/canvas-share.git
cd canvas-share
Start MongoDB (local Docker example):
docker compose up -d
Install server dependencies:
cd server
npm install
Install client dependencies:
cd ../client
npm install
Configure environment variables:

Create a .env in the server folder:

PORT=5000
MONGODB_URI=mongodb://localhost:27017/canvas-share
Run the backend server:
cd server
node server.cjs
Run the frontend client:
cd client
pnpm dev
Usage
Open http://localhost:5173/ in multiple browsers.
Select drawing tools from the toolbox at the top.
Pick stroke color, fill color, and stroke width.
Draw shapes, text, or freehand sketches.
Real-time updates appear on all connected clients.
Only creators can clear their shapes globally; other users can clear locally.
Future updates will include live video/audio collaboration.
Deployment Recommendations
Frontend: Cloudflare Pages (free, scalable)
Backend + DB: Fly.io (Dockerized, persistent volumes) or Railway (free tier for development)
MongoDB: Atlas free tier (512 MB storage) for portfolio/demo purposes
Use Docker for replicable deployments and future scaling.
License

MIT License – feel free to fork and modify for learning or portfolio use.

Contact
GitHub: https://github.com/AmosGloria
Email: amoskesegloria@gmail.com