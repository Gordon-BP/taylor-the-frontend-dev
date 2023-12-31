import express from "express";
import { Request, Response } from "express";
import { gh_router } from "./routes/github_routes.js";
import { tg_router } from "./routes/task_route.js";
import bodyParser from "body-parser";
import { fs_router } from "./routes/file_routes.js";
import { cg_router } from "./routes/code_gen_route.js";
import { vr_router } from "./routes/verification_route.js";
import GithubUtils from "./utils/github_utils.js";
import { v4 as uuid } from "uuid";
import winston from "winston";
import Task, { TaskStatus } from "./utils/Task.js";
import Client from "./Client.js";

const logger = winston.createLogger({
  level: "debug",
  format: winston.format.json(),
  defaultMeta: { service: "app-router-service" },
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  );
}
class App {
  /**
   * Wrapper for the main app. Creates an express app with an endpoint to test
   * and another endpoint to clone a hard-coded repo.
   * @module App
   * @requires express
   */

  public express;
  constructor() {
    this.express = express();
    this.mountRoutes();
  }
  /**
   * Mounts routes for files, github, and others
   */
  private mountRoutes(): void {
    const appRouter = express.Router();
    /**
     * Route for app status
     * @name get/status
     * @memberof module:App
     * @inner
     */
    appRouter.get("/status", (req: Request, res: Response) => {
      logger.debug("Status OK");
      res.status(200).json({ message: "Server is alive" });
    });
    appRouter.use(bodyParser.json());
    /**
     * Rout to catch and process webhooks
     * @name post/hook
     * @memberof module:App
     * @inner
     */
    appRouter.post("/hook", (req: Request, res: Response) => {
      logger.debug("Webhook ping!");
      const github = new GithubUtils();
      const taskId = uuid();
      const { action, issue, pull_request } = req.body;
      if (issue) {
        logger.debug("New issue received");
        github.postIssueComment({ event: req.body, taskId: taskId });
      }
      if (action && action == "Start manual task") {
        logger.debug("Dev mode manual task");
        const devTask: Task = {
          status: TaskStatus.InProgress,
          pastTasks: [],
          baseIssue: 69,
          owner: "Gordon-BP",
          repo: "taylor-test-repo",
          baseBranch: "main",
          baseTaskDescription:
            "Add an index.html page that includes the repo title (Taylor-test-repo), the contributors(Taylor_JD and Gordy-BP), and tells the user to come back soon for something exciting",
          started_at: "2023-08-06:16:20:69.420",
          id: "Test__Gordon-BP/taylor-test-repo__420",
        };
        const tg = new Client(devTask);
        tg.init(devTask);
      }
      if (pull_request) {
        logger.info(`Pull request received: ${pull_request}`);
      }
      res.status(200).json({
        message: "Task begun",
      });
    });
    this.express.use(bodyParser.json());
    this.express.use("/app/v1", appRouter);
    this.express.use("/app/v1/github", gh_router);
    this.express.use("/app/v1/files", fs_router);
    this.express.use("/app/v1/task", tg_router);
    this.express.use("/app/v1/code", cg_router);
    this.express.use("/app/v1/verify", vr_router)
    this.express.use("/docs", express.static("./docs"));
  }
}
export default new App().express;
