import { assertEquals, assertExists } from "@std/assert";
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
  name: "CRUD: Insert - should insert a new user successfully",
  async fn() {

    const newUser: UserInsert = {
      name: "Test User",
      email: "test@example.com",
      age: 25,
    };

    const insertResult = await UserModel.insertOne(newUser);

    assertExists(insertResult.insertedId);
    console.log("User inserted with ID:", insertResult.insertedId);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "CRUD: Find - should find the inserted user",
  async fn() {

    // First insert a user for this test
    const newUser: UserInsert = {
      name: "Find Test User",
      email: "findtest@example.com",
      age: 30,
    };
    const insertResult = await UserModel.insertOne(newUser);
    assertExists(insertResult.insertedId);

    const foundUser = await UserModel.findOne({
      _id: new ObjectId(insertResult.insertedId),
    });

    assertExists(foundUser);
    assertEquals(foundUser.email, "findtest@example.com");
    assertEquals(foundUser.name, "Find Test User");
    assertEquals(foundUser.age, 30);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "CRUD: Update - should update user data",
  async fn() {

    // Insert a user for this test
    const newUser: UserInsert = {
      name: "Update Test User",
      email: "updatetest@example.com",
      age: 25,
    };
    const insertResult = await UserModel.insertOne(newUser);
    assertExists(insertResult.insertedId);

    // Update the user
    const updateResult = await UserModel.update(
      { _id: new ObjectId(insertResult.insertedId) },
      { age: 26 },
    );

    assertEquals(updateResult.modifiedCount, 1);

    // Verify the update
    const updatedUser = await UserModel.findOne({
      _id: new ObjectId(insertResult.insertedId),
    });

    assertExists(updatedUser);
    assertEquals(updatedUser.age, 26);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "CRUD: Delete - should delete user successfully",
  async fn() {

    // Insert a user for this test
    const newUser: UserInsert = {
      name: "Delete Test User",
      email: "deletetest@example.com",
      age: 35,
    };
    const insertResult = await UserModel.insertOne(newUser);
    assertExists(insertResult.insertedId);

    // Delete the user
    const deleteResult = await UserModel.delete({
      _id: new ObjectId(insertResult.insertedId),
    });

    assertEquals(deleteResult.deletedCount, 1);

    // Verify deletion
    const deletedUser = await UserModel.findOne({
      _id: new ObjectId(insertResult.insertedId),
    });

    assertEquals(deletedUser, null);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "CRUD: Find Multiple - should find multiple users",
  async fn() {

    // Insert multiple users
    const users: UserInsert[] = [
      { name: "User 1", email: "user1@example.com", age: 20 },
      { name: "User 2", email: "user2@example.com", age: 25 },
      { name: "User 3", email: "user3@example.com", age: 30 },
    ];

    for (const user of users) {
      await UserModel.insertOne(user);
    }

    // Find all users with age >= 25
    const foundUsers = await UserModel.find({ age: { $gte: 25 } });

    assertEquals(foundUsers.length >= 2, true);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});


