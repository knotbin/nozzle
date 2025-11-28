import type { z } from "@zod/zod";
import type { Infer, Input, Schema } from "../types.ts";
import { AsyncValidationError, ValidationError } from "../errors.ts";
import type { Document, Filter, UpdateFilter } from "mongodb";

// Cache frequently reused schema transformations to avoid repeated allocations
const partialSchemaCache = new WeakMap<Schema, z.ZodTypeAny>();
const defaultsCache = new WeakMap<Schema, Record<string, unknown>>();
const updateOperators = [
  "$set",
  "$unset",
  "$inc",
  "$mul",
  "$rename",
  "$min",
  "$max",
  "$currentDate",
  "$push",
  "$pull",
  "$addToSet",
  "$pop",
  "$bit",
  "$setOnInsert",
];

function getPartialSchema(schema: Schema): z.ZodTypeAny {
  const cached = partialSchemaCache.get(schema);
  if (cached) return cached;
  const partial = schema.partial();
  partialSchemaCache.set(schema, partial);
  return partial;
}

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
 * Important: This function only validates the fields that are provided in the data object.
 * Unlike parse(), this function does NOT apply defaults for missing fields because
 * in an update context, missing fields should remain unchanged in the database.
 *
 * @param schema - Zod schema to validate against
 * @param data - Partial data to validate
 * @returns Validated and typed partial data (only fields present in input)
 * @throws {ValidationError} If validation fails
 * @throws {AsyncValidationError} If async validation is detected
 */
export function parsePartial<T extends Schema>(
  schema: T,
  data: Partial<z.infer<T>>,
): Partial<z.infer<T>> {
  if (!data || Object.keys(data).length === 0) {
    return {};
  }

  // Get the list of fields actually provided in the input
  const inputKeys = Object.keys(data);

  const result = getPartialSchema(schema).safeParse(data);

  // Check for async validation
  if (result instanceof Promise) {
    throw new AsyncValidationError();
  }

  if (!result.success) {
    throw new ValidationError(result.error.issues, "update");
  }

  // Filter the result to only include fields that were in the input
  // This prevents defaults from being applied to fields that weren't provided
  const filtered: Record<string, unknown> = {};
  for (const key of inputKeys) {
    if (key in (result.data as Record<string, unknown>)) {
      filtered[key] = (result.data as Record<string, unknown>)[key];
    }
  }

  return filtered as Partial<z.infer<T>>;
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
export function parseReplace<T extends Schema>(
  schema: T,
  data: Input<T>,
): Infer<T> {
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

/**
 * Extract default values from a Zod schema
 * This parses an empty object through the schema to get all defaults applied
 *
 * @param schema - Zod schema to extract defaults from
 * @returns Object containing all default values from the schema
 */
export function extractDefaults<T extends Schema>(
  schema: T,
): Partial<Infer<T>> {
  const cached = defaultsCache.get(schema);
  if (cached) {
    return cached as Partial<Infer<T>>;
  }

  try {
    // Make all fields optional, then parse empty object to trigger defaults
    // This allows us to see which fields get default values
    const partialSchema = getPartialSchema(schema);
    const result = partialSchema.safeParse({});

    if (result instanceof Promise) {
      // Cannot extract defaults from async schemas
      return {};
    }

    // If successful, the result contains all fields that have defaults
    // Only include fields that were actually added (have values)
    if (!result.success) {
      return {};
    }

    // Filter to only include fields that got values from defaults
    // (not undefined, which indicates no default)
    const defaults: Record<string, unknown> = {};
    const data = result.data as Record<string, unknown>;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        defaults[key] = value;
      }
    }
    defaultsCache.set(schema, defaults as Partial<Infer<Schema>>);
    return defaults as Partial<Infer<T>>;
  } catch {
    return {};
  }
}

/**
 * Get all field paths mentioned in an update filter object
 * This includes fields in $set, $unset, $inc, $push, etc.
 *
 * @param update - MongoDB update filter
 * @returns Set of field paths that are being modified
 */
function getModifiedFields(update: UpdateFilter<Document>): Set<string> {
  const fields = new Set<string>();

  for (const op of updateOperators) {
    if (update[op] && typeof update[op] === "object") {
      // Add all field names from this operator
      for (const field of Object.keys(update[op] as Document)) {
        fields.add(field);
      }
    }
  }

  return fields;
}

/**
 * Get field paths that are fixed by equality clauses in a query filter.
 * Only equality-style predicates become part of the inserted document during upsert.
 */
function getEqualityFields(filter: Filter<Document>): Set<string> {
  const fields = new Set<string>();

  const collect = (node: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith("$")) {
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item && typeof item === "object" && !Array.isArray(item)) {
              collect(item as Record<string, unknown>);
            }
          }
        } else if (value && typeof value === "object") {
          collect(value as Record<string, unknown>);
        }
        continue;
      }

      if (value && typeof value === "object" && !Array.isArray(value)) {
        const objectValue = value as Record<string, unknown>;
        const keys = Object.keys(objectValue);
        const hasOperator = keys.some((k) => k.startsWith("$"));

        if (hasOperator) {
          if (Object.prototype.hasOwnProperty.call(objectValue, "$eq")) {
            fields.add(key);
          }
        } else {
          fields.add(key);
        }
      } else {
        fields.add(key);
      }
    }
  };

  collect(filter as Record<string, unknown>);
  return fields;
}

/**
 * Apply schema defaults to an update operation using $setOnInsert
 *
 * This is used for upsert operations to ensure defaults are applied when
 * a new document is created, but not when updating an existing document.
 *
 * For each default field:
 * - If the field is NOT mentioned in any update operator ($set, $inc, etc.)
 * - If the field is NOT fixed by an equality clause in the query filter
 * - Add it to $setOnInsert so it's only applied on insert
 *
 * @param schema - Zod schema with defaults
 * @param query - MongoDB query filter
 * @param update - MongoDB update filter
 * @returns Modified update filter with defaults in $setOnInsert
 */
export function applyDefaultsForUpsert<T extends Schema>(
  schema: T,
  query: Filter<Infer<T>>,
  update: UpdateFilter<Infer<T>>,
): UpdateFilter<Infer<T>> {
  // Extract defaults from schema
  const defaults = extractDefaults(schema);

  // If no defaults, return update unchanged
  if (Object.keys(defaults).length === 0) {
    return update;
  }

  // Get fields that are already being modified
  const modifiedFields = getModifiedFields(update as UpdateFilter<Document>);
  const filterEqualityFields = getEqualityFields(query as Filter<Document>);

  // Build $setOnInsert with defaults for unmodified fields
  const setOnInsert: Partial<Infer<T>> = {};

  for (const [field, value] of Object.entries(defaults)) {
    // Only add default if field is not already being modified or fixed by filter equality
    if (!modifiedFields.has(field) && !filterEqualityFields.has(field)) {
      setOnInsert[field as keyof Infer<T>] = value as Infer<T>[keyof Infer<T>];
    }
  }

  // If there are defaults to add, merge them into $setOnInsert
  if (Object.keys(setOnInsert).length > 0) {
    return {
      ...update,
      $setOnInsert: {
        ...(update.$setOnInsert || {}),
        ...setOnInsert,
      } as Partial<Infer<T>>,
    };
  }

  return update;
}
