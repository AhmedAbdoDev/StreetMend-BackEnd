import mongoose, { ClientSession } from "mongoose";

/**
 * Execute an operation inside a MongoDB transaction if replica set transactions are supported.
 * Automatically handles:
 * - Session creation and lifecycle (startSession / endSession)
 * - Transaction lifecycle (startTransaction / commitTransaction / abortTransaction)
 * - Graceful fallback to non-transactional execution for standalone Mongo instances
 *   (e.g., local single-node mongod or mock test environments)
 */
export async function withTransaction<T>(
  operation: (session?: ClientSession) => Promise<T>,
): Promise<T> {
  // If not connected to MongoDB (e.g. mock unit tests or offline), execute without session
  if (mongoose.connection.readyState !== 1) {
    return operation(undefined);
  }

  let session: ClientSession | undefined;

  try {
    session = await mongoose.startSession();
  } catch (sessionErr) {
    // If sessions cannot be created (e.g. mock test environment), run operation without session
    return operation(undefined);
  }

  try {
    session.startTransaction();
    const result = await operation(session);
    await session.commitTransaction();
    return result;
  } catch (error: any) {
    if (session && session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch {
        // Silently catch abort error if already closed
      }
    }

    // Check if error is because standalone MongoDB does not support transactions
    const isStandaloneError =
      error?.name === "MongoServerError" &&
      typeof error?.message === "string" &&
      (error.message.includes("replica set") ||
        error.message.includes(
          "Transaction numbers are only allowed on a replica set member",
        ));

    if (isStandaloneError) {
      // Re-run operation without transaction session for standalone MongoDB compatibility
      return operation(undefined);
    }

    throw error;
  } finally {
    if (session) {
      try {
        await session.endSession();
      } catch {
        // Silently handle endSession
      }
    }
  }
}
