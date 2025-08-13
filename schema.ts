import type { z } from "zod";
import type { ObjectId } from "mongodb";

export type InferModel<T extends z.ZodObject> = z.infer<T> & {
  _id?: ObjectId;
};

export type InsertType<T extends z.ZodObject> =
  & Omit<z.infer<T>, "createdAt">
  & { createdAt?: Date };
