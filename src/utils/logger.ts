/**
 * The log levels supported by the TaskLogger.
 */
export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARNING = "WARNING",
  ERROR = "ERROR",
}
const levels: { [key: string]: LogLevel } = {
  debug: LogLevel.DEBUG,
  error: LogLevel.ERROR,
  warning: LogLevel.WARNING,
  info: LogLevel.INFO,
};

/**
 * Custom logger for tasks with different log levels.
 */
export default class TaskLogger {
  private logLevel!: LogLevel | string;
  private taskId!: string | null;

  /**
   * Creates a new TaskLogger instance with the specified log level and task ID.
   * @param {LogLevel | string} logLevel - The minimum log level to display.
   * @param {string | null} taskId - The ID of the task to associate with the logger (optional).
   * @example
   * const logger = new TaskLogger(LogLevel.DEBUG, "my-task")
   * logger.info("Starting Task...")
   */
  constructor({
    logLevel = LogLevel.INFO,
    taskId = null,
  }: {
    logLevel: LogLevel | string;
    taskId: string | null;
  }) {
    if (typeof logLevel == "string") {
      logLevel = levels[logLevel.toUpperCase()];
    } else {
      this.logLevel = logLevel;
      this.taskId = taskId;
    }
  }

  private logLevelPriority: { [level in LogLevel]: number } = {
    [LogLevel.DEBUG]: 1,
    [LogLevel.INFO]: 2,
    [LogLevel.WARNING]: 3,
    [LogLevel.ERROR]: 4,
  };

  /**
   * Gets the log message prefix based on the log level and task ID.
   * @param {LogLevel} level - The log level for the log message.
   * @returns {string} The log message prefix.
   * @private
   */
  private getLogPrefix(level: LogLevel): string {
    const timestamp = new Date().toISOString();
    const taskInfo = this.taskId ? ` [Task ID: ${this.taskId}]` : "";
    return `[${timestamp}] [${level.toUpperCase()}]${taskInfo}: `;
  }

  /**
   * Checks if the log message should be logged based on its log level and the TaskLogger's log level.
   * @param {LogLevel} level - The log level of the log message.
   * @returns {boolean} True if the log message should be logged, otherwise false.
   * @private
   */
  private shouldLog(level: LogLevel): boolean {
    const levelKey: keyof typeof LogLevel =
      level.toUpperCase() as keyof typeof LogLevel;
    return this.logLevelPriority[level] >= this.logLevelPriority[levelKey];
  }

  /**
   * Logs a debug message.
   * @param {string} message - The debug message to log.
   * @example
   * const logger = new TaskLogger("debug", "my-task")
   * logger.error("Class initialized, proceeding...")
   */
  public debug(message: string): void {
    this.log(LogLevel.DEBUG, message);
  }

  /**
   * Logs an info message.
   * @param {string} message - The info message to log.
   * @example
   * const logger = new TaskLogger("my-task")
   * logger.error("Starting task...")
   */
  public info(message: string): void {
    this.log(LogLevel.INFO, message);
  }

  /**
   * Logs a warning message.
   * @param {string} message - The warning message to log.
   * @example
   * const logger = new TaskLogger(LogLevel.WARNING, "my-task")
   * logger.error("You shouldn't do that")
   */
  public warning(message: string): void {
    this.log(LogLevel.WARNING, message);
  }

  /**
   * Logs an error message.
   * @param {string} message - The error message to log.
   * @example
   * const logger = new TaskLogger(LogLevel.ERROR, "my-task")
   * logger.error("An error happened!")
   */
  public error(message: string): void {
    this.log(LogLevel.ERROR, message);
  }

  /**
   * Logs a message with the specified log level and adds the task ID if available.
   * @param {LogLevel} level - The log level of the log message.
   * @param {string} message - The log message to be displayed.
   * @private
   */
  private log(level: LogLevel, message: string): void {
    if (this.shouldLog(level)) {
      // eslint-disable-next-line no-console
      console.log(this.getLogPrefix(level) + message);
    }
  }

  /**
   * Creates a new TaskLogger instance for a specific task with the provided task ID.
   * @param {string} taskId - The ID of the task to associate with the logger.
   * @returns {TaskLogger} A new TaskLogger instance for the specified task ID.
   * @example
   * const logger = new TaskLogger()
   * logger.forTask("myTask").info("Task started!")
   */
  public forTask(taskId: string): TaskLogger {
    if (!taskId) {
      throw new Error("Cannot make a logger for a task without a task ID!");
    } else {
      return new TaskLogger({ logLevel: this.logLevel, taskId: taskId });
    }
  }
}
