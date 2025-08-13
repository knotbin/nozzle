import { afterEach, beforeEach, describe, it } from "jsr:@std/testing/bdd";
import { assertEquals, assertExists, assertRejects } from "jsr:@std/assert";
import { z } from "zod";

// Mock implementation for demonstration
class MockModel<T> {
  private data: Array<T & { _id: number }> = [];
  private idCounter = 1;

  constructor(private collection: string, private schema: z.ZodSchema<T>) {}

  insertOne(doc: z.input<z.ZodSchema<T>>) {
    // Validate with schema
    const validated = this.schema.parse(doc);
    const withId = { ...validated, _id: this.idCounter++ };
    this.data.push(withId);
    return { insertedId: withId._id };
  }

  findOne(filter: Partial<T & { _id: number }>) {
    if (filter._id) {
      return this.data.find((item) => item._id === filter._id) || null;
    }
    return this.data.find((item) =>
      Object.entries(filter).every(([key, value]) =>
        (item as Record<string, unknown>)[key] === value
      )
    ) || null;
  }

  find(filter: Record<string, unknown> = {}) {
    return this.data.filter((item) => {
      return Object.entries(filter).every(([key, value]) => {
        if (typeof value === "object" && value !== null && "$gte" in value) {
          const itemValue = (item as Record<string, unknown>)[key];
          const gteValue = (value as { $gte: unknown }).$gte;
          return typeof itemValue === "number" &&
            typeof gteValue === "number" && itemValue >= gteValue;
        }
        return (item as Record<string, unknown>)[key] === value;
      });
    });
  }

  update(filter: Partial<T & { _id: number }>, update: Partial<T>) {
    let modifiedCount = 0;
    this.data = this.data.map((item) => {
      if (filter._id && (item as T & { _id: number })._id === filter._id) {
        modifiedCount++;
        return { ...item, ...update };
      }
      return item;
    });
    return { modifiedCount };
  }

  delete(filter: Partial<T & { _id: number }>) {
    const initialLength = this.data.length;
    if (Object.keys(filter).length === 0) {
      // Delete all
      this.data = [];
      return { deletedCount: initialLength };
    }

    this.data = this.data.filter((item) => {
      if (filter._id) {
        return (item as T & { _id: number })._id !== filter._id;
      }
      return !Object.entries(filter).every(([key, value]) =>
        (item as Record<string, unknown>)[key] === value
      );
    });

    return { deletedCount: initialLength - this.data.length };
  }

  // Helper method to clear data
  clear() {
    this.data = [];
    this.idCounter = 1;
  }
}

// Schema definition
const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
  createdAt: z.date().default(() => new Date()),
});

type User = z.infer<typeof userSchema>;
type UserInsert = z.input<typeof userSchema>;

let UserModel: MockModel<User>;

describe("Mock User Model Tests", () => {
  beforeEach(() => {
    UserModel = new MockModel("users", userSchema);
  });

  afterEach(() => {
    UserModel?.clear();
  });

  describe("Insert Operations", () => {
    it("should insert a new user successfully", async () => {
      const newUser: UserInsert = {
        name: "Test User",
        email: "test@example.com",
        age: 25,
      };

      const insertResult = await UserModel.insertOne(newUser);

      assertExists(insertResult.insertedId);
      assertEquals(typeof insertResult.insertedId, "number");
    });

    it("should handle user without optional age", async () => {
      const newUser: UserInsert = {
        name: "User Without Age",
        email: "noage@example.com",
      };

      const insertResult = await UserModel.insertOne(newUser);
      assertExists(insertResult.insertedId);

      const foundUser = await UserModel.findOne({
        _id: insertResult.insertedId,
      });
      assertEquals(foundUser?.name, "User Without Age");
      assertEquals(foundUser?.age, undefined);
    });

    it("should apply default createdAt value", async () => {
      const newUser: UserInsert = {
        name: "Default Test User",
        email: "default@example.com",
      };

      const insertResult = await UserModel.insertOne(newUser);
      const foundUser = await UserModel.findOne({
        _id: insertResult.insertedId,
      });

      assertExists(foundUser);
      assertExists(foundUser.createdAt);
      assertEquals(foundUser.createdAt instanceof Date, true);
    });
  });

  describe("Find Operations", () => {
    it("should find user by ID", async () => {
      const newUser: UserInsert = {
        name: "Find Test User",
        email: "findtest@example.com",
        age: 30,
      };
      const insertResult = await UserModel.insertOne(newUser);

      const foundUser = await UserModel.findOne({
        _id: insertResult.insertedId,
      });

      assertExists(foundUser);
      assertEquals(foundUser.email, "findtest@example.com");
      assertEquals(foundUser.name, "Find Test User");
      assertEquals(foundUser.age, 30);
    });

    it("should find user by email", async () => {
      await UserModel.insertOne({
        name: "Email Test User",
        email: "email@test.com",
        age: 28,
      });

      const foundUser = await UserModel.findOne({
        email: "email@test.com",
      });

      assertExists(foundUser);
      assertEquals(foundUser.name, "Email Test User");
    });

    it("should return null for non-existent user", async () => {
      const foundUser = await UserModel.findOne({
        _id: 999,
      });

      assertEquals(foundUser, null);
    });

    it("should find multiple users with filters", async () => {
      const users: UserInsert[] = [
        { name: "User 1", email: "user1@example.com", age: 20 },
        { name: "User 2", email: "user2@example.com", age: 25 },
        { name: "User 3", email: "user3@example.com", age: 30 },
      ];

      for (const user of users) {
        await UserModel.insertOne(user);
      }

      const foundUsers = await UserModel.find({ age: { $gte: 25 } });

      assertEquals(foundUsers.length, 2);
      assertEquals(
        foundUsers.every((user) => user.age !== undefined && user.age >= 25),
        true,
      );
    });

    it("should find all users with empty filter", async () => {
      await UserModel.insertOne({
        name: "User A",
        email: "a@test.com",
        age: 20,
      });
      await UserModel.insertOne({
        name: "User B",
        email: "b@test.com",
        age: 25,
      });

      const allUsers = await UserModel.find();

      assertEquals(allUsers.length, 2);
    });
  });

  describe("Update Operations", () => {
    it("should update user data", async () => {
      const newUser: UserInsert = {
        name: "Update Test User",
        email: "updatetest@example.com",
        age: 25,
      };
      const insertResult = await UserModel.insertOne(newUser);

      const updateResult = await UserModel.update(
        { _id: insertResult.insertedId },
        { age: 26 },
      );

      assertEquals(updateResult.modifiedCount, 1);

      const updatedUser = await UserModel.findOne({
        _id: insertResult.insertedId,
      });
      assertEquals(updatedUser?.age, 26);
    });

    it("should update multiple fields", async () => {
      const newUser: UserInsert = {
        name: "Multi Update User",
        email: "multi@example.com",
        age: 30,
      };
      const insertResult = await UserModel.insertOne(newUser);

      await UserModel.update(
        { _id: insertResult.insertedId },
        { name: "Updated Name", age: 35 },
      );

      const updatedUser = await UserModel.findOne({
        _id: insertResult.insertedId,
      });
      assertEquals(updatedUser?.name, "Updated Name");
      assertEquals(updatedUser?.age, 35);
    });

    it("should return 0 modified count for non-existent user", async () => {
      const updateResult = await UserModel.update(
        { _id: 999 },
        { age: 100 },
      );

      assertEquals(updateResult.modifiedCount, 0);
    });
  });

  describe("Delete Operations", () => {
    it("should delete user successfully", async () => {
      const newUser: UserInsert = {
        name: "Delete Test User",
        email: "deletetest@example.com",
        age: 35,
      };
      const insertResult = await UserModel.insertOne(newUser);

      const deleteResult = await UserModel.delete({
        _id: insertResult.insertedId,
      });

      assertEquals(deleteResult.deletedCount, 1);

      const deletedUser = await UserModel.findOne({
        _id: insertResult.insertedId,
      });
      assertEquals(deletedUser, null);
    });

    it("should delete all users with empty filter", async () => {
      await UserModel.insertOne({
        name: "User 1",
        email: "user1@test.com",
      });
      await UserModel.insertOne({
        name: "User 2",
        email: "user2@test.com",
      });

      const deleteResult = await UserModel.delete({});

      assertEquals(deleteResult.deletedCount, 2);

      const remainingUsers = await UserModel.find();
      assertEquals(remainingUsers.length, 0);
    });

    it("should return 0 deleted count for non-existent user", async () => {
      const deleteResult = await UserModel.delete({
        _id: 999,
      });

      assertEquals(deleteResult.deletedCount, 0);
    });
  });

  describe("Schema Validation", () => {
    it("should validate user data and reject invalid email", async () => {
      const invalidUser = {
        name: "Invalid User",
        email: "not-an-email",
        age: 25,
      };

      await assertRejects(
        async () => {
          await UserModel.insertOne(invalidUser as UserInsert);
        },
        z.ZodError,
      );
    });

    it("should reject negative age", async () => {
      const invalidUser = {
        name: "Invalid Age User",
        email: "valid@example.com",
        age: -5,
      };

      await assertRejects(
        async () => {
          await UserModel.insertOne(invalidUser as UserInsert);
        },
        z.ZodError,
      );
    });

    it("should reject missing required fields", async () => {
      const invalidUser = {
        age: 25,
        // Missing name and email
      };

      await assertRejects(
        async () => {
          await UserModel.insertOne(invalidUser as UserInsert);
        },
        z.ZodError,
      );
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle multiple operations in sequence", async () => {
      // Insert multiple users
      const user1 = await UserModel.insertOne({
        name: "Alice",
        email: "alice@example.com",
        age: 28,
      });

      const user2 = await UserModel.insertOne({
        name: "Bob",
        email: "bob@example.com",
        age: 32,
      });

      // Find all users
      const allUsers = await UserModel.find({});
      assertEquals(allUsers.length, 2);

      // Update one user
      await UserModel.update({ _id: user1.insertedId }, { age: 29 });

      // Delete one user
      await UserModel.delete({ _id: user2.insertedId });

      // Verify final state
      const finalUsers = await UserModel.find({});
      assertEquals(finalUsers.length, 1);
      assertEquals(finalUsers[0].name, "Alice");
      assertEquals(finalUsers[0].age, 29);
    });

    it("should maintain data isolation between operations", async () => {
      // This test ensures that operations don't interfere with each other
      const user1 = await UserModel.insertOne({
        name: "Isolation Test 1",
        email: "iso1@test.com",
        age: 20,
      });

      const user2 = await UserModel.insertOne({
        name: "Isolation Test 2",
        email: "iso2@test.com",
        age: 30,
      });

      // Update user1 shouldn't affect user2
      await UserModel.update({ _id: user1.insertedId }, {
        name: "Updated User 1",
      });

      const foundUser2 = await UserModel.findOne({ _id: user2.insertedId });
      assertEquals(foundUser2?.name, "Isolation Test 2"); // Should remain unchanged
    });

    it("should handle concurrent-like operations", async () => {
      const insertPromises = [
        UserModel.insertOne({ name: "Concurrent 1", email: "con1@test.com" }),
        UserModel.insertOne({ name: "Concurrent 2", email: "con2@test.com" }),
        UserModel.insertOne({ name: "Concurrent 3", email: "con3@test.com" }),
      ];

      const results = await Promise.all(insertPromises);

      assertEquals(results.length, 3);
      results.forEach((result) => {
        assertExists(result.insertedId);
      });

      const allUsers = await UserModel.find({});
      assertEquals(allUsers.length, 3);
    });
  });
});
