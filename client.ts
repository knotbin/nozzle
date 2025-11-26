import { type Db, type MongoClientOptions, MongoClient } from "mongodb";

interface Connection {
  client: MongoClient;
  db: Db;
}

let connection: Connection | null = null;

export interface ConnectOptions {
  /**
   * MongoDB connection options (pooling, timeouts, etc.)
   * See: https://mongodb.github.io/node-mongodb-native/6.18/interfaces/MongoClientOptions.html
   */
  clientOptions?: MongoClientOptions;
}

/**
 * Connect to MongoDB with connection pooling and other options
 * 
 * The MongoDB driver handles connection pooling automatically.
 * Configure pooling via `clientOptions`:
 * 
 * @example
 * ```ts
 * await connect("mongodb://localhost:27017", "mydb", {
 *   clientOptions: {
 *     maxPoolSize: 10,        // Maximum connections in pool
 *     minPoolSize: 2,          // Minimum connections in pool
 *     maxIdleTimeMS: 30000,    // Close idle connections after 30s
 *     connectTimeoutMS: 10000, // Connection timeout
 *     socketTimeoutMS: 45000,  // Socket timeout
 *   }
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

  const client = new MongoClient(uri, options?.clientOptions);
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
