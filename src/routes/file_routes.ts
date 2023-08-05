import { Request, Response } from "express";
import express from "express";
import * as v from "../utils/validators.js";
import TaskLogger from "../utils/logger.js";
import bodyParser from "body-parser";
import pkg from "dree";
import path from "node:path";
import { open, mkdir, rm } from "node:fs/promises";

export const fs_router = express.Router();
fs_router.use(bodyParser.json());
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
/**
     * Status route / smoke signal
     * @name get/status
     * @function
     * @memberof module:App~mainfs_router
     * @inner
     */
fs_router.get("/status", (req: Request, res: Response) => {
    res.json({
      message: "OK",
    });
  });
  /**
   * Overwrites the file at filePath with the included data.
   * Creates files and directories as needed.
   * @name post/writeFile
   * @function
   * @memberof module:fs_utils
   * @inner
   * @param {string} filePath - where the file is to be written or created
   * @param {string} data - the information to write to the file
   * @param {string} taskId - which task this process is for
   */
  fs_router.post(
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
        handle!.close();
        log.info(`Success write to file at ${p}`);
        res.status(200).json({
          message: "File write successful",
        });
      }
      
    },
  );
  /**
   * Deletes a file
   * @name post/deleteFile
   * @function
   * @memberof module:fs_utils
   * @inner
   * @param {string} filePath - where the file is to be written or created
   * @param {string} taskId - which task this process is for
   */
  fs_router.delete(
    "/:owner/:repo/:branchName/deleteFile",
    v.validateReq(["owner", "repo", "branchName"], ["filePath", "taskId"]),
    v.validateTaskId,
    (req: Request, res: Response) => {
      const { owner, repo, branchName } = req.params;
      const { taskId, filePath } = req.body;
      const log = new TaskLogger({logLevel:'debug', taskId:taskId})
      const p = path.join("./repos", owner, repo, branchName, filePath);
      try {
        rm(p)
          .then((err) => {
            if (err != null) {
              log.error(`Error deleting file ${p} ${err}`);
              res.status(500).json({
                message: `Error deleting file ${p} ${err}`,
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
              message: `Error deleting file ${p} ${err}`,
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
   * @memberof module:fs_utils
   * @inner
   * @param {string} taskId - which task this process is for
   */
  fs_router.get(
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
   * @memberof module:fs_utils
   * @inner
   * @param {string} taskId - which task this process is for
   */
  fs_router.get(
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