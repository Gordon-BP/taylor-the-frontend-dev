// Assuming you have a logger module and a file writing module
import logger from './logger'; // Placeholder for your logger module
import {readFiles as __rf} from  './fileTools.js'
import {writeFiles as __wf, FileData} from  './fileTools.js'; // Placeholder for your file writing module
import Task from "./Task"
import winston from 'winston';
/**
 * Wraps and runs the LLM-generated code.
 * Provides methods for reading and writing files, executing the code, and logging errors.
 */
export default class CodeWrapper {
  /** The code to run. */
  private codeString: string;
  /** Logger for the task. */
  private logger: any;
  /** The task object associated with the code. */
  private task: Task;

  /**
   * Creates a new instance of CodeWrapper.
   * @param codeString The code to be executed.
   * @param task The task object associated with the code.
   */
  constructor(codeString: string, task: Task) {
    this.codeString = codeString;
    this.task = task;
    this.logger = winston.createLogger({
      level: "debug",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.json()
      ),
      defaultMeta: { service: "vr-router" },
      transports: [
        new winston.transports.File({
          filename: `error.log`,
          level: "error",
        }),
        new winston.transports.File({
          filename: `combined.log`,
          level: "debug",
        }),
      ],
    });
    if (process.env.NODE_ENV !== "production") {
      this.logger.add(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.prettyPrint(),
            winston.format.simple()
          ),
        })
      );
    }
    // Any other initializations can go here
  }

  /**
   * Writes files to the specified location.
   * @param fileData An array of FileData objects containing the file path and data.
   * @returns A string indicating the result of the file writing operation.
   */
  writeFiles(fileData: FileData[]): string {
    console.log(`Writing file: ${JSON.stringify(fileData)}`);
    return __wf(fileData, this.task);
  }

  /**
   * Reads files from the specified location.
   * @param paths An array of file paths to be read.
   * @returns A promise that resolves to a string containing the contents of the files.
   */
  readFiles(paths: string[]): Promise<string> {
    var updatedPaths: string[] = [];
    for (let path of paths) {
      updatedPaths.push(
        `./repos/${this.task.owner}/${this.task.repo}/${this.task.branchName}/${path}`
      );
    }
    return __rf(updatedPaths, this.task.id);
  }

  /**
   * Executes the code stored in the codeString property.
   * @returns A promise that resolves to a string indicating that the code ran successfully,
   * or rejects with an error message if there is an error during code execution.
   */
  async executeCode(): Promise<string> {
    try {
      eval(this.codeString);
      return new Promise((resolve) => resolve("Code ran successfully"));
    } catch (error) {
      this.logger.error(`Error executing code: ${error}`);
      return new Promise((reject) => reject(`Error running code: ${error}`));
    }
  }
}