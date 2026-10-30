import mongoose, { ClientSession } from "mongoose";
import Counter from "../models/counter.model.js";

export async function generateReportNumber(
  session?: ClientSession,
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const counterId = `issue_${currentYear}`;
  const opts = session ? { session } : {};

  const Issue = mongoose.model("Issue");

  let counter = await Counter.findById(counterId, null, opts);
  if (!counter) {
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

  let reportNumber = "";
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 20) {
    attempts++;
    const updatedCounter = await Counter.findByIdAndUpdate(
      counterId,
      { $inc: { seq: 1 } },
      { new: true, upsert: true, ...opts },
    );

    const sequentialNumber = String(updatedCounter?.seq ?? 1).padStart(5, "0");
    reportNumber = `SM-${currentYear}-${sequentialNumber}`;

    const exists = await Issue.exists({ reportNumber });
    if (!exists) {
      isUnique = true;
    }
  }

  return reportNumber;
}
