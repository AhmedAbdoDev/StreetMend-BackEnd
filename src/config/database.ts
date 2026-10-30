import mongoose from "mongoose";
import env from "./env.js";

export async function connectDatabase(): Promise<typeof mongoose> {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI);
    console.log(
      `MongoDB connected: ${conn.connection.host}/${conn.connection.name}`,
    );

    if (process.env.NODE_ENV !== "test") {
      try {
        const sessionCollection = conn.connection.collection("sessions");
        const existingIndexes = await sessionCollection
          .indexes()
          .catch(() => []);
        if (
          existingIndexes.some((idx: any) => idx.name === "refresh_token_1")
        ) {
          await sessionCollection.dropIndex("refresh_token_1");
        }
      } catch {
        // Silently continue if collection or index does not exist
      }

      await mongoose.syncIndexes().catch((err: any) => {
        console.warn("Index synchronization warning:", err.message);
      });
    }

    return conn;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  console.log("MongoDB disconnected");
}
