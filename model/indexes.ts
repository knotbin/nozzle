import type {
  Collection,
  CreateIndexesOptions,
  DropIndexesOptions,
  IndexDescription,
  IndexSpecification,
  ListIndexesOptions,
} from "mongodb";
import type { Infer, Schema } from "../types.ts";

/**
 * Index management operations for the Model class
 *
 * This module contains all index-related operations including creation,
 * deletion, listing, and synchronization of indexes.
 */

/**
 * Create a single index on the collection
 *
 * @param collection - MongoDB collection
 * @param keys - Index specification (e.g., { email: 1 } or { name: "text" })
 * @param options - Index creation options (unique, sparse, expireAfterSeconds, etc.)
 * @returns The name of the created index
 */
export async function createIndex<T extends Schema>(
  collection: Collection<Infer<T>>,
  keys: IndexSpecification,
  options?: CreateIndexesOptions,
): Promise<string> {
  return await collection.createIndex(keys, options);
}

/**
 * Create multiple indexes on the collection
 *
 * @param collection - MongoDB collection
 * @param indexes - Array of index descriptions
 * @param options - Index creation options
 * @returns Array of index names created
 */
export async function createIndexes<T extends Schema>(
  collection: Collection<Infer<T>>,
  indexes: IndexDescription[],
  options?: CreateIndexesOptions,
): Promise<string[]> {
  return await collection.createIndexes(indexes, options);
}

/**
 * Drop a single index from the collection
 *
 * @param collection - MongoDB collection
 * @param index - Index name or specification
 * @param options - Drop index options
 */
export async function dropIndex<T extends Schema>(
  collection: Collection<Infer<T>>,
  index: string | IndexSpecification,
  options?: DropIndexesOptions,
): Promise<void> {
  await collection.dropIndex(index as string, options);
}

/**
 * Drop all indexes from the collection (except _id index)
 *
 * @param collection - MongoDB collection
 * @param options - Drop index options
 */
export async function dropIndexes<T extends Schema>(
  collection: Collection<Infer<T>>,
  options?: DropIndexesOptions,
): Promise<void> {
  await collection.dropIndexes(options);
}

/**
 * List all indexes on the collection
 *
 * @param collection - MongoDB collection
 * @param options - List indexes options
 * @returns Array of index information
 */
export async function listIndexes<T extends Schema>(
  collection: Collection<Infer<T>>,
  options?: ListIndexesOptions,
): Promise<IndexDescription[]> {
  const indexes = await collection.listIndexes(options).toArray();
  return indexes as IndexDescription[];
}

/**
 * Get index information by name
 *
 * @param collection - MongoDB collection
 * @param indexName - Name of the index
 * @returns Index description or null if not found
 */
export async function getIndex<T extends Schema>(
  collection: Collection<Infer<T>>,
  indexName: string,
): Promise<IndexDescription | null> {
  const indexes = await listIndexes(collection);
  return indexes.find((idx) => idx.name === indexName) || null;
}

/**
 * Check if an index exists
 *
 * @param collection - MongoDB collection
 * @param indexName - Name of the index
 * @returns True if index exists, false otherwise
 */
export async function indexExists<T extends Schema>(
  collection: Collection<Infer<T>>,
  indexName: string,
): Promise<boolean> {
  const index = await getIndex(collection, indexName);
  return index !== null;
}

/**
 * Synchronize indexes - create indexes if they don't exist, update if they differ
 *
 * This is useful for ensuring indexes match your schema definition
 *
 * @param collection - MongoDB collection
 * @param indexes - Array of index descriptions to synchronize
 * @param options - Options for index creation
 * @returns Array of index names that were created
 */
export async function syncIndexes<T extends Schema>(
  collection: Collection<Infer<T>>,
  indexes: IndexDescription[],
  options?: CreateIndexesOptions,
): Promise<string[]> {
  const existingIndexes = await listIndexes(collection);
  const indexesToCreate: IndexDescription[] = [];

  for (const index of indexes) {
    const indexName = index.name || generateIndexName(index.key);
    const existingIndex = existingIndexes.find(
      (idx) => idx.name === indexName,
    );

    if (!existingIndex) {
      indexesToCreate.push(index);
    } else if (
      JSON.stringify(existingIndex.key) !== JSON.stringify(index.key)
    ) {
      // Index exists but keys differ - drop and recreate
      await dropIndex(collection, indexName);
      indexesToCreate.push(index);
    }
    // If index exists and matches, skip it
  }

  const created: string[] = [];
  if (indexesToCreate.length > 0) {
    const names = await createIndexes(collection, indexesToCreate, options);
    created.push(...names);
  }

  return created;
}

/**
 * Generate index name from key specification
 *
 * @param keys - Index specification
 * @returns Generated index name
 */
export function generateIndexName(keys: IndexSpecification): string {
  if (typeof keys === "string") {
    return keys;
  }
  const entries = Object.entries(keys as Record<string, number | string>);
  return entries.map(([field, direction]) => `${field}_${direction}`).join("_");
}
