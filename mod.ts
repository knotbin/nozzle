export type { Infer, Input, Schema } from "./types.ts";
export {
  connect,
  type ConnectOptions,
  disconnect,
  endSession,
  healthCheck,
  type HealthCheckResult,
  startSession,
  withTransaction,
} from "./client/index.ts";
export { Model } from "./model/index.ts";
export {
  AsyncValidationError,
  ConfigurationError,
  ConnectionError,
  DocumentNotFoundError,
  NozzleError,
  OperationError,
  ValidationError,
} from "./errors.ts";

// Re-export MongoDB types that users might need
export type { ClientSession, TransactionOptions } from "mongodb";
