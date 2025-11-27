export { type InferModel, type Input } from "./schema.ts";
export { 
  connect, 
  disconnect, 
  healthCheck, 
  startSession,
  endSession,
  withTransaction,
  type ConnectOptions, 
  type HealthCheckResult 
} from "./client.ts";
export { Model } from "./model.ts";
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
