import { Request, Response } from "express";
import express from "express";
import GithubUtils from "./utils/github_utils.js";
import * as v from "./utils/validators.js";
import TaskLogger from "./utils/logger.js";
import bodyParser from "body-parser";
import pkg from "dree";
import path from "node:path";
import { open, mkdir, rm } from "node:fs/promises";
const logger = new TaskLogger({ logLevel: "info", taskId: null });
/**
 * Directory tree object
 */
export interface MyTree {
  name: string;
  path?: string;
  relativePath: string;
  type: string;
  isSymbolicLink?: boolean;
  children?: MyTree[] | undefined;
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
    this.express.use(bodyParser.json());
  }
  private mountRoutes(): void {
    const router = express.Router();
    this.express.use(bodyParser.json());
    /**
     * Status route / smoke signal
     * @name get/status
     * @function
     * @memberof module:App~mainRouter
     * @inner
     */
    router.get("/status", (req: Request, res: Response) => {
      res.json({
        message: "OK",
      });
    });
    /**
     * Clones a Github repo to the bot's directory
     * @name post/clone
     * @function
     * @memberof module:App~mainRouter
     * @inner
     * @param {string} owner - the Github repo's owner
     * @param {string} repo - the repo name
     * @param {string} baseBranch - the base branch (typically main or master)
     * @param {string} taskId - which task this process is for
     */
    router.post(
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
     * @memberof module:App~mainRouter
     * @inner
     * @param {string} baseBranch - the base branch (typically main or master)
     * @param {string} branchName - name for the new branch
     * @param {string} taskId - which task this process is for
     */
    router.post(
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
     * Overwrites the file at filePath with the included data.
     * Creates files and directories as needed.
     * @name post/writeFile
     * @function
     * @memberof module:App~mainRouter
     * @inner
     * @param {string} filePath - where the file is to be written or created
     * @param {string} data - the information to write to the file
     * @param {string} taskId - which task this process is for
     */
    router.post(
      "/:owner/:repo/:branchName/writeFile",
      v.validateReq(
        ["owner", "repo", "branchName"],
        ["filePath", "data", "taskId"],
      ),
      v.validateTaskId,
      async (req: Request, res: Response) => {
        const { owner, repo, branchName } = req.params;
        const { filePath, data, taskId } = req.body;
        const p = path.join("./repos", owner, repo, branchName, filePath);
        const log = new TaskLogger({ logLevel: "info", taskId: taskId });
        const handle = await open(p, "w").catch(async (error: any) => {
          if (error.code && error.code == "ENOENT") {
            log.info(`Creating new file or directory at ${filePath}`);
            await mkdir(path.dirname(p));
            return open(p, "w");
          } else {
            log.error(`Unknown error while writing file: ${error}`);
            return null;
          }
        });
        if (!handle) {
          res.status(500).json({
            message: "Error writing file- see logs for details",
          });
        } else {
          handle!.writeFile(data);
          log.info(`Success write to file at ${p}`);
          res.status(200).json({
            message: "File write successful",
          });
        }
        handle!.close();
      },
    );
    /**
     * Deletes a file
     * @name post/deleteFile
     * @function
     * @memberof module:App~mainRouter
     * @inner
     * @param {string} filePath - where the file is to be written or created
     * @param {string} taskId - which task this process is for
     */
    router.post(
      "/:owner/:repo/:branchName/deleteFile",
      v.validateReq(["owner", "repo", "branchName"], ["filePath", "taskId"]),
      v.validateTaskId,
      (req: Request, res: Response) => {
        const { owner, repo, branchName } = req.params;
        const { taskId, filePath } = req.body;
        const log = logger.forTask(taskId);
        const p = path.join("./repos", owner, repo, branchName, filePath);
        try {
          rm(p)
            .then((err) => {
              if (err != null) {
                log.error(`Error deleting file ${p}:\n${err}`);
                res.status(500).json({
                  message: `Error deleting file ${p}:\n${err}`,
                });
              } else {
                log.info(`File ${p} successfully deleted`);
                res.status(200).json({
                  message: "File successfully deleted",
                });
              }
            })
            .catch((err) => {
              log.error(`Error while executing rm: ${err}`);
              res.status(500).json({
                message: `Error deleting file ${p}:\n${err}`,
              });
            });
        } catch (error: any) {
          log.error(`rm encountered an error:${error}`);
        }
      },
    );
    /**
     * Get the repo branch as a directory tree object
     * powered by dree https://www.npmjs.com/package/dree
     * @name get/tree
     * @function
     * @memberof module:App~mainRouter
     * @inner
     * @param {string} taskId - which task this process is for
     */
    router.get(
      "/:owner/:repo/:branchName/tree",
      v.validateReq(["owner", "repo", "branchName"], ["taskId"]),
      v.validateTaskId,
      async (req: Request, res: Response) => {
        const { owner, repo, branchName } = req.params;
        const { taskId } = req.body;
        const log = new TaskLogger({ logLevel: "debug", taskId: taskId });
        const p = path.join("./repos", owner, repo, branchName);
        try {
          pkg
            .scanAsync(p, {
              stat: false,
              hash: false,
              sizeInBytes: false,
              exclude: /^\/\..+/,
              size: false,
            })
            .then((tree) => {
              if (tree) {
                function cleanTree(tree: MyTree): MyTree {
                  const newTree = { ...tree };
                  if (
                    newTree.hasOwnProperty("isSymbolicLink") &&
                    newTree.hasOwnProperty("path")
                  ) {
                    delete newTree.isSymbolicLink;
                    delete newTree.path;
                  }
                  if (newTree.children && Array.isArray(newTree.children)) {
                    newTree.children = newTree.children.map((child) =>
                      cleanTree(child),
                    );
                  }
                  return newTree;
                }
                log.debug("Tree generated");
                res.status(200).json({
                  tree: cleanTree(tree),
                });
              } else {
                log.error("Failed to generate tree");
                res
                  .status(500)
                  .json({ message: "Error generating directory tree" });
              }
            });
        } catch (err: any) {
          log.error(`Error while running tree:${err}`);
          res.status(500).json({ message: `Error while running tree:${err}` });
        }
      },
    );
    /**
     * Reads a file
     * TODO: Add validation middleware
     * @name get/file
     * @function
     * @memberof module:App~mainRouter
     * @inner
     * @param {string} taskId - which task this process is for
     */
    router.get(
      "/:owner/:repo/:branchName/:filePath",
      v.validateReq(["owner", "repo", "branchName", "filePath"], ["taskId"]),
      v.validateTaskId,
      async (req: Request, res: Response) => {
        const { owner, repo, branchName, filePath } = req.params;
        const { taskId } = req.body;
        const log = new TaskLogger({ logLevel: "info", taskId: taskId });
        const p = path.join("./repos", owner, repo, branchName, filePath);
        try {
          await open(p, "r+").then(async (fd) => {
            if (fd) {
              fd.readFile("utf8").then((data) => {
                if (data) {
                  log.info(`Successfully read file ${filePath}`);
                  res.status(200).json({
                    data: data,
                  });
                } else {
                  log.error(`Cannot read file ${filePath}`);
                  res.status(500).json({
                    message: `Cannot read the file`,
                  });
                }
              });
              fd.close();
            } else {
              log.error(`Cannot open file ${filePath}`);
              res.status(500).json({
                message: `Cannot open file ${filePath}`,
              });
            }
          });
        } catch (error) {
          log.error(`Error while reading file:${error}`);
          res.status(500).json({
            message: `Error while reading file:${error}`,
          });
        }
      },
    );
    /**
     * Commits a change to
     * @name post/commit
     * @function
     * @memberof module:App~mainRouter
     * @inner
     * @param {string} message - the commit message
     * @param {string} taskId - which task this process is for
     */
    router.post(
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
    this.express.use("/", router);
    this.express.use("/docs", express.static("./docs"));
  } //close mountRoutes
} //close App
export default new App().express;
