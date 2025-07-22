import { z } from 'zod';
import {
  Collection,
  InsertOneResult,
  InsertManyResult,
  UpdateResult,
  DeleteResult,
  Document,
  ObjectId,
  Filter,
  OptionalUnlessRequiredId,
  WithId
} from 'mongodb';
import { getDb } from './client';
import { InsertType } from './schema';

export class MongoModel<T extends z.ZodObject<any>> {
  private collection: Collection<z.infer<T>>;
  private schema: T;

  constructor(collectionName: string, schema: T) {
    this.collection = getDb().collection<z.infer<T>>(collectionName);
    this.schema = schema;
  }

  async insertOne(data: InsertType<T>): Promise<InsertOneResult<z.infer<T>>> {
    const validatedData = this.schema.parse(data);
    return this.collection.insertOne(validatedData as OptionalUnlessRequiredId<z.infer<T>>);
  }

  async insertMany(data: InsertType<T>[]): Promise<InsertManyResult<z.infer<T>>> {
    const validatedData = data.map((item) => this.schema.parse(item));
    return this.collection.insertMany(validatedData as OptionalUnlessRequiredId<z.infer<T>>[]);
  }

  find(query: Filter<z.infer<T>>): Promise<(WithId<z.infer<T>>)[]> {
    return this.collection.find(query).toArray();
  }

  findOne(query: Filter<z.infer<T>>): Promise<WithId<z.infer<T>> | null> {
    return this.collection.findOne(query);
  }

  async findById(id: string | ObjectId): Promise<WithId<z.infer<T>> | null> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return this.findOne({ _id: objectId } as Filter<z.infer<T>>);
  }

  async update(query: Filter<z.infer<T>>, data: Partial<z.infer<T>>): Promise<UpdateResult> {
    return this.collection.updateMany(query, { $set: data });
  }

  async updateOne(query: Filter<z.infer<T>>, data: Partial<z.infer<T>>): Promise<UpdateResult> {
    return this.collection.updateOne(query, { $set: data });
  }

  async replaceOne(query: Filter<z.infer<T>>, data: InsertType<T>): Promise<UpdateResult> {
    const validatedData = this.schema.parse(data);
    return this.collection.replaceOne(query, validatedData as OptionalUnlessRequiredId<z.infer<T>>);
  }

  async delete(query: Filter<z.infer<T>>): Promise<DeleteResult> {
    return this.collection.deleteMany(query);
  }

  async deleteOne(query: Filter<z.infer<T>>): Promise<DeleteResult> {
    return this.collection.deleteOne(query);
  }

  async count(query: Filter<z.infer<T>>): Promise<number> {
    return this.collection.countDocuments(query);
  }

  async aggregate(pipeline: Document[]): Promise<any[]> {
    return this.collection.aggregate(pipeline).toArray();
  }

  // Pagination support for find
  async findPaginated(
    query: Filter<z.infer<T>>,
    options: { skip?: number; limit?: number; sort?: Document } = {}
  ): Promise<(WithId<z.infer<T>>)[]> {
    return this.collection
      .find(query)
      .skip(options.skip ?? 0)
      .limit(options.limit ?? 10)
      .sort(options.sort ?? {})
      .toArray();
  }
}

