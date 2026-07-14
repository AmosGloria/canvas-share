require("dotenv").config();
const { MongoClient } = require("mongodb");
const bcryptjs = require("bcryptjs");

const uri = process.env.MONGODB_URI || "mongodb://admin:Kese4Glory@localhost:27017/canvas_share?authSource=admin";
const client = new MongoClient(uri);

async function runSeed() {
  try {
    console.log("Connecting to your Docker MongoDB instance...");
    await client.connect();
    
    const db = client.db("canvas_share");
    console.log("Connected smoothly to database: canvas_share");

    const existingCollections = await db.listCollections().toArray();
    const names = existingCollections.map(c => c.name);
    
    if (names.includes("users")) {
        await db.collection("users").drop();
        console.log("Cleared old users collection.");
    }
    if (names.includes("rooms")) {
        await db.collection("rooms").drop();
        console.log("Cleared old rooms collection.");
    }

    if(names.includes("elements")){
        await db.collection("elements").drop();
        console.log("cleared old elements")
    }
    const hashedPassword = await bcryptjs.hash("password123", 10);

    const mockUsers = [
      {
        _id: "usr_gloria_01",
        firstname: "Gloria",
        lastname: "Amos",
        email: "gloria@example.com",
        passwordHash: hashedPassword,
        createdAt: new Date()
      },
      {
        _id: "usr_tester_02",
        firstname: "Collaborator",
        lastname: "Tester",
        email: "test@example.com",
        passwordHash: hashedPassword,
        createdAt: new Date()
      }
    ];

    const mockRooms = [
      {
        _id: "room_brainstorm_2026",
        name: "Project Brainstorming Arena",
        ownerId: "usr_gloria_01",
        allowedUsers: ["usr_gloria_01", "usr_tester_02"],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const mockElements = [
{
        _id: "el_line_001", 
        roomId: "room_brainstorm_2026", 
        id: "line-123",
        type: "pencil",
        points: [[10, 20], [12, 25], [15, 30]],
        color: "#ff0000",
        strokeWidth: 5,
        createdBy: "usr_gloria_01"
      }
    ];

    const userResult = await db.collection("users").insertMany(mockUsers);
    console.log(`Successfully seeded ${userResult.insertedCount} users.`);

    const roomResult = await db.collection("rooms").insertMany(mockRooms);
    console.log(`Successfully seeded ${roomResult.insertedCount} rooms.`);

    const elementsResult = await db.collection("elements").insertMany(mockElements);
    console.log(`Successfully seeded ${elementsResult.insertedCount} elements.`);

    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db.collection("rooms").createIndex({ ownerId: 1 });
    await db.collection("elements").createIndex({ roomId: 1 });
    console.log("High-performance query indexes created successfully!");

  } catch (error) {
    console.error("Seeding engine caught an error:", error);
  } finally {
    await client.close();
    console.log("Database connection cleanly closed. Seeding process complete.");
  }
}

runSeed();