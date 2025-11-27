import { type Db, type MongoClientOptions, MongoClient } from "mongodb";
import { ConnectionError } from "../errors.ts";

/**
 * Connection management module
 * 
 * Handles MongoDB connection lifecycle including connect, disconnect,
 * and connection state management.
 */

export interface Connection {
  client: MongoClient;
  db: Db;
}

export interface ConnectOptions extends MongoClientOptions {}

// Singleton connection state
let connection: Connection | null = null;

/**
 * Connect to MongoDB with connection pooling, retry logic, and resilience options
 * 
 * The MongoDB driver handles connection pooling and automatic retries.
 * Retry logic is enabled by default for both reads and writes in MongoDB 4.2+.
 * 
 * @param uri - MongoDB connection string
 * @param dbName - Name of the database to connect to
 * @param options - Connection options (pooling, retries, timeouts, etc.)
 * @returns Connection object with client and db
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

/**
 * Disconnect from MongoDB and clean up resources
 */
export async function disconnect(): Promise<void> {
  if (connection) {
    await connection.client.close();
    connection = null;
  }
}

/**
 * Get the current database connection
 * 
 * @returns MongoDB Db instance
 * @throws {ConnectionError} If not connected
 * @internal
 */
export function getDb(): Db {
  if (!connection) {
    throw new ConnectionError("MongoDB not connected. Call connect() first.");
  }
  return connection.db;
}

/**
 * Get the current connection state
 * 
 * @returns Connection object or null if not connected
 * @internal
 */
export function getConnection(): Connection | null {
  return connection;
}
