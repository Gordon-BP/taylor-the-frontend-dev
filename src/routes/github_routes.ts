import { Request, Response } from "express";
import express from "express";
import GithubUtils from "../utils/github_utils.js";
import * as v from "../utils/validators.js";
import winston from "winston";
import bodyParser from "body-parser";
import path from "node:path";
import Task from "../utils/Task.js";
/**
 * Github routes!
 * @module gh_api
 */
export const gh_router = express.Router();
gh_router.use(bodyParser.json());
const logger = winston.createLogger({
  level: "debug",
  format: winston.format.json(),
  defaultMeta: { service: "github-service" },
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
/**
 * Status route / smoke signal
 * @name get/status
 * @function
 * @memberof module:gh_api
 * @inner
 */
gh_router.get("/status", (req: Request, res: Response) => {
  logger.debug("Status OK");
  res.json({
    message: "OK",
  });
});
/**
 * Clones a Github repo to the bot's directory
 * @name post/clone
 * @function
 * @memberof module:gh_api
 * @inner
 * @param {Task} task - the task object
 */
gh_router.post(
  "/clone",
  v.validateTask,
  v.validateTaskId,
  async (req: Request, res: Response) => {
    const { owner, repo, baseBranch } = req.body.task;
    const github = new GithubUtils();
    const p = path.join("./repos", owner, repo, baseBranch);
    logger.debug(`Cloning Repo ${owner}/${repo}`);
    await github
      .cloneRepo({
        owner: owner,
        repo: repo,
        baseBranch: baseBranch,
      })
      .then((success) => {
        if (success == true) {
          logger.debug(`Successfully cloned branch ${baseBranch} to ${p}`);
          res.status(200).json({
            message: `Successfully cloned branch ${baseBranch} to ${p}`,
          });
        } else if (success == false) {
          logger.debug(`Failed to clone repo ${owner}/${repo} ${success}`);
          res.status(200).json({
            message: `Repo already exists at ${owner}/${repo}`,
          });
        }
      })
      .catch((err: any) => {
        logger.error(`Error while cloning repo:${err}`);
        res.status(500).json({
          message: `Error while cloning repo:${err}`,
        });
      });
  },
);
/**
 * Makes a new branch on a local github repo.
 * @name post/branch
 * @function
 * @memberof module:gh_api
 * @inner
 * @param {Task} task - the task object
 */
gh_router.post(
  "/branch",
  v.validateTask,
  v.validateTaskId,
  async (req: Request, res: Response) => {
    const { owner, repo, branchName, baseBranch, taskId } = req.body.task;
    const github = new GithubUtils();
    const p = path.join("./repos", owner, repo, branchName);
    logger.debug(`Creating new branch ${branchName} on ${owner}/${repo}`);
    github
      .createBranch({
        owner: owner,
        repo: repo,
        baseBranch: baseBranch,
        branchName: branchName,
        taskId: taskId,
      })
      .then((result) => {
        if (result == true) {
          res.status(200).json({
            message: `Branch successfully created at ${p}`,
          });
        } else if (result == false) {
          res.status(200).json({
            message: `Branch already exists at ${p}`,
          });
        }
      })
      .catch((err) => {
        logger.error(`Error creating branch:${err}`);
        res.status(500).json({
          message: `Error creating branch:${err}`,
        });
      });
  },
);
/**
 * Stages, commits, and pushes changes to the remote branch
 * @name post/commit
 * @function
 * @memberof module:gh_api
 * @inner
 * @param {string} message - the commit message
 * @param {Task} task - which task this process is for
 */
gh_router.post(
  "/commit",
  v.validateReq([], ["message", "task"]),
  v.validateTaskId,
  async (req: Request, res: Response) => {
    const { owner, repo, branchName, id } = req.body.task;
    const message = req.body.message;
    const github = new GithubUtils();
    const p = path.join("./repos", owner, repo, branchName);
    logger.debug("Preparing to add, commit, and push changes...");
    github
      .commit({
        owner: owner,
        repo: repo,
        branchName: branchName,
        dir: p,
        message: message,
        taskId: id,
      })
      .then((result) => {
        if (result == true) {
          logger.debug("Commit successful");
          res.status(200).json({
            message: "Commit successful",
          });
        } else {
          logger.debug(`Commit failed ${result}`);
          res.status(500).json({
            message: `Commit failed ${result}`,
          });
        }
      })
      .catch((err) => {
        logger.error(`Error committing changes: ${err}`);
        res.status(500).json({
          message: `Error committing changes: ${err}`,
        });
      });
  },
);
/**
 * Gets a specific issue from the repo
 * @name get/issue
 * @function
 * @memberof module:gh_api
 * @inner
 * @param {Task} task - the task object
 */
gh_router.get(
  "/:owner/:repo/issue",
  v.validateTask,
  v.validateTaskId,
  async (req: Request, res: Response) => {
    const { owner, repo, num } = req.body.task
    const github = new GithubUtils();
    logger.debug(`Fetching issue ${num} from ${owner}/${repo}`);
    await github
      .getIssueFromRepo({
        owner: owner,
        repo: repo,
        num: num,
      })
      .then((result) => {
        if (typeof result == "object") {
          logger.debug(`Successfully fetched issue ${num}`);
          res.status(200).json({
            message: `Successfully fetched issue ${num}`,
            data: result,
          });
        } else {
          logger.debug(`Failed to fetch issue: ${result}`);
          res.status(500).json({
            message: `Failed to fetch issue: ${result}`,
          });
        }
      })
      .catch((err) => {
        logger.error(`Error while fetching issue: ${err}`);
        res.status(500).json({
          message: `Error while fetching issue: ${err}`,
        });
      });
  },
);
/**
 * Creates a new pull request
 * @name post/createPR
 * @function
 * @memberof module:gh_api
 * @inner
 * @param {string} title - the PR title
 * @param {string} body - the PR body/description
 * @param {Task} task - the task object
 */
gh_router.post(
  "/createPR",
  v.validateReq(
    [],
    ["title", "body", "task"],
  ),
  v.validateTaskId,
  async (req: Request, res: Response) => {
    const { owner, repo, branchName, baseBranch, num, id } = req.body.task;
    const { title, body } = req.body;
    const github = new GithubUtils();
    logger.debug(
      `Creating PR from ${branchName} to ${baseBranch} on ${owner}/${repo}...`,
    );
    await github
      .createPR({
        owner: owner,
        repo: repo,
        baseBranch: baseBranch,
        branchName: branchName,
        title: title,
        body: body,
        num: num,
        taskId: id,
      })
      .then((success) => {
        if (success == true) {
          logger.debug("Successfully created pull request");
          res.status(200).json({
            message: "Successfully created pull request",
          });
        } else {
          logger.debug(`Could not make pull request ${success}`);
          res.status(500).json({
            message: `Could not make pull request ${success}`,
          });
        }
      })
      .catch((err) => {
        logger.error(`Error making pull request: ${err}`);
        res.status(500).json({
          message: `Error making pull request: ${err}`,
        });
      });
  },
);
//module.exports = gh_router;
