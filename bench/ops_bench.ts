import { z } from "@zod/zod";
import { MongoMemoryServer } from "mongodb-memory-server-core";
import mongoose from "mongoose";
import { connect, disconnect, Model } from "../mod.ts";

/**
 * Benchmark basic CRUD operations for Nozzle vs Mongoose.
 *
 * Run with:
 *   deno bench -A bench/nozzle_vs_mongoose.bench.ts
 */

const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
  createdAt: z.date().default(() => new Date()),
});

const mongoServer = await MongoMemoryServer.create();
const uri = mongoServer.getUri();

// Use separate DBs to avoid any cross-driver interference
const nozzleDbName = "bench_nozzle";
const mongooseDbName = "bench_mongoose";

await connect(uri, nozzleDbName);
const NozzleUser = new Model("bench_users_nozzle", userSchema);

const mongooseConn = await mongoose.connect(uri, { dbName: mongooseDbName });
const mongooseUserSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    age: Number,
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "bench_users_mongoose" },
);
const MongooseUser = mongooseConn.models.BenchUser ||
  mongooseConn.model("BenchUser", mongooseUserSchema);

// Start from a clean state
await NozzleUser.delete({});
await MongooseUser.deleteMany({});

// Seed base documents for read/update benches
const nozzleSeed = await NozzleUser.insertOne({
  name: "Seed Nozzle",
  email: "seed-nozzle@example.com",
  age: 30,
});
const mongooseSeed = await MongooseUser.create({
  name: "Seed Mongoose",
  email: "seed-mongoose@example.com",
  age: 30,
});

const nozzleSeedId = nozzleSeed.insertedId;
const mongooseSeedId = mongooseSeed._id;

let counter = 0;
const nextEmail = (prefix: string) => `${prefix}-${counter++}@bench.dev`;

Deno.bench("mongoose insertOne", { group: "insertOne" }, async () => {
  await MongooseUser.insertOne({
    name: "Mongoose User",
    email: nextEmail("mongoose"),
    age: 25,
  });
});

Deno.bench(
  "nozzle insertOne",
  { group: "insertOne", baseline: true },
  async () => {
    await NozzleUser.insertOne({
      name: "Nozzle User",
      email: nextEmail("nozzle"),
      age: 25,
    });
  },
);

Deno.bench("mongoose findById", { group: "findById" }, async () => {
  await MongooseUser.findById(mongooseSeedId);
});

Deno.bench(
  "nozzle findById",
  { group: "findById", baseline: true },
  async () => {
    await NozzleUser.findById(nozzleSeedId);
  },
);

Deno.bench("mongoose updateOne", { group: "updateOne" }, async () => {
  await MongooseUser.updateOne(
    { _id: mongooseSeedId },
    { $set: { age: 31 } },
  );
});

Deno.bench(
  "nozzle updateOne",
  { group: "updateOne", baseline: true },
  async () => {
    await NozzleUser.updateOne(
      { _id: nozzleSeedId },
      { age: 31 },
    );
  },
);

// Attempt graceful shutdown when the process exits
async function cleanup() {
  await disconnect();
  await mongooseConn.disconnect();
  await mongoServer.stop();
}

globalThis.addEventListener("unload", () => {
  void cleanup();
});
