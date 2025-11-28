# **Nozzle**

A lightweight, type-safe ODM for MongoDB in TypeScript

> **Note:** Nozzle requires MongoDB **4.2 or newer** and works best with the
> latest stable MongoDB server (6.x or newer) and the official
> [mongodb](https://www.npmjs.com/package/mongodb) Node.js driver (v6+).

## ✨ Features

- **Schema-first:** Define and validate collections using
  [Zod](https://zod.dev).
- **Type-safe operations:** Auto-complete and strict typings for `insert`,
  `find`, `update`, and `delete`.
- **Minimal & modular:** No decorators or magic. Just clean, composable APIs.
- **Built on MongoDB native driver:** Zero overhead with full control.

---

## 📦 Installation

```bash
deno add jsr:@nozzle/nozzle
```

> If you need to upgrade your local MongoDB server, see:
> https://www.mongodb.com/docs/manual/administration/install-community/

---

## 🚀 Quick Start

### 1. Define a schema

```ts
// src/schemas/user.ts
import { z } from "@zod/zod";

export const userSchema = z.object({
  name: z.string(),
  email: z.email(),
  age: z.number().int().positive().optional(),
  createdAt: z.date().default(() => new Date()),
});

export type User = z.infer<typeof userSchema>;
```

---

### 2. Initialize connection and model

```ts
// src/index.ts
import { connect, disconnect, InferModel, Input, Model } from "@nozzle/nozzle";
import { userSchema } from "./schemas/user";
import { ObjectId } from "mongodb"; // v6+ driver recommended

type User = InferModel<typeof userSchema>;
type UserInsert = Input<typeof userSchema>;

async function main() {
  // Basic connection
  await connect("mongodb://localhost:27017", "your_database_name");

  // Or with connection pooling options
  await connect("mongodb://localhost:27017", "your_database_name", {
    maxPoolSize: 10, // Maximum connections in pool
    minPoolSize: 2, // Minimum connections in pool
    maxIdleTimeMS: 30000, // Close idle connections after 30s
    connectTimeoutMS: 10000, // Connection timeout
    socketTimeoutMS: 45000, // Socket timeout
  });

  // Production-ready connection with retry logic and resilience
  await connect("mongodb://localhost:27017", "your_database_name", {
    // Connection pooling
    maxPoolSize: 10,
    minPoolSize: 2,

    // Automatic retry logic (enabled by default)
    retryReads: true, // Retry failed read operations
    retryWrites: true, // Retry failed write operations

    // Timeouts
    connectTimeoutMS: 10000, // Initial connection timeout
    socketTimeoutMS: 45000, // Socket operation timeout
    serverSelectionTimeoutMS: 10000, // Server selection timeout

    // Connection resilience
    maxIdleTimeMS: 30000, // Close idle connections
    heartbeatFrequencyMS: 10000, // Server health check interval
  });

  const UserModel = new Model("users", userSchema);

  // Your operations go here

  await disconnect();
}

main().catch(console.error);
```

---

### 3. Perform operations

```ts
// Insert one
// Note: createdAt has a default, so it's optional in the input type
const newUser: UserInsert = {
  name: "John Doe",
  email: "john.doe@example.com",
  age: 30,
  // createdAt is optional because of z.date().default(() => new Date())
};
const insertResult = await UserModel.insertOne(newUser);

// Find many
const users = await UserModel.find({ name: "John Doe" });

// Find one
const found = await UserModel.findOne({
  _id: new ObjectId(insertResult.insertedId),
}); // ObjectId from mongodb v6+

// Update
await UserModel.update({ name: "John Doe" }, { age: 31 });

// Delete
await UserModel.delete({ name: "John Doe" });

// Insert many
await UserModel.insertMany([
  { name: "Alice", email: "alice@example.com", age: 25 },
  { name: "Bob", email: "bob@example.com" },
]);

// Find by ID
await UserModel.findById(insertResult.insertedId);

// Update one
await UserModel.updateOne({ name: "Alice" }, { age: 26 });

// Replace one
await UserModel.replaceOne({ name: "Bob" }, {
  name: "Bob",
  email: "bob@newmail.com",
  age: 22,
});

// Delete one
await UserModel.deleteOne({ name: "Alice" });

// Count
const count = await UserModel.count({ age: { $gte: 18 } });

// Aggregation
const aggregation = await UserModel.aggregate([
  { $match: { age: { $gte: 18 } } },
  { $group: { _id: null, avgAge: { $avg: "$age" } } },
]);

// Paginated query
const paginated = await UserModel.findPaginated(
  { age: { $gte: 18 } },
  { skip: 0, limit: 10, sort: { age: -1 } },
);

// Index Management
// Create a unique index
await UserModel.createIndex({ email: 1 }, { unique: true });

// Create a compound index
await UserModel.createIndex({ name: 1, age: -1 });

// Create multiple indexes at once
await UserModel.createIndexes([
  { key: { email: 1 }, name: "email_idx", unique: true },
  { key: { name: 1, age: -1 }, name: "name_age_idx" },
]);

// List all indexes
const indexes = await UserModel.listIndexes();
console.log("Indexes:", indexes);

// Check if index exists
const exists = await UserModel.indexExists("email_idx");

// Drop an index
await UserModel.dropIndex("email_idx");

// Sync indexes (useful for migrations - creates missing, updates changed)
await UserModel.syncIndexes([
  { key: { email: 1 }, name: "email_idx", unique: true },
  { key: { createdAt: 1 }, name: "created_at_idx" },
]);

// Transactions (Requires MongoDB Replica Set or Sharded Cluster)
import { withTransaction } from "@nozzle/nozzle";

// Automatic transaction management with withTransaction
const result = await withTransaction(async (session) => {
  // All operations in this callback are part of the same transaction
  const user = await UserModel.insertOne(
    { name: "Alice", email: "alice@example.com" },
    { session }, // Pass session to each operation
  );

  const order = await OrderModel.insertOne(
    { userId: user.insertedId, total: 100 },
    { session },
  );

  // If any operation fails, the entire transaction is automatically aborted
  // If callback succeeds, transaction is automatically committed
  return { user, order };
});

// Manual session management (for advanced use cases)
import { endSession, startSession } from "@nozzle/nozzle";

const session = startSession();
try {
  await session.withTransaction(async () => {
    await UserModel.insertOne({ name: "Bob", email: "bob@example.com" }, {
      session,
    });
    await UserModel.updateOne({ name: "Alice" }, { balance: 50 }, { session });
  });
} finally {
  await endSession(session);
}

// Error Handling
import { ConnectionError, ValidationError } from "@nozzle/nozzle";

try {
  await UserModel.insertOne({ name: "", email: "invalid" });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error("Validation failed:", error.operation);
    // Get field-specific errors
    const fieldErrors = error.getFieldErrors();
    console.error("Field errors:", fieldErrors);
    // { name: ['String must contain at least 1 character(s)'], email: ['Invalid email'] }
  } else if (error instanceof ConnectionError) {
    console.error("Connection failed:", error.uri);
  } else {
    console.error("Unexpected error:", error);
  }
}
```

---

## 🗺️ Roadmap

### 🔴 Critical (Must Have)

- [x] Transactions support
- [x] Connection retry logic
- [x] Improved error handling
- [x] Connection health checks
- [x] Connection pooling configuration

### 🟡 Important (Should Have)

- [x] Index management
- [ ] Middleware/hooks system
- [ ] Relationship/population support
- [x] Better default value handling
- [ ] Comprehensive edge case testing

### 🟢 Nice to Have

- [x] Pagination support
- [ ] Plugin system
- [ ] Query builder API
- [ ] Virtual fields
- [ ] Document/static methods

For detailed production readiness assessment, see
[PRODUCTION_READINESS_ASSESSMENT.md](./PRODUCTION_READINESS_ASSESSMENT.md).

---

## 📄 License

MIT — use it freely and contribute back if you'd like!

---
