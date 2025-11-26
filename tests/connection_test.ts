import { assert, assertEquals } from "@std/assert";
import { connect, disconnect, type ConnectOptions } from "../mod.ts";
import { MongoMemoryServer } from "mongodb-memory-server-core";

let mongoServer: MongoMemoryServer | null = null;

async function setupTestServer() {
  if (!mongoServer) {
    mongoServer = await MongoMemoryServer.create();
  }
  return mongoServer.getUri();
}

Deno.test.afterEach(async () => {
  await disconnect();
});

Deno.test.afterAll(async () => {
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
});

Deno.test({
  name: "Connection: Basic - should connect without options",
  async fn() {
    const uri = await setupTestServer();
    const connection = await connect(uri, "test_db");
    
    assert(connection);
    assert(connection.client);
    assert(connection.db);
    assertEquals(connection.db.databaseName, "test_db");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection: Options - should connect with pooling options",
  async fn() {
    const uri = await setupTestServer();
    const options: ConnectOptions = {
      clientOptions: {
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        connectTimeoutMS: 5000,
      },
    };
    
    const connection = await connect(uri, "test_db", options);
    
    assert(connection);
    assert(connection.client);
    assert(connection.db);
    
    // Verify connection is working
    const adminDb = connection.db.admin();
    const serverStatus = await adminDb.serverStatus();
    assert(serverStatus);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection: Singleton - should reuse existing connection",
  async fn() {
    const uri = await setupTestServer();
    
    const connection1 = await connect(uri, "test_db");
    const connection2 = await connect(uri, "test_db");
    
    // Should return the same connection instance
    assertEquals(connection1, connection2);
    assertEquals(connection1.client, connection2.client);
    assertEquals(connection1.db, connection2.db);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection: Disconnect - should disconnect and allow reconnection",
  async fn() {
    const uri = await setupTestServer();
    
    const connection1 = await connect(uri, "test_db");
    assert(connection1);
    
    await disconnect();
    
    // Should be able to reconnect
    const connection2 = await connect(uri, "test_db");
    assert(connection2);
    
    // Should be a new connection instance
    assert(connection1 !== connection2);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection: Options - should apply maxPoolSize option",
  async fn() {
    const uri = await setupTestServer();
    const options: ConnectOptions = {
      clientOptions: {
        maxPoolSize: 5,
      },
    };
    
    const connection = await connect(uri, "test_db", options);
    
    // Verify connection works with custom pool size
    const collections = await connection.db.listCollections().toArray();
    assert(Array.isArray(collections));
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection: Multiple Databases - should handle different database names",
  async fn() {
    const uri = await setupTestServer();
    
    // Connect to first database
    const connection1 = await connect(uri, "db1");
    assertEquals(connection1.db.databaseName, "db1");
    
    // Disconnect first
    await disconnect();
    
    // Connect to second database
    const connection2 = await connect(uri, "db2");
    assertEquals(connection2.db.databaseName, "db2");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

