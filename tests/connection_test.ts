import { assert, assertEquals, assertExists } from "@std/assert";
import { connect, disconnect, healthCheck, type ConnectOptions } from "../mod.ts";
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
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      connectTimeoutMS: 5000,
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
      maxPoolSize: 5,
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

Deno.test({
  name: "Health Check: should return unhealthy when not connected",
  async fn() {
    const result = await healthCheck();
    
    assertEquals(result.healthy, false);
    assertEquals(result.connected, false);
    assertExists(result.error);
    assert(result.error?.includes("No active connection"));
    assertExists(result.timestamp);
    assertEquals(result.responseTimeMs, undefined);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Health Check: should return healthy when connected",
  async fn() {
    const uri = await setupTestServer();
    await connect(uri, "test_db");
    
    const result = await healthCheck();
    
    assertEquals(result.healthy, true);
    assertEquals(result.connected, true);
    assertExists(result.responseTimeMs);
    assert(result.responseTimeMs! >= 0);
    assertEquals(result.error, undefined);
    assertExists(result.timestamp);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Health Check: should measure response time",
  async fn() {
    const uri = await setupTestServer();
    await connect(uri, "test_db");
    
    const result = await healthCheck();
    
    assertEquals(result.healthy, true);
    assertExists(result.responseTimeMs);
    // Response time should be reasonable (less than 1 second for in-memory MongoDB)
    assert(result.responseTimeMs! < 1000);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Health Check: should work multiple times consecutively",
  async fn() {
    const uri = await setupTestServer();
    await connect(uri, "test_db");
    
    // Run health check multiple times
    const results = await Promise.all([
      healthCheck(),
      healthCheck(),
      healthCheck(),
    ]);
    
    // All should be healthy
    for (const result of results) {
      assertEquals(result.healthy, true);
      assertEquals(result.connected, true);
      assertExists(result.responseTimeMs);
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Health Check: should detect disconnection",
  async fn() {
    const uri = await setupTestServer();
    await connect(uri, "test_db");
    
    // First check should be healthy
    let result = await healthCheck();
    assertEquals(result.healthy, true);
    
    // Disconnect
    await disconnect();
    
    // Second check should be unhealthy
    result = await healthCheck();
    assertEquals(result.healthy, false);
    assertEquals(result.connected, false);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

