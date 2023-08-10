// Assuming you have a logger module and a file writing module
import logger from './logger'; // Placeholder for your logger module
import {readFiles as __rf} from  './fileTools.js'
import {writeFiles as __wf, FileData} from  './fileTools.js'; // Placeholder for your file writing module
import Task from "./Task"
import winston from 'winston';

export default class CodeWrapper {
  private codeString: string;
  private logger: any;
  private task:Task

  constructor(codeString: string, task:Task) {
    this.codeString = codeString;
    this.task = task
    this.logger = winston.createLogger({
        level: "debug",
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.json(),
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
              winston.format.simple(),
            ),
          }),
        );
        }
    // Any other initializations can go here
  }
  writeFiles(fileData:FileData[]){
    console.log(`Writing file: ${JSON.stringify(fileData)}`)
    return __wf(fileData, this.task)
  }
  readFiles(paths:string[]){
    var updatedPaths:string[] = []
    for(let path of paths){
        updatedPaths.push(
            `./repos/${this.task.owner}/${this.task.repo}/${this.task.branchName}/${path}`
        )
    }
    return __rf(updatedPaths, this.task.id)
  }
  async executeCode(): Promise<string> {
    try {
        
     
     //console.log(this.codeString)
      eval(this.codeString)//.call(this);
      return new Promise(resolve=> resolve("Code ran successfully"))
    } catch (error) {
      this.logger.error(`Error executing code: ${error}`);
      return new Promise(reject=>reject(`Error running code: ${error}`))
    }
  }
}