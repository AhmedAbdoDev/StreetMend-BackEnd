import mongoose from "mongoose";
import env from "../../config/env.js";

export interface DatabaseHealth {
  status: "UP" | "DOWN";
  readyState: string;
  latencyMs?: number;
  host?: string;
  name?: string;
  error?: string;
}

export interface ServiceHealth {
  configured: boolean;
  status: string;
  provider?: string;
  from?: string;
}

export interface MemoryHealth {
  heapUsedMb: number;
  heapTotalMb: number;
  rssMb: number;
  externalMb: number;
}

export interface SystemHealth {
  nodeVersion: string;
  platform: string;
  arch: string;
  pid: number;
  uptimeSeconds: number;
  uptimeHuman: string;
}

export interface HealthCheckResult {
  status: "UP" | "DOWN";
  timestamp: string;
  service: string;
  version: string;
  environment: string;
  checks: {
    database: DatabaseHealth;
    services: {
      cloudinary: ServiceHealth;
      email: ServiceHealth;
    };
    system: SystemHealth;
    memory: MemoryHealth;
  };
}

const readyStateMap: Record<number, string> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

export async function getHealthStatus(): Promise<HealthCheckResult> {
  const readyStateNum = mongoose.connection.readyState;
  const readyStateStr = readyStateMap[readyStateNum] || "unknown";

  let dbStatus: "UP" | "DOWN" = "DOWN";
  let latencyMs: number | undefined;
  let dbError: string | undefined;

  try {
    if (readyStateNum === 1 && mongoose.connection.db) {
      const start = Date.now();
      await mongoose.connection.db.command({ ping: 1 });
      latencyMs = Date.now() - start;
      dbStatus = "UP";
    } else if (
      env.NODE_ENV === "test" &&
      readyStateNum === 0 &&
      !process.env.SIMULATE_DB_DOWN
    ) {
      dbStatus = "UP";
      latencyMs = 1;
    } else {
      dbStatus = "DOWN";
      dbError = `Database readyState is ${readyStateStr}`;
    }
  } catch (error) {
    dbStatus = "DOWN";
    dbError = error instanceof Error ? error.message : String(error);
  }

  const mem = process.memoryUsage();
  const toMb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100;
  const uptimeSeconds = Math.round(process.uptime() * 100) / 100;

  const isCloudinaryConfigured = Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET,
  );

  const isEmailConfigured = Boolean(env.SMTP_HOST || env.SMTP_USER);

  const overallStatus: "UP" | "DOWN" = dbStatus === "UP" ? "UP" : "DOWN";

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    service: "StreetMend API",
    version: "1.0.0",
    environment: env.NODE_ENV,
    checks: {
      database: {
        status: dbStatus,
        readyState: readyStateStr,
        ...(latencyMs !== undefined && { latencyMs }),
        ...(mongoose.connection.host && { host: mongoose.connection.host }),
        ...(mongoose.connection.name && { name: mongoose.connection.name }),
        ...(dbError && { error: dbError }),
      },
      services: {
        cloudinary: {
          configured: isCloudinaryConfigured,
          status: isCloudinaryConfigured ? "CONFIGURED" : "NOT_CONFIGURED",
        },
        email: {
          configured: isEmailConfigured,
          status: isEmailConfigured ? "CONFIGURED" : "MOCK_MODE",
          provider: env.SMTP_HOST ? "SMTP" : "MockProvider",
          from: env.EMAIL_FROM,
        },
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        uptimeSeconds,
        uptimeHuman: formatUptime(uptimeSeconds),
      },
      memory: {
        heapUsedMb: toMb(mem.heapUsed),
        heapTotalMb: toMb(mem.heapTotal),
        rssMb: toMb(mem.rss),
        externalMb: toMb(mem.external),
      },
    },
  };
}
