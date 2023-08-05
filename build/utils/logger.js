export var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARNING"] = "WARNING";
    LogLevel["ERROR"] = "ERROR";
})(LogLevel || (LogLevel = {}));
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
};
export default class TaskLogger {
    /**
     * Builds a new task logger
     * @param {Object} args - Named arguments
     * @param {LogLevel | string} args.logLevel - what level to log things at
     * @param {string} args.taskId - optional task uuid
     * @memberof TaskLogger
     */
    constructor({ logLevel = LogLevel.INFO, taskId, }) {
        this.logLevelPriority = {
            [LogLevel.DEBUG]: 1,
            [LogLevel.INFO]: 2,
            [LogLevel.WARNING]: 3,
            [LogLevel.ERROR]: 4,
        };
        const levels = {
            debug: LogLevel.DEBUG,
            error: LogLevel.ERROR,
            warning: LogLevel.WARNING,
            info: LogLevel.INFO,
        };
        if (typeof logLevel == "string") {
            logLevel = levels[logLevel.toUpperCase()];
        }
        else {
            this.logLevel = logLevel;
        }
        this.taskId = taskId ? taskId : null;
    }
    /**
     * Gets the log message prefix based on the log level and task ID.
     *
     * @param {LogLevel} level - The log level for the log message.
     * @returns {string} The log message prefix.
     * @private
     */
    getLogPrefix(level) {
        const timestamp = new Date().toISOString();
        const levelColors = {
            debug: '\x1b[33m',
            error: '\x1b[31m',
            info: '\x1b[32m',
            warning: '\x1b[33m', // Yellow (Use the same as debug, or choose a different orange color)
        };
        const levelColor = levelColors[level.toLowerCase()] || colors.reset;
        return `[${timestamp}] ${colors.cyan}[${this.taskId}] ${levelColor}[${level.toUpperCase()}] ${colors.reset}: `;
    }
    /**
     * Checks if the log message should be logged based on its log level and the TaskLogger's log level.
     * @param {LogLevel} level - The log level of the log message.
     * @returns {boolean} True if the log message should be logged, otherwise false.
     * @private
     */
    shouldLog(level) {
        const levelKey = level.toUpperCase();
        return this.logLevelPriority[level] >= this.logLevelPriority[levelKey];
    }
    /**
     * Logs a debug message.
     * @param {string} message - The debug message to log.
     * @example
     * const logger = new TaskLogger("debug", "my-task")
     * logger.error("Class initialized, proceeding...")
     */
    debug(message) {
        this.log(LogLevel.DEBUG, message);
    }
    /**
     * Logs an info message.
     * @param {string} message - The info message to log.
     * @example
     * const logger = new TaskLogger("my-task")
     * logger.error("Starting task...")
     */
    info(message) {
        this.log(LogLevel.INFO, message);
    }
    /**
     * Logs a warning message.
     * @param {string} message - The warning message to log.
     * @example
     * const logger = new TaskLogger(LogLevel.WARNING, "my-task")
     * logger.error("You shouldn't do that")
     */
    warning(message) {
        this.log(LogLevel.WARNING, message);
    }
    /**
     * Logs an error message.
     * @param {string} message - The error message to log.
     * @example
     * const logger = new TaskLogger(LogLevel.ERROR, "my-task")
     * logger.error("An error happened!")
     */
    error(message) {
        this.log(LogLevel.ERROR, message);
    }
    /**
     * Logs a message with the specified log level and adds the task ID if available.
     * @param {LogLevel} level - The log level of the log message.
     * @param {string} message - The log message to be displayed.
     * @private
     */
    log(level, message) {
        if (this.shouldLog(level)) {
            // eslint-disable-next-line no-console
            console.log(this.getLogPrefix(level) + message);
        }
    }
    /**
     * Creates a new TaskLogger instance for a specific task with the provided task ID.
     * @param {string} taskId - The ID of the task to associate with the logger.
     * @returns {TaskLogger} A new TaskLogger instance for the specified task ID.
     * @memberof TaskLogger
     * @example
     * const logger = new TaskLogger()
     * logger.forTask("myTask").info("Task started!")
     */
    forTask(taskId) {
        if (!taskId) {
            throw new Error("Cannot make a logger for a task without a task ID!");
        }
        else {
            return new TaskLogger({ logLevel: this.logLevel, taskId: taskId });
        }
    }
}
//# sourceMappingURL=logger.js.map