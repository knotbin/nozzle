import { 
  type Db, 
  type MongoClientOptions, 
  type ClientSession,
  type TransactionOptions,
  MongoClient 
} from "mongodb";
import { ConnectionError } from "./errors.ts";

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
 * Connect to MongoDB with connection pooling, retry logic, and resilience options
 * 
 * The MongoDB driver handles connection pooling and automatic retries.
 * Retry logic is enabled by default for both reads and writes in MongoDB 4.2+.
 * 
 * @param uri - MongoDB connection string
 * @param dbName - Name of the database to connect to
 * @param options - Connection options (pooling, retries, timeouts, etc.)
 * 
 * @example
 * Basic connection with pooling:
 * ```ts
 * await connect("mongodb://localhost:27017", "mydb", {
 *   maxPoolSize: 10,
 *   minPoolSize: 2,
 *   maxIdleTimeMS: 30000,
 *   connectTimeoutMS: 10000,
 *   socketTimeoutMS: 45000,
 * });
 * ```
 * 
 * @example
 * Production-ready connection with retry logic and resilience:
 * ```ts
 * await connect("mongodb://localhost:27017", "mydb", {
 *   // Connection pooling
 *   maxPoolSize: 10,
 *   minPoolSize: 2,
 *   
 *   // Automatic retry logic (enabled by default)
 *   retryReads: true,        // Retry failed read operations
 *   retryWrites: true,       // Retry failed write operations
 *   
 *   // Timeouts
 *   connectTimeoutMS: 10000,  // Initial connection timeout
 *   socketTimeoutMS: 45000,   // Socket operation timeout
 *   serverSelectionTimeoutMS: 10000, // Server selection timeout
 *   
 *   // Connection resilience
 *   maxIdleTimeMS: 30000,     // Close idle connections
 *   heartbeatFrequencyMS: 10000, // Server health check interval
 *   
 *   // Optional: Compression for reduced bandwidth
 *   compressors: ['snappy', 'zlib'],
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

  try {
    const client = new MongoClient(uri, options);
    await client.connect();
    const db = client.db(dbName);

    connection = { client, db };
    return connection;
  } catch (error) {
    throw new ConnectionError(
      `Failed to connect to MongoDB: ${error instanceof Error ? error.message : String(error)}`,
      uri
    );
  }
}

export async function disconnect(): Promise<void> {
  if (connection) {
    await connection.client.close();
    connection = null;
  }
}

/**
 * Start a new client session for transactions
 * 
 * Sessions must be ended when done using `endSession()`
 * 
 * @example
 * ```ts
 * const session = await startSession();
 * try {
 *   // use session
 * } finally {
 *   await endSession(session);
 * }
 * ```
 */
export function startSession(): ClientSession {
  if (!connection) {
    throw new ConnectionError("MongoDB not connected. Call connect() first.");
  }
  return connection.client.startSession();
}

/**
 * End a client session
 * 
 * @param session - The session to end
 */
export async function endSession(session: ClientSession): Promise<void> {
  await session.endSession();
}

/**
 * Execute a function within a transaction
 * 
 * Automatically handles session creation, transaction start/commit/abort, and cleanup.
 * If the callback throws an error, the transaction is automatically aborted.
 * 
 * @param callback - Async function to execute within the transaction. Receives the session as parameter.
 * @param options - Optional transaction options (read/write concern, etc.)
 * @returns The result from the callback function
 * 
 * @example
 * ```ts
 * const result = await withTransaction(async (session) => {
 *   await UserModel.insertOne({ name: "Alice" }, { session });
 *   await OrderModel.insertOne({ userId: "123", total: 100 }, { session });
 *   return { success: true };
 * });
 * ```
 */
export async function withTransaction<T>(
  callback: (session: ClientSession) => Promise<T>,
  options?: TransactionOptions
): Promise<T> {
  const session = await startSession();
  
  try {
    let result: T;
    
    await session.withTransaction(async () => {
      result = await callback(session);
    }, options);
    
    return result!;
  } finally {
    await endSession(session);
  }
}

export function getDb(): Db {
  if (!connection) {
    throw new ConnectionError("MongoDB not connected. Call connect() first.");
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
