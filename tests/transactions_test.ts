import { assertEquals, assertExists, assertRejects } from "@std/assert";
import {
  connect,
  disconnect,
  Model,
  withTransaction,
  startSession,
  endSession,
} from "../mod.ts";
import { z } from "@zod/zod";
import { MongoMemoryReplSet } from "mongodb-memory-server-core";

let replSet: MongoMemoryReplSet | null = null;

async function setupTestReplSet() {
  if (!replSet) {
    replSet = await MongoMemoryReplSet.create({
      replSet: { 
        count: 3,
        storageEngine: 'wiredTiger' // Required for transactions
      },
    });
  }
  return replSet.getUri();
}

Deno.test.afterEach(async () => {
  // Clean up database
  if (replSet) {
    try {
      const { getDb } = await import("../client.ts");
      const db = getDb();
      await db.dropDatabase();
    } catch {
      // Ignore if not connected
    }
  }
  await disconnect();
});

Deno.test.afterAll(async () => {
  if (replSet) {
    await replSet.stop();
    replSet = null;
  }
});

// Test schemas
const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  balance: z.number().nonnegative().default(0),
});

const orderSchema = z.object({
  userId: z.string(),
  amount: z.number().positive(),
  status: z.enum(["pending", "completed", "failed"]).default("pending"),
});

Deno.test({
  name: "Transactions: withTransaction - should commit successful operations",
  async fn() {
    const uri = await setupTestReplSet();
    await connect(uri, "test_db");
    
    const UserModel = new Model("users", userSchema);
    const OrderModel = new Model("orders", orderSchema);
    
    const result = await withTransaction(async (session) => {
      const user = await UserModel.insertOne(
        { name: "Alice", email: "alice@example.com", balance: 100 },
        { session }
      );
      
      const order = await OrderModel.insertOne(
        { userId: user.insertedId.toString(), amount: 50 },
        { session }
      );
      
      return { userId: user.insertedId, orderId: order.insertedId };
    });
    
    assertExists(result.userId);
    assertExists(result.orderId);
    
    // Verify data was committed
    const users = await UserModel.find({});
    const orders = await OrderModel.find({});
    assertEquals(users.length, 1);
    assertEquals(orders.length, 1);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Transactions: withTransaction - should abort on error",
  async fn() {
    const uri = await setupTestReplSet();
    await connect(uri, "test_db");
    
    const UserModel = new Model("users", userSchema);
    
    await assertRejects(
      async () => {
        await withTransaction(async (session) => {
          await UserModel.insertOne(
            { name: "Bob", email: "bob@example.com" },
            { session }
          );
          
          // This will fail and abort the transaction
          throw new Error("Simulated error");
        });
      },
      Error,
      "Simulated error"
    );
    
    // Verify no data was committed
    const users = await UserModel.find({});
    assertEquals(users.length, 0);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Transactions: withTransaction - should handle multiple operations",
  async fn() {
    const uri = await setupTestReplSet();
    await connect(uri, "test_db");
    
    const UserModel = new Model("users", userSchema);
    
    const result = await withTransaction(async (session) => {
      const users = [];
      
      for (let i = 0; i < 5; i++) {
        const user = await UserModel.insertOne(
          { name: `User${i}`, email: `user${i}@example.com` },
          { session }
        );
        users.push(user.insertedId);
      }
      
      return users;
    });
    
    assertEquals(result.length, 5);
    
    // Verify all users were created
    const users = await UserModel.find({});
    assertEquals(users.length, 5);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Transactions: withTransaction - should support read and write operations",
  async fn() {
    const uri = await setupTestReplSet();
    await connect(uri, "test_db");
    
    const UserModel = new Model("users", userSchema);
    
    // Insert initial user
    const initialUser = await UserModel.insertOne({
      name: "Charlie",
      email: "charlie@example.com",
      balance: 100,
    });
    
    const result = await withTransaction(async (session) => {
      // Read
      const user = await UserModel.findById(initialUser.insertedId, { session });
      assertExists(user);
      
      // Update
      await UserModel.updateOne(
        { _id: initialUser.insertedId },
        { balance: 150 },
        { session }
      );
      
      // Read again
      const updatedUser = await UserModel.findById(initialUser.insertedId, { session });
      
      return updatedUser?.balance;
    });
    
    assertEquals(result, 150);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Transactions: withTransaction - should handle validation errors",
  async fn() {
    const uri = await setupTestReplSet();
    await connect(uri, "test_db");
    
    const UserModel = new Model("users", userSchema);
    
    await assertRejects(
      async () => {
        await withTransaction(async (session) => {
          // Valid insert
          await UserModel.insertOne(
            { name: "Valid", email: "valid@example.com" },
            { session }
          );
          
          // Invalid insert (will throw ValidationError)
          await UserModel.insertOne(
            { name: "", email: "invalid" },
            { session }
          );
        });
      },
      Error // ValidationError
    );
    
    // Transaction should have been aborted, no data should exist
    const users = await UserModel.find({});
    assertEquals(users.length, 0);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Transactions: Manual session - should work with manual session management",
  async fn() {
    const uri = await setupTestReplSet();
    await connect(uri, "test_db");
    
    const UserModel = new Model("users", userSchema);
    
    const session = startSession();
    
    try {
      await session.withTransaction(async () => {
        await UserModel.insertOne(
          { name: "Dave", email: "dave@example.com" },
          { session }
        );
        await UserModel.insertOne(
          { name: "Eve", email: "eve@example.com" },
          { session }
        );
      });
    } finally {
      await endSession(session);
    }
    
    // Verify both users were created
    const users = await UserModel.find({});
    assertEquals(users.length, 2);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Transactions: withTransaction - should support delete operations",
  async fn() {
    const uri = await setupTestReplSet();
    await connect(uri, "test_db");
    
    const UserModel = new Model("users", userSchema);
    
    // Insert initial users
    await UserModel.insertMany([
      { name: "User1", email: "user1@example.com" },
      { name: "User2", email: "user2@example.com" },
      { name: "User3", email: "user3@example.com" },
    ]);
    
    await withTransaction(async (session) => {
      // Delete one user
      await UserModel.deleteOne({ name: "User1" }, { session });
      
      // Delete multiple users
      await UserModel.delete({ name: { $in: ["User2", "User3"] } }, { session });
    });
    
    // Verify all were deleted
    const users = await UserModel.find({});
    assertEquals(users.length, 0);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Transactions: withTransaction - should handle transaction options",
  async fn() {
    const uri = await setupTestReplSet();
    await connect(uri, "test_db");
    
    const UserModel = new Model("users", userSchema);
    
    const result = await withTransaction(
      async (session) => {
        await UserModel.insertOne(
          { name: "Frank", email: "frank@example.com" },
          { session }
        );
        return "success";
      },
      {
        readPreference: "primary",
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
      }
    );
    
    assertEquals(result, "success");
    
    const users = await UserModel.find({});
    assertEquals(users.length, 1);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
