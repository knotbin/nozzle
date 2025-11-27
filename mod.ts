export type { Schema, Infer, Input } from "./types.ts";
export { 
  connect, 
  disconnect, 
  healthCheck, 
  startSession,
  endSession,
  withTransaction,
  type ConnectOptions, 
  type HealthCheckResult 
} from "./client/index.ts";
export { Model } from "./model/index.ts";
export {
  NozzleError,
  ValidationError,
  ConnectionError,
  ConfigurationError,
  DocumentNotFoundError,
  OperationError,
  AsyncValidationError,
} from "./errors.ts";

// Re-export MongoDB types that users might need
export type { ClientSession, TransactionOptions } from "mongodb";
