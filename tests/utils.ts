import { z } from "@zod/zod";
import { connect, disconnect, type Input, Model } from "../mod.ts";
import { MongoMemoryServer } from "mongodb-memory-server-core";

export const userSchema = z.object({
  name: z.string(),
  email: z.email(),
  age: z.number().int().positive().optional(),
  createdAt: z.date().default(() => new Date()),
});

export type UserInsert = Input<typeof userSchema>;

let mongoServer: MongoMemoryServer | null = null;
let isSetup = false;
let setupRefCount = 0;
let activeDbName: string | null = null;

export async function setupTestDb(dbName = "test_db") {
  setupRefCount++;

  // If we're already connected, just share the same database
  if (isSetup) {
    if (activeDbName !== dbName) {
      throw new Error(
        `Test DB already initialized for ${activeDbName}, requested ${dbName}`,
      );
    }
    return;
  }

  try {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    await connect(uri, dbName);
    activeDbName = dbName;
    isSetup = true;
  } catch (error) {
    // Roll back refcount if setup failed so future attempts can retry
    setupRefCount = Math.max(0, setupRefCount - 1);
    throw error;
  }
}

export async function teardownTestDb() {
  if (setupRefCount === 0) {
    return;
  }

  setupRefCount = Math.max(0, setupRefCount - 1);

  if (isSetup && setupRefCount === 0) {
    await disconnect();
    if (mongoServer) {
      await mongoServer.stop();
      mongoServer = null;
    }
    activeDbName = null;
    isSetup = false;
  }
}

export function createUserModel(
  collectionName = "users",
): Model<typeof userSchema> {
  return new Model(collectionName, userSchema);
}

export async function cleanupCollection(model: Model<typeof userSchema>) {
  await model.delete({});
}
