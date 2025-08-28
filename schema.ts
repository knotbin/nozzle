import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { ObjectId } from "mongodb";

export type InferModel<
  T extends StandardSchemaV1<unknown, Record<string, unknown>>,
> =
  & StandardSchemaV1.InferOutput<T>
  & {
    _id?: ObjectId;
  };

export type InsertType<
  T extends StandardSchemaV1<unknown, Record<string, unknown>>,
> =
  & Omit<StandardSchemaV1.InferOutput<T>, "createdAt">
  & { createdAt?: Date };
