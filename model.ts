import type { StandardSchemaV1 } from "@standard-schema/spec";
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

// Type alias for cleaner code
type Schema = StandardSchemaV1<unknown, Document>;
type Infer<T extends Schema> = StandardSchemaV1.InferOutput<T>;
type Input<T extends Schema> = StandardSchemaV1.InferInput<T>;

// Helper function to make StandardSchemaV1 validation as simple as Zod's parse()
function parse<T extends Schema>(schema: T, data: unknown): Infer<T> {
  const result = schema["~standard"].validate(data);
  if (result instanceof Promise) {
    throw new Error("Async validation not supported");
  }
  if (result.issues) {
    throw new Error(`Validation failed: ${JSON.stringify(result.issues)}`);
  }
  return result.value;
}

export class Model<T extends Schema> {
  private collection: Collection<Infer<T>>;
  private schema: T;

  constructor(collectionName: string, schema: T) {
    this.collection = getDb().collection<Infer<T> & Document>(collectionName);
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
    data: Partial<Infer<T>>,
  ): Promise<UpdateResult> {
    return await this.collection.updateMany(query, { $set: data });
  }

  async updateOne(
    query: Filter<Infer<T>>,
    data: Partial<Infer<T>>,
  ): Promise<UpdateResult> {
    return await this.collection.updateOne(query, { $set: data });
  }

  async replaceOne(
    query: Filter<Infer<T>>,
    data: Input<T>,
  ): Promise<UpdateResult> {
    const validatedData = parse(this.schema, data);
    return await this.collection.replaceOne(
      query,
      validatedData as OptionalUnlessRequiredId<Infer<T>>,
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
