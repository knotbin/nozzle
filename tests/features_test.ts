import { assert, assertExists } from "@std/assert";
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
  UserModel = createUserModel("users_features");
});

Deno.test.beforeEach(async () => {
  await cleanupCollection(UserModel);
});

Deno.test.afterAll(async () => {
  await teardownTestDb();
});

Deno.test({
  name: "Features: Default Values - should handle default createdAt",
  async fn() {
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
    assert(foundUser.createdAt instanceof Date);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
