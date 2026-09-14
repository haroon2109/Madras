/**
 * Structured JSON-line logger for the ingestion layer.
 *
 * Every entry is a single JSON object on stdout, plus an optional daily
 * log file under `data/logs/` when `INGEST_LOG_DIR` is set (defaults to
 * `data/logs`). Logs are always parseable: one JSON object per line.
 */

import { mkdirSync, appendFileSync } from "node:fs";
import { join, resolve } from "node:path";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface Logger {
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
  /** Start a child logger with extra fields merged into every entry. */
  child(fields: Record<string, unknown>): Logger;
}

export interface LoggerOptions {
  /** Minimum level to emit. Defaults to `INGEST_LOG_LEVEL` env or "info". */
  level?: LogLevel;
  /** Directory for daily log files. Set `INGEST_LOG_DIR=""` to disable files. */
  logDir?: string;
  /** Sink for structured output; defaults to process.stdout. */
  write?: (line: string) => void;
}

function istTimestamp(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

function dateStamp(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const minLevel = options.level ?? ((process.env.INGEST_LOG_LEVEL as LogLevel | undefined) ?? "info");
  const minRank = LEVEL_ORDER[minLevel] ?? LEVEL_ORDER.info;

  const logDir =
    options.logDir !== undefined
      ? options.logDir
      : process.env.INGEST_LOG_DIR !== undefined
        ? process.env.INGEST_LOG_DIR
        : "data/logs";

  let filePath: string | null = null;
  if (logDir) {
    try {
      mkdirSync(resolve(logDir), { recursive: true });
      filePath = join(resolve(logDir), `ingest-${dateStamp()}.log`);
    } catch (e) {
      // File logging is best-effort; never let it break ingestion.
      filePath = null;
      console.error(`[logger] cannot open log dir ${logDir}:`, e);
    }
  }

  const emit = (level: LogLevel, msg: string, fields: Record<string, unknown>, base: Record<string, unknown>) => {
    if (LEVEL_ORDER[level] < minRank) return;
    const entry = {
      ts: istTimestamp(),
      level,
      msg,
      ...base,
      ...fields,
    };
    const line = JSON.stringify(entry);
    if (options.write) {
      options.write(line + "\n");
    } else {
      // info/debug -> stdout, warn/error -> stderr (still JSON, still one line each).
      const out = level === "warn" || level === "error" ? process.stderr : process.stdout;
      out.write(line + "\n");
    }
    if (filePath) {
      try {
        appendFileSync(filePath, line + "\n");
      } catch {
        /* best-effort */
      }
    }
  };

  const make = (base: Record<string, unknown>): Logger => ({
    debug: (m, f = {}) => emit("debug", m, f, base),
    info: (m, f = {}) => emit("info", m, f, base),
    warn: (m, f = {}) => emit("warn", m, f, base),
    error: (m, f = {}) => emit("error", m, f, base),
    child: (fields) => make({ ...base, ...fields }),
  });

  return make({});
}

/** Default logger shared by the ingestion modules. */
export const logger = createLogger();