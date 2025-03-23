export interface Logger {
  debug(message: string, error?: Error): void;
  info(message: string, error?: Error): void;
  warn(message: string, error?: Error): void;
  error(message: string, error?: Error): void;
}
