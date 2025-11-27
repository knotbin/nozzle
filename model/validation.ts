import type { z } from "@zod/zod";
import type { Schema, Infer, Input } from "../types.ts";
import { ValidationError, AsyncValidationError } from "../errors.ts";

/**
 * Validate data for insert operations using Zod schema
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated and typed data
 * @throws {ValidationError} If validation fails
 * @throws {AsyncValidationError} If async validation is detected
 */
export function parse<T extends Schema>(schema: T, data: Input<T>): Infer<T> {
  const result = schema.safeParse(data);
  
  // Check for async validation
  if (result instanceof Promise) {
    throw new AsyncValidationError();
  }
  
  if (!result.success) {
    throw new ValidationError(result.error.issues, "insert");
  }
  return result.data as Infer<T>;
}

/**
 * Validate partial data for update operations using Zod schema
 * 
 * @param schema - Zod schema to validate against
 * @param data - Partial data to validate
 * @returns Validated and typed partial data
 * @throws {ValidationError} If validation fails
 * @throws {AsyncValidationError} If async validation is detected
 */
export function parsePartial<T extends Schema>(
  schema: T,
  data: Partial<z.infer<T>>,
): Partial<z.infer<T>> {
  const result = schema.partial().safeParse(data);
  
  // Check for async validation
  if (result instanceof Promise) {
    throw new AsyncValidationError();
  }
  
  if (!result.success) {
    throw new ValidationError(result.error.issues, "update");
  }
  return result.data as Partial<z.infer<T>>;
}

/**
 * Validate data for replace operations using Zod schema
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated and typed data
 * @throws {ValidationError} If validation fails
 * @throws {AsyncValidationError} If async validation is detected
 */
export function parseReplace<T extends Schema>(schema: T, data: Input<T>): Infer<T> {
  const result = schema.safeParse(data);
  
  // Check for async validation
  if (result instanceof Promise) {
    throw new AsyncValidationError();
  }
  
  if (!result.success) {
    throw new ValidationError(result.error.issues, "replace");
  }
  return result.data as Infer<T>;
}
