/**
 * Validates API inputs for the app
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
      requestBody: req.body,
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
        return req.params[field] === undefined;
      }),
    );
    //check body
    missing_fields = missing_fields.concat(
      data.filter((field) => {
        return req.body[field] === undefined;
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
 * Validator for writeFile route in {@link App}
 */
export function validateTask(req: Request, res: Response, next: NextFunction) {
  if (req.body.task) {
    let missing_fields: Array<string> = [];
    const task_fields = [
      "baseBranch",
      "baseIssue",
      "description",
      "status",
      "pastTasks",
      "owner",
      "repo",
      "started_at",
      "id",
    ];
    missing_fields = missing_fields.concat(
      task_fields.filter((field) => {
        req.body.task[field];
      }),
    );
    if (missing_fields.length != 0) {
      return res
        .status(400)
        .json({ error: "Task missing required fields", missing_fields });
    } else {
      next();
    }
  } else {
    res.status(400).json({
      message: "No task in payload",
      requestBody: req.body,
    });
  }
}
