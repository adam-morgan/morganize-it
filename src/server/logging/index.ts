import { ConsoleLogger } from "./console-logger";
import { Logger } from "./logger";

type LogLevel = "none" | "debug" | "info" | "warn" | "error";

let logger: Logger;
let level: LogLevel;

const _getLogger = (): Logger => {
  if (!logger) {
    logger = new ConsoleLogger();
  }

  return logger;
};

const _getLevel = (): LogLevel => {
  if (!level) {
    if (process.env.NODE_ENV === "test") {
      level = (process.env.LOG_LEVEL?.toLowerCase() ?? "none") as LogLevel;
    } else {
      level = (process.env.LOG_LEVEL?.toLowerCase() ?? "debug") as LogLevel;
    }
  }

  return level;
};

const _shouldLog = (logLevel: LogLevel): boolean => {
  const configuredLevel = _getLevel();

  if (configuredLevel === "debug") {
    return true;
  } else if (configuredLevel === "info") {
    return logLevel !== "debug";
  } else if (configuredLevel === "warn") {
    return logLevel === "warn" || logLevel === "error";
  } else if (configuredLevel === "error") {
    return logLevel === "error";
  }

  return false;
};

export const debug = (message: string, error?: Error): void => {
  if (_shouldLog("debug")) {
    _getLogger().debug(message, error);
  }
};

export const info = (message: string, error?: Error): void => {
  if (_shouldLog("info")) {
    _getLogger().info(message, error);
  }
};

export const warn = (message: string, error?: Error): void => {
  if (_shouldLog("warn")) {
    _getLogger().warn(message, error);
  }
};

export const error = (message: string, error?: Error): void => {
  if (_shouldLog("error")) {
    _getLogger().error(message, error);
  }
};
