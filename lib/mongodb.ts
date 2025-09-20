import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable in .env.local");
}

interface MongooseGlobal {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseGlobal: MongooseGlobal | undefined;
}

let cached = global._mongooseGlobal;
if (!cached) {
  cached = global._mongooseGlobal = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached!.conn) return cached!.conn;

  if (!cached!.promise) {
    cached!.promise = mongoose.connect(MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME || "studymate",
    });
  }

  cached!.conn = await cached!.promise;
  return cached!.conn;
}
