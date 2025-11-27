import type {
  Collection,
  Document,
  Filter,
  WithId,
} from "mongodb";
import type { Schema, Infer } from "../types.ts";

/**
 * Pagination operations for the Model class
 * 
 * This module contains pagination-related functionality for finding documents
 * with skip, limit, and sort options.
 */

/**
 * Find documents with pagination support
 * 
 * @param collection - MongoDB collection
 * @param query - MongoDB query filter
 * @param options - Pagination options (skip, limit, sort)
 * @returns Array of matching documents
 * 
 * @example
 * ```ts
 * const users = await findPaginated(collection, 
 *   { age: { $gte: 18 } },
 *   { skip: 0, limit: 10, sort: { createdAt: -1 } }
 * );
 * ```
 */
export async function findPaginated<T extends Schema>(
  collection: Collection<Infer<T>>,
  query: Filter<Infer<T>>,
  options: { skip?: number; limit?: number; sort?: Document } = {},
): Promise<(WithId<Infer<T>>)[]> {
  return await collection
    .find(query)
    .skip(options.skip ?? 0)
    .limit(options.limit ?? 10)
    .sort(options.sort ?? {})
    .toArray();
}
