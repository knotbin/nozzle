import { getConnection } from "./connection.ts";

/**
 * Health check module
 *
 * Provides functionality for monitoring MongoDB connection health
 * including ping operations and response time measurement.
 */

/**
 * Health check details of the MongoDB connection
 *
 * @property healthy - Overall health status of the connection
 * @property connected - Whether a connection is established
 * @property responseTimeMs - Response time in milliseconds (if connection is healthy)
 * @property error - Error message if health check failed
 * @property timestamp - Timestamp when health check was performed
 */
export interface HealthCheckResult {
  healthy: boolean;
  connected: boolean;
  responseTimeMs?: number;
  error?: string;
  timestamp: Date;
}

/**
 * Check the health of the MongoDB connection
 *
 * Performs a ping operation to verify the database is responsive
 * and returns detailed health information including response time.
 *
 * @returns Health check result with status and metrics
 *
 * @example
 * ```ts
 * const health = await healthCheck();
 * if (health.healthy) {
 *   console.log(`Database healthy (${health.responseTimeMs}ms)`);
 * } else {
 *   console.error(`Database unhealthy: ${health.error}`);
 * }
 * ```
 */
export async function healthCheck(): Promise<HealthCheckResult> {
  const timestamp = new Date();
  const connection = getConnection();

  // Check if connection exists
  if (!connection) {
    return {
      healthy: false,
      connected: false,
      error: "No active connection. Call connect() first.",
      timestamp,
    };
  }

  try {
    // Measure ping response time
    const startTime = performance.now();
    await connection.db.admin().ping();
    const endTime = performance.now();
    const responseTimeMs = Math.round(endTime - startTime);

    return {
      healthy: true,
      connected: true,
      responseTimeMs,
      timestamp,
    };
  } catch (error) {
    return {
      healthy: false,
      connected: true,
      error: error instanceof Error ? error.message : String(error),
      timestamp,
    };
  }
}
