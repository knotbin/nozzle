import type { z } from "zod";
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
import type { InsertType } from "./schema.ts";

export class Model<T extends z.ZodObject> {
  private collection: Collection<z.infer<T>>;
  private schema: T;

  constructor(collectionName: string, schema: T) {
    this.collection = getDb().collection<z.infer<T>>(collectionName);
    this.schema = schema;
  }

  async insertOne(data: InsertType<T>): Promise<InsertOneResult<z.infer<T>>> {
    const validatedData = this.schema.parse(data);
    return await this.collection.insertOne(
      validatedData as OptionalUnlessRequiredId<z.infer<T>>,
    );
  }

  async insertMany(
    data: InsertType<T>[],
  ): Promise<InsertManyResult<z.infer<T>>> {
    const validatedData = data.map((item) => this.schema.parse(item));
    return await this.collection.insertMany(
      validatedData as OptionalUnlessRequiredId<z.infer<T>>[],
    );
  }

  async find(query: Filter<z.infer<T>>): Promise<(WithId<z.infer<T>>)[]> {
    return await this.collection.find(query).toArray();
  }

  async findOne(query: Filter<z.infer<T>>): Promise<WithId<z.infer<T>> | null> {
    return await this.collection.findOne(query);
  }

  async findById(id: string | ObjectId): Promise<WithId<z.infer<T>> | null> {
    const objectId = typeof id === "string" ? new ObjectId(id) : id;
    return await this.findOne({ _id: objectId } as Filter<z.infer<T>>);
  }

  async update(
    query: Filter<z.infer<T>>,
    data: Partial<z.infer<T>>,
  ): Promise<UpdateResult> {
    return await this.collection.updateMany(query, { $set: data });
  }

  async updateOne(
    query: Filter<z.infer<T>>,
    data: Partial<z.infer<T>>,
  ): Promise<UpdateResult> {
    return await this.collection.updateOne(query, { $set: data });
  }

  async replaceOne(
    query: Filter<z.infer<T>>,
    data: InsertType<T>,
  ): Promise<UpdateResult> {
    const validatedData = this.schema.parse(data);
    return await this.collection.replaceOne(
      query,
      validatedData as OptionalUnlessRequiredId<z.infer<T>>,
    );
  }

  async delete(query: Filter<z.infer<T>>): Promise<DeleteResult> {
    return await this.collection.deleteMany(query);
  }

  async deleteOne(query: Filter<z.infer<T>>): Promise<DeleteResult> {
    return await this.collection.deleteOne(query);
  }

  async count(query: Filter<z.infer<T>>): Promise<number> {
    return await this.collection.countDocuments(query);
  }

  async aggregate(pipeline: Document[]): Promise<Document[]> {
    return await this.collection.aggregate(pipeline).toArray();
  }

  // Pagination support for find
  async findPaginated(
    query: Filter<z.infer<T>>,
    options: { skip?: number; limit?: number; sort?: Document } = {},
  ): Promise<(WithId<z.infer<T>>)[]> {
    return await this.collection
      .find(query)
      .skip(options.skip ?? 0)
      .limit(options.limit ?? 10)
      .sort(options.sort ?? {})
      .toArray();
  }
}
