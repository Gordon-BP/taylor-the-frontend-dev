/**
 * Validates API inputs for the app woohoooooooo~~~~
 */
import { Request, Response, NextFunction } from "express";

/**
 * Validator for task IDs.
 */
export function validateTaskId(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  //TODO: check the task ID somehow...
  if (req.body.taskId) {
    next();
  } else {
    res.status(400).json({
      message: "missing taskId",
    });
  }
}
/**
 *
 * Validator for most routes in {@link App}
 */
export function validateReq(params: Array<string>, data: Array<string>): any {
  return (req: Request, res: Response, next: NextFunction) => {
    let missing_fields: Array<string> = [];
    //check params
    missing_fields = missing_fields.concat(
      params.filter((field) => {
        req.params[field];
      }),
    );
    //check body
    missing_fields = missing_fields.concat(
      data.filter((field) => {
        req.body[field];
      }),
    );
    if (missing_fields.length != 0) {
      return res
        .status(400)
        .json({ error: "Missing required fields", missing_fields });
    } else {
      next();
    }
  };
}

/**
 *
 * Validator for writeFile route in {@link App}
 */
export function validateWriteFile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  let missing_fields: Array<string> = [];
  //check params
  missing_fields = missing_fields.concat(
    ["owner", "repo", "branchName"].filter((field) => {
      req.params[field];
    }),
  );
  //check body
  missing_fields = missing_fields.concat(
    ["filePath", "data", "taskId"].filter((field) => {
      req.body[field];
    }),
  );
  if (missing_fields.length != 0) {
    return res
      .status(400)
      .json({ error: "Missing required fields", missing_fields });
  } else {
    next();
  }
}
