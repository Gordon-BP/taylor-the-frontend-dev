import { Request, Response } from "express";
import express from "express";
import GithubUtils from "../utils/github_utils.js";
import * as v from "../utils/validators.js";
import TaskLogger from "../utils/logger.js";
import bodyParser from "body-parser";
import path from "node:path";
/**
 * Github routes!
 */
export const gh_router = express.Router();
gh_router.use(bodyParser.json());
/**
 * Status route / smoke signal
 * @name get/status
 * @function
 * @memberof module:gh_utils
 * @inner
 */
gh_router.get("/status", (req: Request, res: Response) => {
  res.json({
    message: "OK",
  });
});
/**
 * Clones a Github repo to the bot's directory
 * @name post/clone
 * @function
 * @memberof module:gh_utils
 * @inner
 * @param {string} owner - the Github repo's owner
 * @param {string} repo - the repo name
 * @param {string} baseBranch - the base branch (typically main or master)
 * @param {string} taskId - which task this process is for
 */
gh_router.post(
  "/clone",
  v.validateReq([], ["owner", "repo", "baseBranch", "taskId"]),
  v.validateTaskId,
  async (req: Request, res: Response) => {
    const { owner, repo, baseBranch, taskId } = req.body;
    const github = new GithubUtils();
    const log = new TaskLogger({ logLevel: "info", taskId: taskId });
    const p = path.join("./repos", owner, repo, baseBranch);
    try {
      const success = await github.cloneRepo({
        owner: owner,
        repo: repo,
        baseBranch: baseBranch,
        taskId: taskId,
      });
      if (success) {
        log.info(`Successfully cloned branch ${baseBranch} to ${p}`);
        res.status(200).json({
          workDir: `./repos/${owner}/${repo}/${baseBranch}`,
        });
      } else {
        log.error(`Failed to clone repo ${owner}/${repo}`);
        res.status(500).json({
          message: "The server encountered an unknown error",
        });
      }
    } catch (err: any) {
      log.error(`Error while cloning repo:${err}`);
      res.status(500).json({
        message: `Error encountered:${err}`,
      });
    }
  },
);
/**
 * Makes a new branch on a local github repo.
 * If the repo has not already been cloned, it is cloned automatically.
 * @name post/branch
 * @function
 * @memberof module:gh_utils
 * @inner
 * @param {string} baseBranch - the base branch (typically main or master)
 * @param {string} branchName - name for the new branch
 * @param {string} taskId - which task this process is for
 */
gh_router.post(
  "/:owner/:repo/branch",
  v.validateReq(["owner", "repo"], ["branchName", "baseBranch", "taskId"]),
  v.validateTaskId,
  async (req: Request, res: Response) => {
    const { owner, repo } = req.params;
    const { branchName, baseBranch, taskId } = req.body;
    const github = new GithubUtils();
    const log = new TaskLogger({ logLevel: "info", taskId: taskId });
    const p = path.join("./repos", owner, repo, branchName);
    github
      .createBranch({
        owner: owner,
        repo: repo,
        baseBranch: baseBranch,
        branchName: branchName,
        taskId: taskId,
      })
      .then((result) => {
        if (result) {
          log.info(`Branch successfully created at `);
          res.status(200).json({
            workDir: p,
          });
        } else {
          log.error(`Branch creation failed at ${p}`);
          res.status(500).json({
            message: "Branch failed to be created",
          });
        }
      })
      .catch((err) => {
        log.error(`Error while creating branch:${err}`);
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
 * @memberof module:gh_utils
 * @inner
 * @param {string} message - the commit message
 * @param {string} taskId - which task this process is for
 */
gh_router.post(
  "/:owner/:repo/:branchName/commit",
  v.validateReq(["owner", "repo", "branchName"], ["message", "taskId"]),
  v.validateTaskId,
  async (req: Request, res: Response) => {
    const { owner, repo, branchName } = req.params;
    const { message, taskId } = req.body;
    const github = new GithubUtils();
    const log = new TaskLogger({ logLevel: "info", taskId: taskId });
    const p = path.join("./repos", owner, repo, branchName);
    github
      .commit({
        owner: owner,
        repo: repo,
        branchName: branchName,
        dir: p,
        message: message,
        taskId: taskId,
      })
      .then((result) => {
        if (result) {
          log.info("Commit successful!");
          res.status(200).json({
            message: "Commit successful",
          });
        } else {
          log.error("Commit failed");
          res.status(500).json({
            message: "Commit failed",
          });
        }
      })
      .catch((err) => {
        log.error(`Error committing changes: ${err}`);
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
 * @memberof module:gh_utils
 * @inner
 * @param {string} num - the issue number
 * @param {string} taskId - which task this process is for
 */
gh_router.get(
  "/:owner/:repo/issue",
  v.validateReq(["owner", "repo", "num"], ["num", "taskId"]),
  v.validateTaskId,
  async (req: Request, res: Response) => {
    const { owner, repo } = req.params;
    const { num, taskId } = req.body;
    const github = new GithubUtils();
    const log = new TaskLogger({ logLevel: "info", taskId: taskId });
    log.debug(`Fetching issue ${num} from ${owner}/${repo}`);
    await github
      .getIssueFromRepo({
        owner: owner,
        repo: repo,
        taskId: taskId,
        num: num,
      })
      .then((result) => {
        if (typeof result == "object") {
          log.info(`Successfully fetched issue ${num}`);
          res.status(200).json({
            data: result,
          });
        } else {
          log.error(`Failed to fetch issue: ${result}`);
          res.status(500).json({
            message: `Failed to fetch issue: ${result}`,
          });
        }
      })
      .catch((err) => {
        log.error(`Error while fetching issue: ${err}`);
        res.status(500).json({
          message: `Error while fetching issue: ${err}`,
        });
      });
  },
);
/**
 * Creates a new pull request
 * @name post/commit
 * @function
 * @memberof module:gh_utils
 * @inner
 * @param {string} title - the PR title
 * @param {string} body - the PR body/description
 * @param {string} baseBranch - the base branch name
 * @param {string} num - the issue number which this PR fixes
 * @param {string} taskId - which task this process is for
 */
gh_router.post(
  "/:owner/:repo/:branchName/createPR",
  v.validateReq(
    ["owner", "repo", "branchName"],
    ["title", "body", "taskId", "baseBranch", "num"],
  ),
  v.validateTaskId,
  async (req: Request, res: Response) => {
    const { owner, repo, branchName } = req.params;
    const { title, body, baseBranch, num, taskId } = req.body;
    const github = new GithubUtils();
    const log = new TaskLogger({ logLevel: "info", taskId: taskId });
    const p = path.join("./repos", owner, repo, branchName);
    log.debug(`Creating pull request from ${branchName} to ${baseBranch}`);
    await github
      .createPR({
        owner: owner,
        repo: repo,
        baseBranch: baseBranch,
        branchName: branchName,
        title: title,
        body: body,
        num: num,
        taskId: taskId,
      })
      .then((success) => {
        if (success) {
          log.info(`Successfully created pull request`);
          res.status(200).json({
            message: "Successfully created pull request",
          });
        } else {
          log.error("Could not make pull request");
          res.status(500).json({
            message: "Could not make pull request",
          });
        }
      });
  },
);
//module.exports = gh_router;
