import express from "express";
import TaskLogger from "./utils/logger.js";
import {Request, Response} from 'express'
import {gh_router} from "./routes/github_routes.js"
import bodyParser from "body-parser";
import { fs_router } from "./routes/file_routes.js";
import GithubUtils from "./utils/github_utils.js";
import {v4 as uuid} from 'uuid'
import winston from "winston";
import TaskGenerator from "./agents/task_gen.js";
import Task, { TaskStatus } from "./utils/Task.js";

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.json(),
  defaultMeta: { service: 'app-router-service' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
class App {
  public express;
  /**
   * Wrapper for the main app. Creates an express app with an endpoint to test
   * and another endpoint to clone a hard-coded repo.
   * @module App
   * @namespace mainRouter
   */
  constructor() {
    this.express = express();
    this.mountRoutes();
  }

  private mountRoutes(): void {
    const appRouter = express.Router()
    appRouter.get('/status', (req:Request, res:Response) =>{
      logger.debug("Status OK")
      res.status(200).json({message:"Server is alive"})
    })
    appRouter.use(bodyParser.json())
    appRouter.post("/hook", (req:Request, res:Response)=>{
      logger.debug("Webhook ping!")
      const github = new GithubUtils()
      const taskId = uuid()
      let {action, issue, pull_request} = req.body
      if(issue){
        logger.debug("New issue received")
        github.postIssueComment({event:req.body, taskId:taskId})
      }
      if(action && action == "Start manual task"){
        logger.debug("Dev mode manual task")
        const devTask:Task={
          status: TaskStatus.Pending,
          pastTasks: [],
          baseIssue:69,
          owner:"Gordon-BP",
          repo:"taylor-test-repo",
          baseBranch:"main",
          description:"Modify README.MD - The readme.md should contain the names of the contributors: Gordon-BP and Taylor the AI junior dev",
          started_at: "2023-08-06:16:20:69.420",
          id: "Test__Gordon-BP/taylor-test-repo__420",
        }
        let tg = new TaskGenerator(devTask)
      }
      res.status(200).json({
        message:"Task begun"
      })
    })
    this.express.use(bodyParser.json());
    this.express.use("/app/v1", appRouter)
    this.express.use("/app/v1/github", gh_router);
    this.express.use("/app/v1/files", fs_router)
    this.express.use("/docs", express.static("./docs"));
  } 
} 
export default new App().express;
