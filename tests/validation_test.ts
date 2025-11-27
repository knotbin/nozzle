import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { ObjectId } from "mongodb";
import {
  cleanupCollection,
  createUserModel,
  setupTestDb,
  teardownTestDb,
  type UserInsert,
  type userSchema,
} from "./utils.ts";
import type { Model } from "../mod.ts";

let UserModel: Model<typeof userSchema>;

Deno.test.beforeAll(async () => {
  await setupTestDb();
  UserModel = createUserModel();
});

Deno.test.beforeEach(async () => {
  await cleanupCollection(UserModel);
});

Deno.test.afterAll(async () => {
  await teardownTestDb();
});

Deno.test({
  name: "Validation: Schema - should validate user data on insert",
  async fn() {

    const invalidUser = {
      name: "Invalid User",
      email: "not-an-email", // Invalid email
      age: -5, // Negative age
    };

    // This should throw an error due to schema validation
    await assertRejects(
      async () => {
        await UserModel.insertOne(invalidUser as UserInsert);
      },
      Error,
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Validation: Update - should reject invalid email in update",
  async fn() {

    // Insert a user for this test
    const newUser: UserInsert = {
      name: "Validation Test User",
      email: "valid@example.com",
      age: 25,
    };
    const insertResult = await UserModel.insertOne(newUser);
    assertExists(insertResult.insertedId);

    // Try to update with invalid email - should throw error
    await assertRejects(
      async () => {
        await UserModel.update(
          { _id: new ObjectId(insertResult.insertedId) },
          { email: "not-an-email" },
        );
      },
      Error,
      "Validation failed on update",
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Validation: Update - should reject negative age in update",
  async fn() {

    // Insert a user for this test
    const newUser: UserInsert = {
      name: "Age Validation Test User",
      email: "age@example.com",
      age: 25,
    };
    const insertResult = await UserModel.insertOne(newUser);
    assertExists(insertResult.insertedId);

    // Try to update with negative age - should throw error
    await assertRejects(
      async () => {
        await UserModel.updateOne(
          { _id: new ObjectId(insertResult.insertedId) },
          { age: -5 },
        );
      },
      Error,
      "Validation failed on update",
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Validation: Update - should reject invalid name type in update",
  async fn() {

    // Insert a user for this test
    const newUser: UserInsert = {
      name: "Type Validation Test User",
      email: "type@example.com",
      age: 25,
    };
    const insertResult = await UserModel.insertOne(newUser);
    assertExists(insertResult.insertedId);

    // Try to update with invalid name type (number instead of string) - should throw error
    await assertRejects(
      async () => {
        await UserModel.updateOne(
          { _id: new ObjectId(insertResult.insertedId) },
          { name: 123 as unknown as string },
        );
      },
      Error,
      "Validation failed on update",
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Validation: Update - should accept valid partial updates",
  async fn() {

    // Insert a user for this test
    const newUser: UserInsert = {
      name: "Valid Update Test User",
      email: "validupdate@example.com",
      age: 25,
    };
    const insertResult = await UserModel.insertOne(newUser);
    assertExists(insertResult.insertedId);

    // Update with valid data - should succeed
    const updateResult = await UserModel.updateOne(
      { _id: new ObjectId(insertResult.insertedId) },
      { age: 30, email: "newemail@example.com" },
    );

    assertEquals(updateResult.modifiedCount, 1);

    // Verify the update
    const updatedUser = await UserModel.findOne({
      _id: new ObjectId(insertResult.insertedId),
    });

    assertExists(updatedUser);
    assertEquals(updatedUser.age, 30);
    assertEquals(updatedUser.email, "newemail@example.com");
    assertEquals(updatedUser.name, "Valid Update Test User"); // Should remain unchanged
  },
  sanitizeResources: false,
  sanitizeOps: false,
});


