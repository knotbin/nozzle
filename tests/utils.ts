import { z } from "@zod/zod";
import { connect, disconnect, type InsertType, Model } from "../mod.ts";
import { MongoMemoryServer } from "mongodb-memory-server-core";

export const userSchema = z.object({
  name: z.string(),
  email: z.email(),
  age: z.number().int().positive().optional(),
  createdAt: z.date().default(() => new Date()),
});

export type UserInsert = InsertType<typeof userSchema>;

let mongoServer: MongoMemoryServer | null = null;
let isSetup = false;

export async function setupTestDb() {
  if (!isSetup) {
    // Start MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    // Connect to the in-memory database
    await connect(uri, "test_db");
    isSetup = true;
  }
}

export async function teardownTestDb() {
  if (isSetup) {
    await disconnect();
    if (mongoServer) {
      await mongoServer.stop();
      mongoServer = null;
    }
    isSetup = false;
  }
}

export function createUserModel(): Model<typeof userSchema> {
  return new Model("users", userSchema);
}

export async function cleanupCollection(model: Model<typeof userSchema>) {
  await model.delete({});
}

