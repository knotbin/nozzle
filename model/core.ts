import type { z } from "@zod/zod";
import type {
  Collection,
  DeleteResult,
  Document,
  Filter,
  InsertManyResult,
  InsertOneResult,
  InsertOneOptions,
  FindOptions,
  UpdateOptions,
  ReplaceOptions,
  DeleteOptions,
  CountDocumentsOptions,
  AggregateOptions,
  OptionalUnlessRequiredId,
  UpdateResult,
  WithId,
  BulkWriteOptions,
} from "mongodb";
import { ObjectId } from "mongodb";
import type { Schema, Infer, Input } from "../types.ts";
import { parse, parsePartial, parseReplace } from "./validation.ts";

/**
 * Core CRUD operations for the Model class
 * 
 * This module contains all basic create, read, update, and delete operations
 * with automatic Zod validation and transaction support.
 */

/**
 * Insert a single document into the collection
 * 
 * @param collection - MongoDB collection
 * @param schema - Zod schema for validation
 * @param data - Document data to insert
 * @param options - Insert options (including session for transactions)
 * @returns Insert result with insertedId
 */
export async function insertOne<T extends Schema>(
  collection: Collection<Infer<T>>,
  schema: T,
  data: Input<T>,
  options?: InsertOneOptions
): Promise<InsertOneResult<Infer<T>>> {
  const validatedData = parse(schema, data);
  return await collection.insertOne(
    validatedData as OptionalUnlessRequiredId<Infer<T>>,
    options
  );
}

/**
 * Insert multiple documents into the collection
 * 
 * @param collection - MongoDB collection
 * @param schema - Zod schema for validation
 * @param data - Array of document data to insert
 * @param options - Insert options (including session for transactions)
 * @returns Insert result with insertedIds
 */
export async function insertMany<T extends Schema>(
  collection: Collection<Infer<T>>,
  schema: T,
  data: Input<T>[],
  options?: BulkWriteOptions
): Promise<InsertManyResult<Infer<T>>> {
  const validatedData = data.map((item) => parse(schema, item));
  return await collection.insertMany(
    validatedData as OptionalUnlessRequiredId<Infer<T>>[],
    options
  );
}

/**
 * Find multiple documents matching the query
 * 
 * @param collection - MongoDB collection
 * @param query - MongoDB query filter
 * @param options - Find options (including session for transactions)
 * @returns Array of matching documents
 */
export async function find<T extends Schema>(
  collection: Collection<Infer<T>>,
  query: Filter<Infer<T>>,
  options?: FindOptions
): Promise<(WithId<Infer<T>>)[]> {
  return await collection.find(query, options).toArray();
}

/**
 * Find a single document matching the query
 * 
 * @param collection - MongoDB collection
 * @param query - MongoDB query filter
 * @param options - Find options (including session for transactions)
 * @returns Matching document or null if not found
 */
export async function findOne<T extends Schema>(
  collection: Collection<Infer<T>>,
  query: Filter<Infer<T>>,
  options?: FindOptions
): Promise<WithId<Infer<T>> | null> {
  return await collection.findOne(query, options);
}

/**
 * Find a document by its MongoDB ObjectId
 * 
 * @param collection - MongoDB collection
 * @param id - Document ID (string or ObjectId)
 * @param options - Find options (including session for transactions)
 * @returns Matching document or null if not found
 */
export async function findById<T extends Schema>(
  collection: Collection<Infer<T>>,
  id: string | ObjectId,
  options?: FindOptions
): Promise<WithId<Infer<T>> | null> {
  const objectId = typeof id === "string" ? new ObjectId(id) : id;
  return await findOne(collection, { _id: objectId } as Filter<Infer<T>>, options);
}

/**
 * Update multiple documents matching the query
 * 
 * @param collection - MongoDB collection
 * @param schema - Zod schema for validation
 * @param query - MongoDB query filter
 * @param data - Partial data to update
 * @param options - Update options (including session for transactions)
 * @returns Update result
 */
export async function update<T extends Schema>(
  collection: Collection<Infer<T>>,
  schema: T,
  query: Filter<Infer<T>>,
  data: Partial<z.infer<T>>,
  options?: UpdateOptions
): Promise<UpdateResult<Infer<T>>> {
  const validatedData = parsePartial(schema, data);
  return await collection.updateMany(
    query, 
    { $set: validatedData as Partial<Infer<T>> },
    options
  );
}

/**
 * Update a single document matching the query
 * 
 * @param collection - MongoDB collection
 * @param schema - Zod schema for validation
 * @param query - MongoDB query filter
 * @param data - Partial data to update
 * @param options - Update options (including session for transactions)
 * @returns Update result
 */
export async function updateOne<T extends Schema>(
  collection: Collection<Infer<T>>,
  schema: T,
  query: Filter<Infer<T>>,
  data: Partial<z.infer<T>>,
  options?: UpdateOptions
): Promise<UpdateResult<Infer<T>>> {
  const validatedData = parsePartial(schema, data);
  return await collection.updateOne(
    query, 
    { $set: validatedData as Partial<Infer<T>> },
    options
  );
}

/**
 * Replace a single document matching the query
 * 
 * @param collection - MongoDB collection
 * @param schema - Zod schema for validation
 * @param query - MongoDB query filter
 * @param data - Complete document data for replacement
 * @param options - Replace options (including session for transactions)
 * @returns Update result
 */
export async function replaceOne<T extends Schema>(
  collection: Collection<Infer<T>>,
  schema: T,
  query: Filter<Infer<T>>,
  data: Input<T>,
  options?: ReplaceOptions
): Promise<UpdateResult<Infer<T>>> {
  const validatedData = parseReplace(schema, data);
  // Remove _id from validatedData for replaceOne (it will use the query's _id)
  const { _id, ...withoutId } = validatedData as Infer<T> & { _id?: unknown };
  return await collection.replaceOne(
    query,
    withoutId as Infer<T>,
    options
  );
}

/**
 * Delete multiple documents matching the query
 * 
 * @param collection - MongoDB collection
 * @param query - MongoDB query filter
 * @param options - Delete options (including session for transactions)
 * @returns Delete result
 */
export async function deleteMany<T extends Schema>(
  collection: Collection<Infer<T>>,
  query: Filter<Infer<T>>,
  options?: DeleteOptions
): Promise<DeleteResult> {
  return await collection.deleteMany(query, options);
}

/**
 * Delete a single document matching the query
 * 
 * @param collection - MongoDB collection
 * @param query - MongoDB query filter
 * @param options - Delete options (including session for transactions)
 * @returns Delete result
 */
export async function deleteOne<T extends Schema>(
  collection: Collection<Infer<T>>,
  query: Filter<Infer<T>>,
  options?: DeleteOptions
): Promise<DeleteResult> {
  return await collection.deleteOne(query, options);
}

/**
 * Count documents matching the query
 * 
 * @param collection - MongoDB collection
 * @param query - MongoDB query filter
 * @param options - Count options (including session for transactions)
 * @returns Number of matching documents
 */
export async function count<T extends Schema>(
  collection: Collection<Infer<T>>,
  query: Filter<Infer<T>>,
  options?: CountDocumentsOptions
): Promise<number> {
  return await collection.countDocuments(query, options);
}

/**
 * Execute an aggregation pipeline
 * 
 * @param collection - MongoDB collection
 * @param pipeline - MongoDB aggregation pipeline
 * @param options - Aggregate options (including session for transactions)
 * @returns Array of aggregation results
 */
export async function aggregate<T extends Schema>(
  collection: Collection<Infer<T>>,
  pipeline: Document[],
  options?: AggregateOptions
): Promise<Document[]> {
  return await collection.aggregate(pipeline, options).toArray();
}
