import { assert, assertEquals, assertExists, assertRejects } from "@std/assert";
import {
  connect,
  disconnect,
  Model,
  ValidationError,
  ConnectionError,
} from "../mod.ts";
import { z } from "@zod/zod";
import { MongoMemoryServer } from "mongodb-memory-server-core";

let mongoServer: MongoMemoryServer | null = null;

async function setupTestServer() {
  if (!mongoServer) {
    mongoServer = await MongoMemoryServer.create();
  }
  return mongoServer.getUri();
}

Deno.test.afterEach(async () => {
  await disconnect();
});

Deno.test.afterAll(async () => {
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
});

// Test schemas
const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
});

Deno.test({
  name: "Errors: ValidationError - should throw on invalid insert",
  async fn() {
    const uri = await setupTestServer();
    await connect(uri, "test_db");
    
    const UserModel = new Model("users", userSchema);
    
    await assertRejects(
      async () => {
        await UserModel.insertOne({ name: "", email: "invalid" });
      },
      ValidationError,
      "Validation failed on insert"
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Errors: ValidationError - should have structured issues",
  async fn() {
    const uri = await setupTestServer();
    await connect(uri, "test_db");
    
    const UserModel = new Model("users", userSchema);
    
    try {
      await UserModel.insertOne({ name: "", email: "invalid" });
      throw new Error("Should have thrown ValidationError");
    } catch (error) {
      assert(error instanceof ValidationError);
      assertEquals(error.operation, "insert");
      assertExists(error.issues);
      assert(error.issues.length > 0);
      
      // Check field errors
      const fieldErrors = error.getFieldErrors();
      assertExists(fieldErrors.name);
      assertExists(fieldErrors.email);
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Errors: ValidationError - should throw on invalid update",
  async fn() {
    const uri = await setupTestServer();
    await connect(uri, "test_db");
    
    const UserModel = new Model("users", userSchema);
    
    await assertRejects(
      async () => {
        await UserModel.updateOne({ name: "test" }, { email: "invalid-email" });
      },
      ValidationError,
      "Validation failed on update"
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Errors: ValidationError - should throw on invalid replace",
  async fn() {
    const uri = await setupTestServer();
    await connect(uri, "test_db");
    
    const UserModel = new Model("users", userSchema);
    
    // First insert a valid document
    await UserModel.insertOne({ name: "Test", email: "test@example.com" });
    
    await assertRejects(
      async () => {
        await UserModel.replaceOne({ name: "Test" }, { name: "", email: "invalid" });
      },
      ValidationError,
      "Validation failed on replace"
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Errors: ValidationError - update operation should be in error",
  async fn() {
    const uri = await setupTestServer();
    await connect(uri, "test_db");
    
    const UserModel = new Model("users", userSchema);
    
    try {
      await UserModel.updateOne({ name: "test" }, { age: -5 });
      throw new Error("Should have thrown ValidationError");
    } catch (error) {
      assert(error instanceof ValidationError);
      assertEquals(error.operation, "update");
      
      const fieldErrors = error.getFieldErrors();
      assertExists(fieldErrors.age);
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Errors: ConnectionError - should throw on connection failure",
  async fn() {
    await assertRejects(
      async () => {
        await connect("mongodb://invalid-host-that-does-not-exist:27017", "test_db", {
          serverSelectionTimeoutMS: 1000, // 1 second timeout
          connectTimeoutMS: 1000,
        });
      },
      ConnectionError,
      "Failed to connect to MongoDB"
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Errors: ConnectionError - should include URI in error",
  async fn() {
    try {
      await connect("mongodb://invalid-host-that-does-not-exist:27017", "test_db", {
        serverSelectionTimeoutMS: 1000, // 1 second timeout
        connectTimeoutMS: 1000,
      });
      throw new Error("Should have thrown ConnectionError");
    } catch (error) {
      assert(error instanceof ConnectionError);
      assertEquals(error.uri, "mongodb://invalid-host-that-does-not-exist:27017");
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Errors: ConnectionError - should throw when getDb called without connection",
  async fn() {
    // Make sure not connected
    await disconnect();
    
    const { getDb } = await import("../client/connection.ts");
    
    try {
      getDb();
      throw new Error("Should have thrown ConnectionError");
    } catch (error) {
      assert(error instanceof ConnectionError);
      assert(error.message.includes("not connected"));
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Errors: ValidationError - field errors should be grouped correctly",
  async fn() {
    const uri = await setupTestServer();
    await connect(uri, "test_db");
    
    const UserModel = new Model("users", userSchema);
    
    try {
      await UserModel.insertOne({
        name: "",
        email: "not-an-email",
        age: -10,
      });
      throw new Error("Should have thrown ValidationError");
    } catch (error) {
      assert(error instanceof ValidationError);
      
      const fieldErrors = error.getFieldErrors();
      
      // Each field should have its own errors
      assert(Array.isArray(fieldErrors.name));
      assert(Array.isArray(fieldErrors.email));
      assert(Array.isArray(fieldErrors.age));
      
      // Verify error messages are present
      assert(fieldErrors.name.length > 0);
      assert(fieldErrors.email.length > 0);
      assert(fieldErrors.age.length > 0);
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Errors: Error name should be set correctly",
  async fn() {
    const uri = await setupTestServer();
    await connect(uri, "test_db");
    
    const UserModel = new Model("users", userSchema);
    
    try {
      await UserModel.insertOne({ name: "", email: "invalid" });
    } catch (error) {
      assert(error instanceof ValidationError);
      assertEquals(error.name, "ValidationError");
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
