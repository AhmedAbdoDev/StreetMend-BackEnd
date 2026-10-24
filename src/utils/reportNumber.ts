import mongoose, { ClientSession } from "mongoose";
import Counter from "../models/counter.model.js";

export async function generateReportNumber(
  session?: ClientSession,
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const counterId = `issue_${currentYear}`;
  const opts = session ? { session } : {};

  let counter = await Counter.findById(counterId, null, opts);
  if (!counter) {
    const Issue = mongoose.model("Issue");
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear + 1, 0, 1);
    const existingCount = await Issue.countDocuments(
      { createdAt: { $gte: startOfYear, $lt: endOfYear } },
      opts,
    );
    counter = await Counter.findByIdAndUpdate(
      counterId,
      { $setOnInsert: { seq: existingCount } },
      { new: true, upsert: true, ...opts },
    );
  }

  const updatedCounter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, ...opts },
  );

  const sequentialNumber = String(updatedCounter?.seq ?? 1).padStart(5, "0");
  return `SM-${currentYear}-${sequentialNumber}`;
}
