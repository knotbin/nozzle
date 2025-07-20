import { z } from 'zod';
import { Collection, InsertOneResult, UpdateResult, DeleteResult, Document, ObjectId, Filter } from 'mongodb';
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
    return this.collection.insertOne(validatedData as any);
  }

  find(query: Filter<z.infer<T>>): Promise<(z.infer<T> & { _id: ObjectId })[]> {
    return this.collection.find(query).toArray() as Promise<(z.infer<T> & { _id: ObjectId })[]>;
  }

  findOne(query: Filter<z.infer<T>>): Promise<(z.infer<T> & { _id: ObjectId }) | null> {
    return this.collection.findOne(query) as Promise<(z.infer<T> & { _id: ObjectId }) | null>;
  }

  async update(query: Filter<z.infer<T>>, data: Partial<z.infer<T>>): Promise<UpdateResult> {
    return this.collection.updateMany(query, { $set: data });
  }

  delete(query: Filter<z.infer<T>>): Promise<DeleteResult> {
    return this.collection.deleteMany(query);
  }
}


