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

export class Model<T extends StandardSchemaV1<unknown, Document>> {
  private collection: Collection<StandardSchemaV1.InferOutput<T>>;
  private schema: T;

  constructor(collectionName: string, schema: T) {
    this.collection = getDb().collection<
      StandardSchemaV1.InferOutput<T> & Document
    >(
      collectionName,
    );
    this.schema = schema;
  }

  async insertOne(
    data: StandardSchemaV1.InferInput<T>,
  ): Promise<InsertOneResult<StandardSchemaV1.InferOutput<T>>> {
    const result = this.schema["~standard"].validate(data);
    if (result instanceof Promise) {
      throw new Error("Async validation not supported");
    }
    if (result.issues) {
      throw new Error(`Validation failed: ${JSON.stringify(result.issues)}`);
    }
    return await this.collection.insertOne(
      result.value as OptionalUnlessRequiredId<StandardSchemaV1.InferOutput<T>>,
    );
  }

  async insertMany(
    data: StandardSchemaV1.InferInput<T>[],
  ): Promise<InsertManyResult<StandardSchemaV1.InferOutput<T>>> {
    const validatedData = data.map((item) => {
      const result = this.schema["~standard"].validate(item);
      if (result instanceof Promise) {
        throw new Error("Async validation not supported");
      }
      if (result.issues) {
        throw new Error(`Validation failed: ${JSON.stringify(result.issues)}`);
      }
      return result.value;
    });
    return await this.collection.insertMany(
      validatedData as OptionalUnlessRequiredId<
        StandardSchemaV1.InferOutput<T>
      >[],
    );
  }

  async find(
    query: Filter<StandardSchemaV1.InferOutput<T>>,
  ): Promise<(WithId<StandardSchemaV1.InferOutput<T>>)[]> {
    return await this.collection.find(query).toArray();
  }

  async findOne(
    query: Filter<StandardSchemaV1.InferOutput<T>>,
  ): Promise<WithId<StandardSchemaV1.InferOutput<T>> | null> {
    return await this.collection.findOne(query);
  }

  async findById(
    id: string | ObjectId,
  ): Promise<WithId<StandardSchemaV1.InferOutput<T>> | null> {
    const objectId = typeof id === "string" ? new ObjectId(id) : id;
    return await this.findOne(
      { _id: objectId } as Filter<StandardSchemaV1.InferOutput<T>>,
    );
  }

  async update(
    query: Filter<StandardSchemaV1.InferOutput<T>>,
    data: Partial<StandardSchemaV1.InferOutput<T>>,
  ): Promise<UpdateResult> {
    return await this.collection.updateMany(query, { $set: data });
  }

  async updateOne(
    query: Filter<StandardSchemaV1.InferOutput<T>>,
    data: Partial<StandardSchemaV1.InferOutput<T>>,
  ): Promise<UpdateResult> {
    return await this.collection.updateOne(query, { $set: data });
  }

  async replaceOne(
    query: Filter<StandardSchemaV1.InferOutput<T>>,
    data: StandardSchemaV1.InferInput<T>,
  ): Promise<UpdateResult> {
    const result = this.schema["~standard"].validate(data);
    if (result instanceof Promise) {
      throw new Error("Async validation not supported");
    }
    if (result.issues) {
      throw new Error(`Validation failed: ${JSON.stringify(result.issues)}`);
    }
    return await this.collection.replaceOne(
      query,
      result.value as OptionalUnlessRequiredId<StandardSchemaV1.InferOutput<T>>,
    );
  }

  async delete(
    query: Filter<StandardSchemaV1.InferOutput<T>>,
  ): Promise<DeleteResult> {
    return await this.collection.deleteMany(query);
  }

  async deleteOne(
    query: Filter<StandardSchemaV1.InferOutput<T>>,
  ): Promise<DeleteResult> {
    return await this.collection.deleteOne(query);
  }

  async count(query: Filter<StandardSchemaV1.InferOutput<T>>): Promise<number> {
    return await this.collection.countDocuments(query);
  }

  async aggregate(pipeline: Document[]): Promise<Document[]> {
    return await this.collection.aggregate(pipeline).toArray();
  }

  // Pagination support for find
  async findPaginated(
    query: Filter<StandardSchemaV1.InferOutput<T>>,
    options: { skip?: number; limit?: number; sort?: Document } = {},
  ): Promise<(WithId<StandardSchemaV1.InferOutput<T>>)[]> {
    return await this.collection
      .find(query)
      .skip(options.skip ?? 0)
      .limit(options.limit ?? 10)
      .sort(options.sort ?? {})
      .toArray();
  }
}
