const mongoose = require('mongoose');

/**
 * Runs the given function inside a MongoDB transaction if supported (replica set),
 * or falls back to executing without a transaction session if running on standalone MongoDB.
 */
async function runWithTransaction(fn) {
  let session;
  try {
    session = await mongoose.startSession();
  } catch {
    return await fn(null);
  }

  try {
    let result;
    let txError = null;

    try {
      await session.withTransaction(async () => {
        result = await fn(session);
      });
      return result;
    } catch (err) {
      txError = err;
    }

    const isStandaloneError =
      txError &&
      (txError.message?.includes('Transaction numbers are only allowed') ||
       txError.message?.includes('standalone') ||
       txError.code === 20);

    if (isStandaloneError) {
      return await fn(null);
    }

    throw txError;
  } finally {
    try {
      await session.endSession();
    } catch (_) {}
  }
}

module.exports = { runWithTransaction };
