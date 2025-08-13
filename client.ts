import { type Db, MongoClient } from "mongodb";

interface Connection {
  client: MongoClient;
  db: Db;
}

let connection: Connection | null = null;

export async function connect(
  uri: string,
  dbName: string,
): Promise<Connection> {
  if (connection) {
    return connection;
  }

  const client = new MongoClient(uri);
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
