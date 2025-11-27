import type { z } from "@zod/zod";

// Type for Zod validation issues
type ValidationIssue = z.ZodIssue;

/**
 * Base error class for all Nozzle errors
 */
export class NozzleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Validation error with structured issue details
 * Thrown when data fails schema validation
 */
export class ValidationError extends NozzleError {
  public readonly issues: ValidationIssue[];
  public readonly operation: "insert" | "update" | "replace";
  
  constructor(issues: ValidationIssue[], operation: "insert" | "update" | "replace") {
    const message = ValidationError.formatIssues(issues);
    super(`Validation failed on ${operation}: ${message}`);
    this.issues = issues;
    this.operation = operation;
  }

  private static formatIssues(issues: ValidationIssue[]): string {
    return issues.map(issue => {
      const path = issue.path.join('.');
      return `${path || 'root'}: ${issue.message}`;
    }).join('; ');
  }

  /**
   * Get validation errors grouped by field
   */
  public getFieldErrors(): Record<string, string[]> {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of this.issues) {
      const field = issue.path.join('.') || 'root';
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(issue.message);
    }
    return fieldErrors;
  }
}

/**
 * Connection error
 * Thrown when database connection fails or is not established
 */
export class ConnectionError extends NozzleError {
  public readonly uri?: string;
  
  constructor(message: string, uri?: string) {
    super(message);
    this.uri = uri;
  }
}

/**
 * Configuration error
 * Thrown when invalid configuration options are provided
 */
export class ConfigurationError extends NozzleError {
  public readonly option?: string;
  
  constructor(message: string, option?: string) {
    super(message);
    this.option = option;
  }
}

/**
 * Document not found error
 * Thrown when a required document is not found
 */
export class DocumentNotFoundError extends NozzleError {
  public readonly query: unknown;
  public readonly collection: string;
  
  constructor(collection: string, query: unknown) {
    super(`Document not found in collection '${collection}'`);
    this.collection = collection;
    this.query = query;
  }
}

/**
 * Operation error
 * Thrown when a database operation fails
 */
export class OperationError extends NozzleError {
  public readonly operation: string;
  public readonly collection?: string;
  public override readonly cause?: Error;
  
  constructor(operation: string, message: string, collection?: string, cause?: Error) {
    super(`${operation} operation failed: ${message}`);
    this.operation = operation;
    this.collection = collection;
    this.cause = cause;
  }
}

/**
 * Async validation not supported error
 * Thrown when async validation is attempted
 */
export class AsyncValidationError extends NozzleError {
  constructor() {
    super(
      "Async validation is not currently supported. " +
      "Please use synchronous validation schemas."
    );
  }
}
