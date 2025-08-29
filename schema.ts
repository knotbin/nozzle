import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { ObjectId } from "mongodb";

type Schema = StandardSchemaV1<unknown, Record<string, unknown>>;
type Infer<T extends Schema> = StandardSchemaV1.InferOutput<T>;

export type InferModel<T extends Schema> = Infer<T> & {
  _id?: ObjectId;
};

export type InsertType<T extends Schema> = Omit<Infer<T>, "createdAt"> & {
  createdAt?: Date;
};
