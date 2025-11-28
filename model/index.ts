import type { z } from "@zod/zod";
import type {
  Collection,
  CreateIndexesOptions,
  DeleteResult,
  Document,
  DropIndexesOptions,
  Filter,
  IndexDescription,
  IndexSpecification,
  InsertManyResult,
  InsertOneResult,
  InsertOneOptions,
  FindOptions,
  UpdateOptions,
  ReplaceOptions,
  DeleteOptions,
  CountDocumentsOptions,
  AggregateOptions,
  ListIndexesOptions,
  UpdateResult,
  WithId,
  BulkWriteOptions,
} from "mongodb";
import type { ObjectId } from "mongodb";
import { getDb } from "../client/connection.ts";
import type { Schema, Infer, Input, Indexes, ModelDef } from "../types.ts";
import * as core from "./core.ts";
import * as indexes from "./indexes.ts";
import * as pagination from "./pagination.ts";

/**
 * Model class for type-safe MongoDB operations
 * 
 * Provides a clean API for CRUD operations, pagination, and index management
 * with automatic Zod validation and TypeScript type safety.
 * 
 * @example
 * ```ts
 * const userSchema = z.object({
 *   name: z.string(),
 *   email: z.string().email(),
 * });
 * 
 * const UserModel = new Model("users", userSchema);
 * await UserModel.insertOne({ name: "Alice", email: "alice@example.com" });
 * ```
 */
export class Model<T extends Schema> {
  private collection: Collection<Infer<T>>;
  private schema: T;
  private indexes?: Indexes;

  constructor(collectionName: string, definition: ModelDef<T> | T) {
    if ("schema" in definition) {
      this.schema = definition.schema;
      this.indexes = definition.indexes;
    } else {
      this.schema = definition as T;
    }
    this.collection = getDb().collection<Infer<T>>(collectionName);
    
    // Automatically create indexes if they were provided
    if (this.indexes && this.indexes.length > 0) {
      // Fire and forget - indexes will be created asynchronously
      indexes.syncIndexes(this.collection, this.indexes)
    }
  }

  // ============================================================================
  // CRUD Operations (delegated to core.ts)
  // ============================================================================

  /**
   * Insert a single document into the collection
   * 
   * @param data - Document data to insert
   * @param options - Insert options (including session for transactions)
   * @returns Insert result with insertedId
   */
  async insertOne(
    data: Input<T>,
    options?: InsertOneOptions
  ): Promise<InsertOneResult<Infer<T>>> {
    return await core.insertOne(this.collection, this.schema, data, options);
  }

  /**
   * Insert multiple documents into the collection
   * 
   * @param data - Array of document data to insert
   * @param options - Insert options (including session for transactions)
   * @returns Insert result with insertedIds
   */
  async insertMany(
    data: Input<T>[],
    options?: BulkWriteOptions
  ): Promise<InsertManyResult<Infer<T>>> {
    return await core.insertMany(this.collection, this.schema, data, options);
  }

  /**
   * Find multiple documents matching the query
   * 
   * @param query - MongoDB query filter
   * @param options - Find options (including session for transactions)
   * @returns Array of matching documents
   */
  async find(
    query: Filter<Infer<T>>,
    options?: FindOptions
  ): Promise<(WithId<Infer<T>>)[]> {
    return await core.find(this.collection, query, options);
  }

  /**
   * Find a single document matching the query
   * 
   * @param query - MongoDB query filter
   * @param options - Find options (including session for transactions)
   * @returns Matching document or null if not found
   */
  async findOne(
    query: Filter<Infer<T>>,
    options?: FindOptions
  ): Promise<WithId<Infer<T>> | null> {
    return await core.findOne(this.collection, query, options);
  }

  /**
   * Find a document by its MongoDB ObjectId
   * 
   * @param id - Document ID (string or ObjectId)
   * @param options - Find options (including session for transactions)
   * @returns Matching document or null if not found
   */
  async findById(
    id: string | ObjectId,
    options?: FindOptions
  ): Promise<WithId<Infer<T>> | null> {
    return await core.findById(this.collection, id, options);
  }

  /**
   * Update multiple documents matching the query
   * 
   * @param query - MongoDB query filter
   * @param data - Partial data to update
   * @param options - Update options (including session for transactions)
   * @returns Update result
   */
  async update(
    query: Filter<Infer<T>>,
    data: Partial<z.infer<T>>,
    options?: UpdateOptions
  ): Promise<UpdateResult<Infer<T>>> {
    return await core.update(this.collection, this.schema, query, data, options);
  }

  /**
   * Update a single document matching the query
   * 
   * @param query - MongoDB query filter
   * @param data - Partial data to update
   * @param options - Update options (including session for transactions)
   * @returns Update result
   */
  async updateOne(
    query: Filter<Infer<T>>,
    data: Partial<z.infer<T>>,
    options?: UpdateOptions
  ): Promise<UpdateResult<Infer<T>>> {
    return await core.updateOne(this.collection, this.schema, query, data, options);
  }

  /**
   * Replace a single document matching the query
   * 
   * @param query - MongoDB query filter
   * @param data - Complete document data for replacement
   * @param options - Replace options (including session for transactions)
   * @returns Update result
   */
  async replaceOne(
    query: Filter<Infer<T>>,
    data: Input<T>,
    options?: ReplaceOptions
  ): Promise<UpdateResult<Infer<T>>> {
    return await core.replaceOne(this.collection, this.schema, query, data, options);
  }

  /**
   * Delete multiple documents matching the query
   * 
   * @param query - MongoDB query filter
   * @param options - Delete options (including session for transactions)
   * @returns Delete result
   */
  async delete(
    query: Filter<Infer<T>>,
    options?: DeleteOptions
  ): Promise<DeleteResult> {
    return await core.deleteMany(this.collection, query, options);
  }

  /**
   * Delete a single document matching the query
   * 
   * @param query - MongoDB query filter
   * @param options - Delete options (including session for transactions)
   * @returns Delete result
   */
  async deleteOne(
    query: Filter<Infer<T>>,
    options?: DeleteOptions
  ): Promise<DeleteResult> {
    return await core.deleteOne(this.collection, query, options);
  }

  /**
   * Count documents matching the query
   * 
   * @param query - MongoDB query filter
   * @param options - Count options (including session for transactions)
   * @returns Number of matching documents
   */
  async count(
    query: Filter<Infer<T>>,
    options?: CountDocumentsOptions
  ): Promise<number> {
    return await core.count(this.collection, query, options);
  }

  /**
   * Execute an aggregation pipeline
   * 
   * @param pipeline - MongoDB aggregation pipeline
   * @param options - Aggregate options (including session for transactions)
   * @returns Array of aggregation results
   */
  async aggregate(
    pipeline: Document[],
    options?: AggregateOptions
  ): Promise<Document[]> {
    return await core.aggregate(this.collection, pipeline, options);
  }

  // ============================================================================
  // Pagination (delegated to pagination.ts)
  // ============================================================================

  /**
   * Find documents with pagination support
   * 
   * @param query - MongoDB query filter
   * @param options - Pagination options (skip, limit, sort)
   * @returns Array of matching documents
   */
  async findPaginated(
    query: Filter<Infer<T>>,
    options: { skip?: number; limit?: number; sort?: Document } = {},
  ): Promise<(WithId<Infer<T>>)[]> {
    return await pagination.findPaginated(this.collection, query, options);
  }

  // ============================================================================
  // Index Management (delegated to indexes.ts)
  // ============================================================================

  /**
   * Create a single index on the collection
   * 
   * @param keys - Index specification (e.g., { email: 1 } or { name: "text" })
   * @param options - Index creation options (unique, sparse, expireAfterSeconds, etc.)
   * @returns The name of the created index
   */
  async createIndex(
    keys: IndexSpecification,
    options?: CreateIndexesOptions,
  ): Promise<string> {
    return await indexes.createIndex(this.collection, keys, options);
  }

  /**
   * Create multiple indexes on the collection
   * 
   * @param indexes - Array of index descriptions
   * @param options - Index creation options
   * @returns Array of index names created
   */
  async createIndexes(
    indexList: IndexDescription[],
    options?: CreateIndexesOptions,
  ): Promise<string[]> {
    return await indexes.createIndexes(this.collection, indexList, options);
  }

  /**
   * Drop a single index from the collection
   * 
   * @param index - Index name or specification
   * @param options - Drop index options
   */
  async dropIndex(
    index: string | IndexSpecification,
    options?: DropIndexesOptions,
  ): Promise<void> {
    return await indexes.dropIndex(this.collection, index, options);
  }

  /**
   * Drop all indexes from the collection (except _id index)
   * 
   * @param options - Drop index options
   */
  async dropIndexes(options?: DropIndexesOptions): Promise<void> {
    return await indexes.dropIndexes(this.collection, options);
  }

  /**
   * List all indexes on the collection
   * 
   * @param options - List indexes options
   * @returns Array of index information
   */
  async listIndexes(
    options?: ListIndexesOptions,
  ): Promise<IndexDescription[]> {
    return await indexes.listIndexes(this.collection, options);
  }

  /**
   * Get index information by name
   * 
   * @param indexName - Name of the index
   * @returns Index description or null if not found
   */
  async getIndex(indexName: string): Promise<IndexDescription | null> {
    return await indexes.getIndex(this.collection, indexName);
  }

  /**
   * Check if an index exists
   * 
   * @param indexName - Name of the index
   * @returns True if index exists, false otherwise
   */
  async indexExists(indexName: string): Promise<boolean> {
    return await indexes.indexExists(this.collection, indexName);
  }

  /**
   * Synchronize indexes - create indexes if they don't exist, update if they differ
   * 
   * This is useful for ensuring indexes match your schema definition
   * 
   * @param indexes - Array of index descriptions to synchronize
   * @param options - Options for index creation
   * @returns Array of index names that were created
   */
  async syncIndexes(
    indexList: IndexDescription[],
    options?: CreateIndexesOptions,
  ): Promise<string[]> {
    return await indexes.syncIndexes(this.collection, indexList, options);
  }
}
