import * as Sentry from "@sentry/nextjs";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  // Report errors to Sentry when DSN is configured
  if (level === "error" && process.env.SENTRY_DSN) {
    const err = context?.error;
    if (err instanceof Error) {
      Sentry.captureException(err, { extra: context });
    } else {
      Sentry.captureMessage(message, { level: "error", extra: context });
    }
  }

  if (process.env.NODE_ENV === "production") {
    // JSON structured output for log aggregators (Datadog, Logtail, etc.)
    process.stdout.write(JSON.stringify(entry) + "\n");
  } else {
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
    const contextStr = context ? ` ${JSON.stringify(context)}` : "";
    // eslint-disable-next-line no-console
    console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
      `${prefix} ${message}${contextStr}`
    );
  }
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => log("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => log("error", message, context),
  debug: (message: string, context?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") log("debug", message, context);
  },
};
