import { Logger } from "./logger";

export class ConsoleLogger implements Logger {
  debug(message: string, error?: Error): void {
    console.debug(message, error);
  }

  info(message: string, error?: Error): void {
    console.info(message, error);
  }

  warn(message: string, error?: Error): void {
    console.warn(message, error);
  }

  error(message: string, error?: Error): void {
    console.error(message, error);
  }
}
