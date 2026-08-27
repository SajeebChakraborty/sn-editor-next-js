/**
 * Lightweight structured logging and a client-safe rate-limit stub.
 * Replace with OpenTelemetry / Redis when workers land.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogFields {
  [key: string]: unknown;
}

function emit(level: LogLevel, message: string, fields?: LogFields): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    service: 'sn-editor-web',
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (message: string, fields?: LogFields) => emit('debug', message, fields),
  info: (message: string, fields?: LogFields) => emit('info', message, fields),
  warn: (message: string, fields?: LogFields) => emit('warn', message, fields),
  error: (message: string, fields?: LogFields) => emit('error', message, fields),
};

/** In-memory sliding-window rate limiter stub (per process). */
const buckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Returns true when the caller is within the limit.
 * @param key - e.g. IP or user id
 * @param limit - max requests in the window
 * @param windowMs - window length
 */
export function rateLimit(key: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) {
    log.warn('rate_limit_exceeded', { key, limit });
    return false;
  }
  bucket.count += 1;
  return true;
}
