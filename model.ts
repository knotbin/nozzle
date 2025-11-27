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
  OptionalUnlessRequiredId,
  UpdateResult,
  WithId,
  BulkWriteOptions,
} from "mongodb";
import { ObjectId } from "mongodb";
import { getDb } from "./client.ts";
import { ValidationError, AsyncValidationError } from "./errors.ts";

// Type alias for cleaner code - Zod schema
type Schema = z.ZodObject;
type Infer<T extends Schema> = z.infer<T> & Document;
type Input<T extends Schema> = z.input<T>;

// Helper function to validate data using Zod
function parse<T extends Schema>(schema: T, data: Input<T>): Infer<T> {
  const result = schema.safeParse(data);
  
  // Check for async validation
  if (result instanceof Promise) {
    throw new AsyncValidationError();
  }
  
  if (!result.success) {
    throw new ValidationError(result.error.issues, "insert");
  }
  return result.data as Infer<T>;
}

// Helper function to validate partial update data using Zod's partial()
function parsePartial<T extends Schema>(
  schema: T,
  data: Partial<z.infer<T>>,
): Partial<z.infer<T>> {
  const result = schema.partial().safeParse(data);
  
  // Check for async validation
  if (result instanceof Promise) {
    throw new AsyncValidationError();
  }
  
  if (!result.success) {
    throw new ValidationError(result.error.issues, "update");
  }
  return result.data as Partial<z.infer<T>>;
}

// Helper function to validate replace data using Zod
function parseReplace<T extends Schema>(schema: T, data: Input<T>): Infer<T> {
  const result = schema.safeParse(data);
  
  // Check for async validation
  if (result instanceof Promise) {
    throw new AsyncValidationError();
  }
  
  if (!result.success) {
    throw new ValidationError(result.error.issues, "replace");
  }
  return result.data as Infer<T>;
}

export class Model<T extends Schema> {
  private collection: Collection<Infer<T>>;
  private schema: T;

  constructor(collectionName: string, schema: T) {
    this.collection = getDb().collection<Infer<T>>(collectionName);
    this.schema = schema;
  }

  async insertOne(
    data: Input<T>,
    options?: InsertOneOptions
  ): Promise<InsertOneResult<Infer<T>>> {
    const validatedData = parse(this.schema, data);
    return await this.collection.insertOne(
      validatedData as OptionalUnlessRequiredId<Infer<T>>,
      options
    );
  }

  async insertMany(
    data: Input<T>[],
    options?: BulkWriteOptions
  ): Promise<InsertManyResult<Infer<T>>> {
    const validatedData = data.map((item) => parse(this.schema, item));
    return await this.collection.insertMany(
      validatedData as OptionalUnlessRequiredId<Infer<T>>[],
      options
    );
  }

  async find(
    query: Filter<Infer<T>>,
    options?: FindOptions
  ): Promise<(WithId<Infer<T>>)[]> {
    return await this.collection.find(query, options).toArray();
  }

  async findOne(
    query: Filter<Infer<T>>,
    options?: FindOptions
  ): Promise<WithId<Infer<T>> | null> {
    return await this.collection.findOne(query, options);
  }

  async findById(
    id: string | ObjectId,
    options?: FindOptions
  ): Promise<WithId<Infer<T>> | null> {
    const objectId = typeof id === "string" ? new ObjectId(id) : id;
    return await this.findOne({ _id: objectId } as Filter<Infer<T>>, options);
  }

  async update(
    query: Filter<Infer<T>>,
    data: Partial<z.infer<T>>,
    options?: UpdateOptions
  ): Promise<UpdateResult<Infer<T>>> {
    const validatedData = parsePartial(this.schema, data);
    return await this.collection.updateMany(
      query, 
      { $set: validatedData as Partial<Infer<T>> },
      options
    );
  }

  async updateOne(
    query: Filter<Infer<T>>,
    data: Partial<z.infer<T>>,
    options?: UpdateOptions
  ): Promise<UpdateResult<Infer<T>>> {
    const validatedData = parsePartial(this.schema, data);
    return await this.collection.updateOne(
      query, 
      { $set: validatedData as Partial<Infer<T>> },
      options
    );
  }

  async replaceOne(
    query: Filter<Infer<T>>,
    data: Input<T>,
    options?: ReplaceOptions
  ): Promise<UpdateResult<Infer<T>>> {
    const validatedData = parseReplace(this.schema, data);
    // Remove _id from validatedData for replaceOne (it will use the query's _id)
    const { _id, ...withoutId } = validatedData as Infer<T> & { _id?: unknown };
    return await this.collection.replaceOne(
      query,
      withoutId as Infer<T>,
      options
    );
  }

  async delete(
    query: Filter<Infer<T>>,
    options?: DeleteOptions
  ): Promise<DeleteResult> {
    return await this.collection.deleteMany(query, options);
  }

  async deleteOne(
    query: Filter<Infer<T>>,
    options?: DeleteOptions
  ): Promise<DeleteResult> {
    return await this.collection.deleteOne(query, options);
  }

  async count(
    query: Filter<Infer<T>>,
    options?: CountDocumentsOptions
  ): Promise<number> {
    return await this.collection.countDocuments(query, options);
  }

  async aggregate(
    pipeline: Document[],
    options?: AggregateOptions
  ): Promise<Document[]> {
    return await this.collection.aggregate(pipeline, options).toArray();
  }

  // Pagination support for find
  async findPaginated(
    query: Filter<Infer<T>>,
    options: { skip?: number; limit?: number; sort?: Document } = {},
  ): Promise<(WithId<Infer<T>>)[]> {
    return await this.collection
      .find(query)
      .skip(options.skip ?? 0)
      .limit(options.limit ?? 10)
      .sort(options.sort ?? {})
      .toArray();
  }

  // Index Management Methods

  /**
   * Create a single index on the collection
   * @param keys - Index specification (e.g., { email: 1 } or { name: "text" })
   * @param options - Index creation options (unique, sparse, expireAfterSeconds, etc.)
   * @returns The name of the created index
   */
  async createIndex(
    keys: IndexSpecification,
    options?: CreateIndexesOptions,
  ): Promise<string> {
    return await this.collection.createIndex(keys, options);
  }

  /**
   * Create multiple indexes on the collection
   * @param indexes - Array of index descriptions
   * @param options - Index creation options
   * @returns Array of index names created
   */
  async createIndexes(
    indexes: IndexDescription[],
    options?: CreateIndexesOptions,
  ): Promise<string[]> {
    return await this.collection.createIndexes(indexes, options);
  }

  /**
   * Drop a single index from the collection
   * @param index - Index name or specification
   * @param options - Drop index options
   */
  async dropIndex(
    index: string | IndexSpecification,
    options?: DropIndexesOptions,
  ): Promise<void> {
    // MongoDB driver accepts string or IndexSpecification
    await this.collection.dropIndex(index as string, options);
  }

  /**
   * Drop all indexes from the collection (except _id index)
   * @param options - Drop index options
   */
  async dropIndexes(options?: DropIndexesOptions): Promise<void> {
    await this.collection.dropIndexes(options);
  }

  /**
   * List all indexes on the collection
   * @param options - List indexes options
   * @returns Array of index information
   */
  async listIndexes(
    options?: ListIndexesOptions,
  ): Promise<IndexDescription[]> {
    const indexes = await this.collection.listIndexes(options).toArray();
    return indexes as IndexDescription[];
  }

  /**
   * Get index information by name
   * @param indexName - Name of the index
   * @returns Index description or null if not found
   */
  async getIndex(indexName: string): Promise<IndexDescription | null> {
    const indexes = await this.listIndexes();
    return indexes.find((idx) => idx.name === indexName) || null;
  }

  /**
   * Check if an index exists
   * @param indexName - Name of the index
   * @returns True if index exists, false otherwise
   */
  async indexExists(indexName: string): Promise<boolean> {
    const index = await this.getIndex(indexName);
    return index !== null;
  }

  /**
   * Synchronize indexes - create indexes if they don't exist, update if they differ
   * This is useful for ensuring indexes match your schema definition
   * @param indexes - Array of index descriptions to synchronize
   * @param options - Options for index creation
   */
  async syncIndexes(
    indexes: IndexDescription[],
    options?: CreateIndexesOptions,
  ): Promise<string[]> {
    const existingIndexes = await this.listIndexes();

    const indexesToCreate: IndexDescription[] = [];

    for (const index of indexes) {
      const indexName = index.name || this._generateIndexName(index.key);
      const existingIndex = existingIndexes.find(
        (idx) => idx.name === indexName,
      );

      if (!existingIndex) {
        indexesToCreate.push(index);
      } else if (
        JSON.stringify(existingIndex.key) !== JSON.stringify(index.key)
      ) {
        // Index exists but keys differ - drop and recreate
        await this.dropIndex(indexName);
        indexesToCreate.push(index);
      }
      // If index exists and matches, skip it
    }

    const created: string[] = [];
    if (indexesToCreate.length > 0) {
      const names = await this.createIndexes(indexesToCreate, options);
      created.push(...names);
    }

    return created;
  }

  /**
   * Helper method to generate index name from key specification
   */
  private _generateIndexName(keys: IndexSpecification): string {
    if (typeof keys === "string") {
      return keys;
    }
    const entries = Object.entries(keys as Record<string, number | string>);
    return entries.map(([field, direction]) => `${field}_${direction}`).join("_");
  }
}
