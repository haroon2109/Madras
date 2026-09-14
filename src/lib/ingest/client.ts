/**
 * Open-Meteo HTTP client for the ingestion layer.
 *
 * Responsibilities:
 *  - Timeout every request (default 20s) via AbortSignal.
 *  - Retry transient failures (network errors, timeouts, HTTP 429/5xx)
 *    with exponential backoff and jitter (default 3 attempts).
 *  - Surface failures as typed results so callers can degrade gracefully
 *    instead of crashing an entire ingestion run.
 */

import { OPEN_METEO_MODELS, WeatherModelId } from "./types";
import { createLogger, type Logger } from "./logger";

export const DEFAULT_BASE_URL = "https://api.open-meteo.com/v1/forecast";

export interface FetchOptions {
  timeoutMs?: number;
  maxAttempts?: number;
  /** Base delay (ms) before the first retry; doubles per attempt, jittered. */
  backoffBaseMs?: number;
  /** When false, only JSON bodies are accepted; otherwise text is returned raw. */
  acceptText?: boolean;
}

export interface FetchResult {
  ok: boolean;
  status: number | null;
  /** Parsed JSON body when ok (or when the server returned a JSON error). */
  data: unknown | null;
  /** Raw body text when not JSON (or when acceptText is set). */
  text: string | null;
  attempts: number;
  error?: string;
}

export interface FetchOptionsWithLogger extends FetchOptions {
  logger?: Logger;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 0..1 uniform jitter so concurrent retries don't stampede the API. */
function jitter(): number {
  return Math.random();
}

/**
 * GET an Open-Meteo endpoint with timeout + retry.
 * Throws only for non-retryable caller bugs; API/network failures are
 * returned as a `FetchResult` with `ok: false` and a message.
 */
export async function fetchOpenMeteo(
  url: string,
  options: FetchOptionsWithLogger = {}
): Promise<FetchResult> {
  const log = options.logger ?? createLogger();
  const timeoutMs = options.timeoutMs ?? 20_000;
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const backoffBaseMs = options.backoffBaseMs ?? 1_000;

  let lastError = "";
  let lastStatus: number | null = null;
  let lastBody: string | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
      const text = await res.text();
      lastStatus = res.status;
      lastBody = text;

      if (res.ok) {
        try {
          return { ok: true, status: res.status, data: JSON.parse(text), text, attempts: attempt };
        } catch {
          if (options.acceptText) {
            return { ok: true, status: res.status, data: null, text, attempts: attempt };
          }
          throw new Error(`Open-Meteo returned non-JSON body (status ${res.status})`);
        }
      }

      // Retry only transient server/rate-limit errors; 4xx client errors are final.
      const retriable = res.status === 429 || res.status >= 500;
      lastError = `HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`;
      if (!retriable) {
        return { ok: false, status: res.status, data: null, text, attempts: attempt, error: lastError };
      }
    } catch (e) {
      const aborted = (e as Error)?.name === "AbortError" || (e as Error)?.name === "TimeoutError";
      lastError = aborted
        ? `timeout after ${timeoutMs}ms`
        : `network error: ${(e as Error)?.message ?? String(e)}`;
      if (attempt >= maxAttempts) break;
    } finally {
      clearTimeout(timer);
    }

    if (attempt < maxAttempts) {
      const delay = Math.min(30_000, backoffBaseMs * 2 ** (attempt - 1)) * (0.5 + jitter() * 0.5);
      log.warn("open-meteo request failed, retrying", {
        attempt,
        maxAttempts,
        retryInMs: Math.round(delay),
        error: lastError,
        url: redactUrl(url),
      });
      await sleep(delay);
    }
  }

  return {
    ok: false,
    status: lastStatus,
    data: null,
    text: lastBody,
    attempts: maxAttempts,
    error: lastError || "request failed",
  };
}

/** Strip query params from URLs before logging so API keys never leak. */
function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    u.search = "";
    return u.toString();
  } catch {
    return url.split("?")[0] ?? url;
  }
}

export interface ForecastQuery {
  latitude: number;
  longitude: number;
  model: WeatherModelId;
  hourly: string;
  timezone?: string;
  forecastDays?: number;
  pastDays?: number;
  extraParams?: Record<string, string>;
}

/** Build the Open-Meteo forecast URL for a model + zone. */
export function buildForecastUrl(baseUrl: string, q: ForecastQuery): string {
  const params = new URLSearchParams({
    latitude: String(q.latitude),
    longitude: String(q.longitude),
    hourly: q.hourly,
    timezone: q.timezone ?? "Asia/Kolkata",
    models: OPEN_METEO_MODELS[q.model],
  });
  if (q.forecastDays !== undefined) params.set("forecast_days", String(q.forecastDays));
  if (q.pastDays !== undefined) params.set("past_days", String(q.pastDays));
  for (const [k, v] of Object.entries(q.extraParams ?? {})) params.set(k, v);
  return `${baseUrl}?${params.toString()}`;
}

export { OPEN_METEO_MODELS };
export type { WeatherModelId };