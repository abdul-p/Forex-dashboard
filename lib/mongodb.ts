import mongoose from "mongoose";

const MongoDB_Url = process.env.MONGODB_URL as string;

if (!MongoDB_Url) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache;
}

let cached: MongooseCache = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MongoDB_Url).then((mongoose) => {
      return mongoose;
    });

    cached.conn = await cached.promise;
    return cached.conn;
  }
}

export default connectDB;
