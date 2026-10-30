import mongoose, { ClientSession } from "mongoose";

export async function withTransaction<T>(
  operation: (session?: ClientSession) => Promise<T>,
): Promise<T> {
  if (mongoose.connection.readyState !== 1) {
    return operation(undefined);
  }

  let session: ClientSession | undefined;

  try {
    session = await mongoose.startSession();
  } catch {
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
      } catch {}
    }

    const isStandaloneError =
      error?.name === "MongoServerError" &&
      typeof error?.message === "string" &&
      (error.message.includes("replica set") ||
        error.message.includes(
          "Transaction numbers are only allowed on a replica set member",
        ));

    if (isStandaloneError) {
      return operation(undefined);
    }

    throw error;
  } finally {
    if (session) {
      try {
        await session.endSession();
      } catch {}
    }
  }
}
