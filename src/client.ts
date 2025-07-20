import { MongoClient, Db } from 'mongodb';

interface MongoConnection {
  client: MongoClient;
  db: Db;
}

let connection: MongoConnection | null = null;

export async function connect(uri: string, dbName: string): Promise<MongoConnection> {
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
    throw new Error('MongoDB not connected. Call connect() first.');
  }
  return connection.db;
}


