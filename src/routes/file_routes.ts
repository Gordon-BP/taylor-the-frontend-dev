import { Request, Response } from "express";
import express from "express";
import * as v from "../utils/validators.js";
import bodyParser from "body-parser";
import pkg from "dree";
import path from "node:path";
import winston from "winston";
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
const logger = winston.createLogger({
  level: "debug",
  format: winston.format.json(),
  defaultMeta: { service: "file-service" },
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
 * Helper function to remove unnecessary fields from file trees
 * @param tree the full file tree
 * @returns a trimmed file tree
 */
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
    newTree.children = newTree.children.map((child) => cleanTree(child));
  }
  return newTree;
}
/**
 * Status route / smoke signal
 * @name get/status
 * @function
 * @memberof module:App~router
 * @inner
 */
fs_router.get("/status", (req: Request, res: Response) => {
  logger.debug("Status OK");
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
    logger.debug("Writing new file...");
    const handle = await open(p, "w").catch(async (error: any) => {
      if (error.code && error.code == "ENOENT") {
        logger.debug(`File ${p} does not exist, creating file...`);
        await mkdir(path.dirname(p));
        return open(p, "w");
      } else {
        logger.error(`Error writing to file: ${error}`);
        res.status(500).json({
          message: `Error writing to file: ${error}`,
        });
      }
    });
    handle!.writeFile(data);
    handle!.close();
    logger.debug("File write successful");
    res.status(200).json({
      message: "File write successful",
    });
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
    const { filePath } = req.body;
    const p = path.join("./repos", owner, repo, branchName, filePath);
    logger.debug("Deleting file..");
    rm(p)
      .then((err) => {
        if (err != null) {
          logger.error(`Error deleting file ${p} ${err}`);
          res.status(500).json({
            message: `Error deleting file ${p} ${err}`,
          });
        } else {
          logger.debug("File successfully deleted");
          res.status(200).json({
            message: "File successfully deleted",
          });
        }
      })
      .catch((err) => {
        logger.error(`Error deleting file ${p} ${err}`);
        res.status(500).json({
          message: `Error deleting file ${p} ${err}`,
        });
      });
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
fs_router.post(
  "/:owner/:repo/:branchName/tree",
  v.validateReq(["owner", "repo", "branchName"], ["taskId"]),
  v.validateTaskId,
  async (req: Request, res: Response) => {
    const { owner, repo, branchName } = req.params;
    const { taskId } = req.body;
    const p = path.join("./repos", owner, repo, branchName);
    logger.debug("Creating directory tree...");
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
          const ct: MyTree = cleanTree(tree);
          logger.debug("Tree successfully generated");
          logger.debug(JSON.stringify(ct));
          res.status(200).json({
            message: "Tree successfully generated",
            data: ct,
          });
        } else {
          logger.error(`Error while scanning directory tree`);
          res
            .status(500)
            .json({ message: `Error while scanning directory tree` });
        }
      })
      .catch((err: any) => {
        logger.error(`Error while running tree:${err}`);
        res.status(500).json({ message: `Error while running tree:${err}` });
      });
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
    const p = path.join("./repos", owner, repo, branchName, filePath);
    logger.debug("Fetching file...");
    try {
      await open(p, "r+").then(async (fd) => {
        if (fd) {
          fd.readFile("utf8").then((data) => {
            if (data) {
              logger.debug("File read success");
              res.status(200).json({
                message: "File read success",
                data: data,
              });
            } else {
              logger.debug(`Cannot read file ${filePath}`);
              res.status(500).json({
                message: `Cannot read file ${filePath}`,
              });
            }
          });
          fd.close();
        } else {
          logger.error(`Cannot open file ${filePath}`);
          res.status(500).json({
            message: `Cannot open file ${filePath}`,
          });
        }
      });
    } catch (err) {
      logger.error(`Error while reading file:${err}`);
      res.status(500).json({
        message: `Error while reading file:${err}`,
      });
    }
  },
);
