import { type Db, type MongoClientOptions, MongoClient } from "mongodb";

interface Connection {
  client: MongoClient;
  db: Db;
}

let connection: Connection | null = null;

export interface ConnectOptions extends MongoClientOptions {};

/**
 * Health check details of the MongoDB connection
 * 
 * @property healthy - Overall health status of the connection
 * @property connected - Whether a connection is established
 * @property responseTimeMs - Response time in milliseconds (if connection is healthy)
 * @property error - Error message if health check failed
 * @property timestamp - Timestamp when health check was performed
 */
export interface HealthCheckResult {
  healthy: boolean;
  connected: boolean;
  responseTimeMs?: number;
  error?: string;
  timestamp: Date;
}

/**
 * Connect to MongoDB with options including connection pooling
 * 
 * @param uri - MongoDB connection string
 * @param dbName - Name of the database to connect to
 * @param options - Connection options including connection pooling
 * 
 * @example
 * ```ts
 * await connect("mongodb://localhost:27017", "mydb", {
 *   maxPoolSize: 10,
 *   minPoolSize: 2,
 *   maxIdleTimeMS: 30000,
 *   connectTimeoutMS: 10000,
 *   socketTimeoutMS: 45000,
 * });
 * ```
 */
export async function connect(
  uri: string,
  dbName: string,
  options?: ConnectOptions,
): Promise<Connection> {
  if (connection) {
    return connection;
  }

  const client = new MongoClient(uri, options);
  await client.connect();
  const db = client.db(dbName);

  connection = { client, db };
  return connection;
}

export async function disconnect(): Promise<void> {
  if (connection) {
    await connection.client.close();
    connection = null;
  }
}

export function getDb(): Db {
  if (!connection) {
    throw new Error("MongoDB not connected. Call connect() first.");
  }
  return connection.db;
}

/**
 * Check the health of the MongoDB connection
 * 
 * Performs a ping operation to verify the database is responsive
 * and returns detailed health information including response time.
 * 
 * @example
 * ```ts
 * const health = await healthCheck();
 * if (health.healthy) {
 *   console.log(`Database healthy (${health.responseTimeMs}ms)`);
 * } else {
 *   console.error(`Database unhealthy: ${health.error}`);
 * }
 * ```
 */
export async function healthCheck(): Promise<HealthCheckResult> {
  const timestamp = new Date();

  // Check if connection exists
  if (!connection) {
    return {
      healthy: false,
      connected: false,
      error: "No active connection. Call connect() first.",
      timestamp,
    };
  }

  try {
    // Measure ping response time
    const startTime = performance.now();
    await connection.db.admin().ping();
    const endTime = performance.now();
    const responseTimeMs = Math.round(endTime - startTime);

    return {
      healthy: true,
      connected: true,
      responseTimeMs,
      timestamp,
    };
  } catch (error) {
    return {
      healthy: false,
      connected: true,
      error: error instanceof Error ? error.message : String(error),
      timestamp,
    };
  }
}
