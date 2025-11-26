import type { z } from "@zod/zod";
import type { ObjectId } from "mongodb";

type Schema = z.ZodObject;
type Infer<T extends Schema> = z.infer<T>;

export type InferModel<T extends Schema> = Infer<T> & {
  _id?: ObjectId;
};

export type Input<T extends Schema> = z.input<T>;
