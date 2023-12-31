import winston from "winston";

/**
 * Allowed Task Statuses
 */
export enum TaskStatus {
  Queued = "queued",
  Pending = "pending",
  InProgress = "in progress",
  Passed = "passed",
  Failed = "failed",
}
/**
 * @class
 * @classdesc Tasks are the state obj that get passed around
 */
export default class Task {
  /**
   * Creates a new instance of the Task class.
   * @param {Date} started_at - The start date and time of the task.
   * @param {string} [description] - The description of the task (optional).
   * @param {TaskStatus} [status] - The status of the task (optional).
   * @param {Array<Task>} [pastTasks] - An array of past tasks related to this task (optional)
   */
  baseTaskDescription: string;
  nextTaskDescription?: string;
  status: TaskStatus;
  pastTasks: Array<string>;
  baseIssue: number;
  owner: string;
  repo: string;
  baseBranch: string;
  started_at: string;
  id: string;
  logger?: winston.Logger;
  branchName?: string;

  constructor({
    description,
    status,
    pastTasks,
    owner,
    repo,
    baseIssue,
    baseBranch,
    started_at,
    id,
  }: {
    description: string;
    status: TaskStatus;
    pastTasks: Array<string>;
    baseIssue: number;
    owner: string;
    repo: string;
    baseBranch: string;
    started_at: string;
    id: string;
    logger?: winston.Logger;
    branchName?: string;
  }) {
    this.baseTaskDescription = description;
    this.status = status;
    this.baseIssue = baseIssue;
    this.pastTasks = pastTasks;
    this.owner = owner;
    this.repo = repo;
    this.baseBranch = baseBranch;
    this.started_at = started_at;
    this.id = id;
  }
}
