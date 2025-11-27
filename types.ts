import type { z } from "@zod/zod";
import type { Document, ObjectId } from "mongodb";

/**
 * Type alias for Zod schema objects
 */
export type Schema = z.ZodObject<z.ZodRawShape>;

/**
 * Infer the TypeScript type from a Zod schema, including MongoDB Document
 */
export type Infer<T extends Schema> = z.infer<T> & Document;


/**
 * Infer the model type from a Zod schema, including MongoDB Document and ObjectId
 */
export type InferModel<T extends Schema> = Infer<T> & {
    _id?: ObjectId;
  };

/**
 * Infer the input type for a Zod schema (handles defaults)
 */
export type Input<T extends Schema> = z.input<T>;