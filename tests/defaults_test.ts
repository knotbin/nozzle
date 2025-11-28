import { assertEquals, assertExists } from "@std/assert";
import { z } from "@zod/zod";
import { connect, disconnect, Model, type Input } from "../mod.ts";
import { applyDefaultsForUpsert } from "../model/validation.ts";
import { MongoMemoryServer } from "mongodb-memory-server-core";

/**
 * Test suite for default value handling in different operation types
 * 
 * This tests the three main cases:
 * 1. Plain inserts - defaults applied directly
 * 2. Updates without upsert - defaults NOT applied
 * 3. Upserts that create - defaults applied via $setOnInsert
 * 4. Upserts that match - $setOnInsert ignored (correct behavior)
 * 5. Replace with upsert - defaults applied on creation
 */

// Schema with defaults for testing
const productSchema = z.object({
  name: z.string(),
  price: z.number().min(0),
  category: z.string().default("general"),
  inStock: z.boolean().default(true),
  createdAt: z.date().default(() => new Date("2024-01-01T00:00:00Z")),
  tags: z.array(z.string()).default([]),
});

type Product = z.infer<typeof productSchema>;
type ProductInsert = Input<typeof productSchema>;

let ProductModel: Model<typeof productSchema>;
let mongoServer: MongoMemoryServer;

Deno.test.beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await connect(uri, "test_defaults_db");
  ProductModel = new Model("test_products_defaults", productSchema);
});

Deno.test.beforeEach(async () => {
  await ProductModel.delete({});
});

Deno.test.afterAll(async () => {
  await ProductModel.delete({});
  await disconnect();
  await mongoServer.stop();
});

Deno.test({
  name: "Defaults: Case 1 - Plain insert applies defaults",
  async fn() {
    // Insert without providing optional fields with defaults
    const result = await ProductModel.insertOne({
      name: "Widget",
      price: 29.99,
      // category, inStock, createdAt, tags not provided - should use defaults
    });

    assertExists(result.insertedId);

    // Verify defaults were applied
    const product = await ProductModel.findById(result.insertedId);
    assertExists(product);
    
    assertEquals(product.name, "Widget");
    assertEquals(product.price, 29.99);
    assertEquals(product.category, "general"); // default
    assertEquals(product.inStock, true); // default
    assertExists(product.createdAt); // default function called
    assertEquals(product.tags, []); // default empty array
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Defaults: Case 2 - Update without upsert does NOT apply defaults",
  async fn() {
    // First create a document without defaults (simulate old data)
    const insertResult = await ProductModel.insertOne({
      name: "Gadget",
      price: 19.99,
      category: "electronics",
      inStock: false,
      createdAt: new Date("2023-01-01"),
      tags: ["test"],
    });
    
    assertExists(insertResult.insertedId);

    // Now update it - defaults should NOT be applied
    await ProductModel.updateOne(
      { _id: insertResult.insertedId },
      { price: 24.99 }
      // No upsert flag
    );

    const updated = await ProductModel.findById(insertResult.insertedId);
    assertExists(updated);
    
    assertEquals(updated.price, 24.99); // updated
    assertEquals(updated.category, "electronics"); // unchanged
    assertEquals(updated.inStock, false); // unchanged
    assertEquals(updated.tags, ["test"]); // unchanged
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Defaults: Case 3 - Upsert that creates applies defaults via $setOnInsert",
  async fn() {
    // Upsert with a query that won't match - will create new document
    const result = await ProductModel.updateOne(
      { name: "NonExistent" },
      { price: 39.99 },
      { upsert: true }
    );

    assertEquals(result.upsertedCount, 1);
    assertExists(result.upsertedId);

    // Verify the created document has defaults applied
    const product = await ProductModel.findOne({ name: "NonExistent" });
    assertExists(product);
    
    assertEquals(product.price, 39.99); // from $set
    assertEquals(product.name, "NonExistent"); // from query
    assertEquals(product.category, "general"); // default via $setOnInsert
    assertEquals(product.inStock, true); // default via $setOnInsert
    assertExists(product.createdAt); // default via $setOnInsert
    assertEquals(product.tags, []); // default via $setOnInsert
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Defaults: Case 4 - Upsert that matches does NOT apply defaults",
  async fn() {
    // Create a document first with explicit non-default values
    const insertResult = await ProductModel.insertOne({
      name: "ExistingProduct",
      price: 49.99,
      category: "premium",
      inStock: false,
      createdAt: new Date("2023-06-01"),
      tags: ["premium", "featured"],
    });

    assertExists(insertResult.insertedId);

    // Upsert with matching query - should update, not insert
    const result = await ProductModel.updateOne(
      { name: "ExistingProduct" },
      { price: 44.99 },
      { upsert: true }
    );

    assertEquals(result.matchedCount, 1);
    assertEquals(result.modifiedCount, 1);
    assertEquals(result.upsertedCount, 0); // No insert happened

    // Verify defaults were NOT applied (existing values preserved)
    const product = await ProductModel.findOne({ name: "ExistingProduct" });
    assertExists(product);
    
    assertEquals(product.price, 44.99); // updated via $set
    assertEquals(product.category, "premium"); // preserved (not overwritten with default)
    assertEquals(product.inStock, false); // preserved
    assertEquals(product.tags, ["premium", "featured"]); // preserved
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Defaults: Case 5 - Replace without upsert uses defaults from parse",
  async fn() {
    // Create initial document
    const insertResult = await ProductModel.insertOne({
      name: "ReplaceMe",
      price: 10.0,
      category: "old",
      inStock: true,
      createdAt: new Date("2020-01-01"),
      tags: ["old"],
    });

    assertExists(insertResult.insertedId);

    // Replace with partial data - defaults should fill in missing fields
    await ProductModel.replaceOne(
      { _id: insertResult.insertedId },
      {
        name: "Replaced",
        price: 15.0,
        // category, inStock, createdAt, tags not provided - defaults should apply
      }
    );

    const product = await ProductModel.findById(insertResult.insertedId);
    assertExists(product);
    
    assertEquals(product.name, "Replaced");
    assertEquals(product.price, 15.0);
    assertEquals(product.category, "general"); // default applied
    assertEquals(product.inStock, true); // default applied
    assertExists(product.createdAt); // default applied
    assertEquals(product.tags, []); // default applied
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Defaults: Case 6 - Replace with upsert (creates) applies defaults",
  async fn() {
    // Replace with upsert on non-existent document
    const result = await ProductModel.replaceOne(
      { name: "NewViaReplace" },
      {
        name: "NewViaReplace",
        price: 99.99,
        // Missing optional fields - defaults should apply
      },
      { upsert: true }
    );

    assertEquals(result.upsertedCount, 1);
    assertExists(result.upsertedId);

    const product = await ProductModel.findOne({ name: "NewViaReplace" });
    assertExists(product);
    
    assertEquals(product.name, "NewViaReplace");
    assertEquals(product.price, 99.99);
    assertEquals(product.category, "general"); // default
    assertEquals(product.inStock, true); // default
    assertExists(product.createdAt); // default
    assertEquals(product.tags, []); // default
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Defaults: Upsert only applies defaults to unmodified fields",
  async fn() {
    // Upsert where we explicitly set some fields that have defaults
    const result = await ProductModel.updateOne(
      { name: "CustomDefaults" },
      {
        price: 25.0,
        category: "custom", // Explicitly setting a field that has a default
        // inStock not set - should get default
      },
      { upsert: true }
    );

    assertEquals(result.upsertedCount, 1);

    const product = await ProductModel.findOne({ name: "CustomDefaults" });
    assertExists(product);
    
    assertEquals(product.name, "CustomDefaults"); // from query
    assertEquals(product.price, 25.0); // from $set
    assertEquals(product.category, "custom"); // from $set (NOT default)
    assertEquals(product.inStock, true); // default via $setOnInsert
    assertExists(product.createdAt); // default via $setOnInsert
    assertEquals(product.tags, []); // default via $setOnInsert
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Defaults: insertMany applies defaults to all documents",
  async fn() {
    const result = await ProductModel.insertMany([
      { name: "Bulk1", price: 10 },
      { name: "Bulk2", price: 20, category: "special" },
      { name: "Bulk3", price: 30 },
    ]);

    assertEquals(Object.keys(result.insertedIds).length, 3);

    const products = await ProductModel.find({});
    assertEquals(products.length, 3);

    // All should have defaults where not provided
    for (const product of products) {
      assertExists(product.createdAt);
      assertEquals(product.inStock, true);
      assertEquals(product.tags, []);
      
      if (product.name === "Bulk2") {
        assertEquals(product.category, "special");
      } else {
        assertEquals(product.category, "general");
      }
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Defaults: applyDefaultsForUpsert preserves existing $setOnInsert values",
  fn() {
    const schema = z.object({
      name: z.string(),
      flag: z.boolean().default(true),
      count: z.number().default(0),
    });

    const update = {
      $set: { name: "test" },
      $setOnInsert: { flag: false },
    };

    const result = applyDefaultsForUpsert(schema, {}, update);

    assertEquals(result.$setOnInsert?.flag, false);
    assertEquals(result.$setOnInsert?.count, 0);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Defaults: applyDefaultsForUpsert keeps query equality fields untouched",
  fn() {
    const schema = z.object({
      status: z.string().default("pending"),
      flag: z.boolean().default(true),
      name: z.string(),
    });

    const query = { status: "queued" };
    const update = { $set: { name: "upsert-test" } };

    const result = applyDefaultsForUpsert(schema, query, update);

    assertEquals(result.$setOnInsert?.status, undefined);
    assertEquals(result.$setOnInsert?.flag, true);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
