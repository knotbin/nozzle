/**
 * Client module - MongoDB connection and session management
 * 
 * This module provides all client-level functionality including:
 * - Connection management (connect, disconnect)
 * - Health monitoring (healthCheck)
 * - Transaction support (startSession, endSession, withTransaction)
 */

// Re-export connection management
export {
  connect,
  disconnect,
  getDb,
  type ConnectOptions,
  type Connection,
} from "./connection.ts";

// Re-export health monitoring
export {
  healthCheck,
  type HealthCheckResult,
} from "./health.ts";

// Re-export transaction management
export {
  startSession,
  endSession,
  withTransaction,
} from "./transactions.ts";
