import type { z } from "@zod/zod";
import type {
  Collection,
  DeleteResult,
  Document,
  Filter,
  InsertManyResult,
  InsertOneResult,
  OptionalUnlessRequiredId,
  UpdateResult,
  WithId,
} from "mongodb";
import { ObjectId } from "mongodb";
import { getDb } from "./client.ts";

// Type alias for cleaner code - Zod schema
type Schema = z.ZodObject;
type Infer<T extends Schema> = z.infer<T> & Document;
type Input<T extends Schema> = z.input<T>;

// Helper function to validate data using Zod
function parse<T extends Schema>(schema: T, data: Input<T>): Infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Validation failed: ${JSON.stringify(result.error.issues)}`);
  }
  return result.data as Infer<T>;
}

// Helper function to validate partial update data using Zod's partial()
function parsePartial<T extends Schema>(
  schema: T,
  data: Partial<z.infer<T>>,
): Partial<z.infer<T>> {
  const result = schema.partial().safeParse(data);
  if (!result.success) {
    throw new Error(`Update validation failed: ${JSON.stringify(result.error.issues)}`);
  }
  return result.data as Partial<z.infer<T>>;
}

export class Model<T extends Schema> {
  private collection: Collection<Infer<T>>;
  private schema: T;

  constructor(collectionName: string, schema: T) {
    this.collection = getDb().collection<Infer<T>>(collectionName);
    this.schema = schema;
  }

  async insertOne(data: Input<T>): Promise<InsertOneResult<Infer<T>>> {
    const validatedData = parse(this.schema, data);
    return await this.collection.insertOne(
      validatedData as OptionalUnlessRequiredId<Infer<T>>,
    );
  }

  async insertMany(data: Input<T>[]): Promise<InsertManyResult<Infer<T>>> {
    const validatedData = data.map((item) => parse(this.schema, item));
    return await this.collection.insertMany(
      validatedData as OptionalUnlessRequiredId<Infer<T>>[],
    );
  }

  async find(query: Filter<Infer<T>>): Promise<(WithId<Infer<T>>)[]> {
    return await this.collection.find(query).toArray();
  }

  async findOne(query: Filter<Infer<T>>): Promise<WithId<Infer<T>> | null> {
    return await this.collection.findOne(query);
  }

  async findById(id: string | ObjectId): Promise<WithId<Infer<T>> | null> {
    const objectId = typeof id === "string" ? new ObjectId(id) : id;
    return await this.findOne({ _id: objectId } as Filter<Infer<T>>);
  }

  async update(
    query: Filter<Infer<T>>,
    data: Partial<z.infer<T>>,
  ): Promise<UpdateResult<Infer<T>>> {
    const validatedData = parsePartial(this.schema, data);
    return await this.collection.updateMany(query, { $set: validatedData as Partial<Infer<T>> });
  }

  async updateOne(
    query: Filter<Infer<T>>,
    data: Partial<z.infer<T>>,
  ): Promise<UpdateResult<Infer<T>>> {
    const validatedData = parsePartial(this.schema, data);
    return await this.collection.updateOne(query, { $set: validatedData as Partial<Infer<T>> });
  }

  async replaceOne(
    query: Filter<Infer<T>>,
    data: Input<T>,
  ): Promise<UpdateResult<Infer<T>>> {
    const validatedData = parse(this.schema, data);
    // Remove _id from validatedData for replaceOne (it will use the query's _id)
    const { _id, ...withoutId } = validatedData as Infer<T> & { _id?: unknown };
    return await this.collection.replaceOne(
      query,
      withoutId as Infer<T>,
    );
  }

  async delete(query: Filter<Infer<T>>): Promise<DeleteResult> {
    return await this.collection.deleteMany(query);
  }

  async deleteOne(query: Filter<Infer<T>>): Promise<DeleteResult> {
    return await this.collection.deleteOne(query);
  }

  async count(query: Filter<Infer<T>>): Promise<number> {
    return await this.collection.countDocuments(query);
  }

  async aggregate(pipeline: Document[]): Promise<Document[]> {
    return await this.collection.aggregate(pipeline).toArray();
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
}
