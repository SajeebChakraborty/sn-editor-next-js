/**
 * @fileoverview MongoDB Atlas connection helper for SN Editor services.
 * Call once at process start; models assume a connected mongoose instance.
 */

import mongoose from 'mongoose';

let connected = false;

/**
 * Connect to MongoDB using the provided Atlas (or local) URI.
 * @param uri - MongoDB connection string (e.g. from `MONGODB_URI`)
 * @returns The mongoose connection instance
 */
export async function connectMongo(uri: string): Promise<typeof mongoose> {
  if (connected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // STUB: phase-1 — retries/pooling tuned for Atlas later
  await mongoose.connect(uri);
  connected = true;
  return mongoose;
}

/**
 * Disconnect mongoose (tests / graceful shutdown).
 */
export async function disconnectMongo(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  connected = false;
}
