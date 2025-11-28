import type { ClientSession, TransactionOptions } from "mongodb";
import { getConnection } from "./connection.ts";
import { ConnectionError } from "../errors.ts";

/**
 * Transaction management module
 *
 * Provides session and transaction management functionality including
 * automatic transaction handling and manual session control.
 */

/**
 * Start a new client session for transactions
 *
 * Sessions must be ended when done using `endSession()`
 *
 * @returns New MongoDB ClientSession
 * @throws {ConnectionError} If not connected
 *
 * @example
 * ```ts
 * const session = startSession();
 * try {
 *   // use session
 * } finally {
 *   await endSession(session);
 * }
 * ```
 */
export function startSession(): ClientSession {
  const connection = getConnection();
  if (!connection) {
    throw new ConnectionError("MongoDB not connected. Call connect() first.");
  }
  return connection.client.startSession();
}

/**
 * End a client session
 *
 * @param session - The session to end
 */
export async function endSession(session: ClientSession): Promise<void> {
  await session.endSession();
}

/**
 * Execute a function within a transaction
 *
 * Automatically handles session creation, transaction start/commit/abort, and cleanup.
 * If the callback throws an error, the transaction is automatically aborted.
 *
 * @param callback - Async function to execute within the transaction. Receives the session as parameter.
 * @param options - Optional transaction options (read/write concern, etc.)
 * @returns The result from the callback function
 *
 * @example
 * ```ts
 * const result = await withTransaction(async (session) => {
 *   await UserModel.insertOne({ name: "Alice" }, { session });
 *   await OrderModel.insertOne({ userId: "123", total: 100 }, { session });
 *   return { success: true };
 * });
 * ```
 */
export async function withTransaction<T>(
  callback: (session: ClientSession) => Promise<T>,
  options?: TransactionOptions,
): Promise<T> {
  const session = startSession();

  try {
    let result: T;

    await session.withTransaction(async () => {
      result = await callback(session);
    }, options);

    return result!;
  } finally {
    await endSession(session);
  }
}
