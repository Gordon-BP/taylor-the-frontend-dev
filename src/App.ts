import express from "express";
import TaskLogger from "./utils/logger.js";
import {Request, Response} from 'express'
import {gh_router} from "./routes/github_routes.js"
import bodyParser from "body-parser";
import { fs_router } from "./routes/file_routes.js";
import GithubUtils from "./utils/github_utils.js";
import {v4 as uuid} from 'uuid'
const logger = new TaskLogger({ logLevel: "info", taskId: null });

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
      res.status(200).json({message:"Server is alive"})
    })
    appRouter.use(bodyParser.json())
    appRouter.post("/hook", (req:Request, res:Response)=>{
      const github = new GithubUtils()
      const taskId = uuid()
      console.log("hooooooooooooooook")
      let {action, issue, pull_request} = req.body
      if(issue){
        github.postIssueComment({event:req.body, taskId:taskId})
      }
      res.status(200).end()
    })

    this.express.use(bodyParser.json());
    this.express.use("/app/v1", appRouter)
    this.express.use("/app/v1/github", gh_router);
    this.express.use("/app/v1/files", fs_router)
    this.express.use("/docs", express.static("./docs"));
  } 
} 
export default new App().express;
