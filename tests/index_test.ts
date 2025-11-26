import { assert, assertEquals, assertExists, assertFalse } from "@std/assert";
import type { IndexDescription } from "mongodb";
import {
  cleanupCollection,
  createUserModel,
  setupTestDb,
  teardownTestDb,
} from "./utils.ts";
import type { Model } from "../mod.ts";

let UserModel: Model<typeof import("./utils.ts").userSchema>;

Deno.test.beforeAll(async () => {
  await setupTestDb();
  UserModel = createUserModel();
});

Deno.test.beforeEach(async () => {
  await cleanupCollection(UserModel);
  // Drop all indexes except _id
  try {
    await UserModel.dropIndexes();
  } catch {
    // Ignore if no indexes exist
  }
});

Deno.test.afterAll(async () => {
  await teardownTestDb();
});

Deno.test({
  name: "Index: Create - should create a simple index",
  async fn() {
    const indexName = await UserModel.createIndex({ email: 1 });
    assertExists(indexName);
    assertEquals(typeof indexName, "string");

    const indexExists = await UserModel.indexExists(indexName);
    assert(indexExists);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Index: Create Unique - should create a unique index",
  async fn() {
    const indexName = await UserModel.createIndex(
      { email: 1 },
      { unique: true, name: "email_unique_test" },
    );
    assertExists(indexName);
    assertEquals(indexName, "email_unique_test");

    const index = await UserModel.getIndex(indexName);
    assertExists(index);
    assert(index.unique);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Index: Create Compound - should create a compound index",
  async fn() {
    const indexName = await UserModel.createIndex({ name: 1, age: -1 });
    assertExists(indexName);

    const index = await UserModel.getIndex(indexName);
    assertExists(index);
    assertEquals(Object.keys(index.key || {}).length, 2);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Index: List - should list all indexes",
  async fn() {
    // Create a few indexes
    await UserModel.createIndex({ email: 1 });
    await UserModel.createIndex({ name: 1, age: -1 });

    const indexes = await UserModel.listIndexes();
    // Should have at least _id index + the 2 we created
    assert(indexes.length >= 3);

    const indexNames = indexes.map((idx) => idx.name);
    assert(indexNames.includes("_id_"));
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Index: Drop - should drop an index",
  async fn() {
    const indexName = await UserModel.createIndex({ email: 1 });
    assertExists(indexName);

    let indexExists = await UserModel.indexExists(indexName);
    assert(indexExists);

    await UserModel.dropIndex(indexName);

    indexExists = await UserModel.indexExists(indexName);
    assertFalse(indexExists);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Index: Create Multiple - should create multiple indexes",
  async fn() {
    const indexNames = await UserModel.createIndexes([
      { key: { email: 1 }, name: "email_multiple_test" },
      { key: { name: 1, age: -1 }, name: "name_age_multiple_test" },
    ]);

    assertEquals(indexNames.length, 2);
    assertEquals(indexNames.includes("email_multiple_test"), true);
    assertEquals(indexNames.includes("name_age_multiple_test"), true);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Index: Sync - should create missing indexes",
  async fn() {
    const indexesToSync: IndexDescription[] = [
      { key: { email: 1 }, name: "email_idx" },
      { key: { name: 1 }, name: "name_idx" },
    ];

    const created = await UserModel.syncIndexes(indexesToSync);
    assertEquals(created.length, 2);

    // Running again should not create duplicates
    const createdAgain = await UserModel.syncIndexes(indexesToSync);
    assertEquals(createdAgain.length, 0);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Index: Get - should get index by name",
  async fn() {
    await UserModel.createIndex(
      { email: 1 },
      { unique: true, name: "email_unique_idx" },
    );

    const index = await UserModel.getIndex("email_unique_idx");
    assertExists(index);
    assertEquals(index.name, "email_unique_idx");
    assert(index.unique);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

