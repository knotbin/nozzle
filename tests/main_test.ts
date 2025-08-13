import { assertEquals, assertExists, assertRejects } from "jsr:@std/assert";
import { z } from "zod";
import {
  connect,
  defineModel,
  disconnect,
  type InferModel,
  type InsertType,
  Model,
} from "../mod.ts";
import { ObjectId } from "mongodb";

const userSchema = defineModel(z.object({
  name: z.string(),
  email: z.email(),
  age: z.number().int().positive().optional(),
  createdAt: z.date().default(() => new Date()),
}));

type User = InferModel<typeof userSchema>;
type UserInsert = InsertType<typeof userSchema>;

let UserModel: Model<typeof userSchema>;
let isSetup = false;

async function setup() {
  if (!isSetup) {
    await connect("mongodb://localhost:27017", "mizzleorm_test_db");
    UserModel = new Model("users", userSchema);
    isSetup = true;
  }
  // Clean up before each test
  await UserModel.delete({});
}

async function teardown() {
  if (isSetup) {
    await disconnect();
    isSetup = false;
  }
}

Deno.test({
  name: "Insert - should insert a new user successfully",
  async fn() {
    await setup();

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
  name: "Find - should find the inserted user",
  async fn() {
    await setup();

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
  name: "Update - should update user data",
  async fn() {
    await setup();

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
  name: "Delete - should delete user successfully",
  async fn() {
    await setup();

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
  name: "Schema Validation - should validate user data",
  async fn() {
    await setup();

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
  name: "Find Multiple - should find multiple users",
  async fn() {
    await setup();

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

Deno.test({
  name: "Default Values - should handle default createdAt",
  async fn() {
    await setup();

    const newUser: UserInsert = {
      name: "Default Test User",
      email: "default@example.com",
      // No createdAt provided - should use default
    };

    const insertResult = await UserModel.insertOne(newUser);
    assertExists(insertResult.insertedId);

    const foundUser = await UserModel.findOne({
      _id: new ObjectId(insertResult.insertedId),
    });

    assertExists(foundUser);
    assertExists(foundUser.createdAt);
    assertEquals(foundUser.createdAt instanceof Date, true);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Teardown - Clean up and disconnect",
  async fn() {
    await teardown();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
