import express from "express";
import TaskLogger from "./utils/logger.js";
import {Request, Response} from 'express'
import {gh_router} from "./routes/github_routes.js"
import bodyParser from "body-parser";
import { fs_router } from "./routes/file_routes.js";
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
    const statusRouter = express.Router()
    statusRouter.get('/', (req:Request, res:Response) =>{
      res.status(200).json({message:"Server is alive"})
    })
    this.express.use(bodyParser.json());
    this.express.use("/app/v1/status", statusRouter)
    this.express.use("/app/v1/github", gh_router);
    this.express.use("/app/v1/files", fs_router)
    this.express.use("/docs", express.static("./docs"));
  } 
} 
export default new App().express;
