import { z } from 'zod';
import { ObjectId } from 'mongodb';

export function defineModel<T extends z.ZodObject<any>>(schema: T) {
  return schema;
}

export type InferModel<T extends z.ZodObject<any>> = z.infer<T> & { _id?: ObjectId };

export type InsertType<T extends z.ZodObject<any>> = Omit<z.infer<T>, 'createdAt'> & { createdAt?: Date };


