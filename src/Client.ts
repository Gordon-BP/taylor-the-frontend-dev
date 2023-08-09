/**
 * This is the client process that is triggered by a new issue
 */
import winston from "winston";
import axios, { AxiosRequestConfig } from "axios";
import Task, { TaskStatus } from "./utils/Task.js";
//TODO: Change this to be configurable from env
const endpoint = "http://127.0.0.1:3000/app/v1";
/**
 * @class
 */
export default class Client {
  task: Task;
  logger: winston.Logger;
  constructor(task: Task) {
    this.task = task;
    this.logger = winston.createLogger({
      level: "info",
      format: winston.format.combine(
        winston.format.label({ label: this.task.id }),
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.json(),
      ),
      defaultMeta: { service: "task-gen" },
      transports: [
        new winston.transports.File({
          filename: `./repos/${task.owner}/${task.repo}/error.log`,
          level: "error",
        }),
        new winston.transports.File({
          filename: `./repos/${task.owner}/${task.repo}/combined.log`,
          level: "silly",
        }),
      ],
    });
    if (process.env.NODE_ENV !== "production") {
      this.logger.add(
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      );
    }
  }
  /**
   * Initialize the local environment by cloning the repo,
   * creating a branch, and making a new logger
   * @param task
   */
  public async init(task: Task) {
    const { owner, repo, baseBranch, id } = task;
    // Begin listening to the task status for changes
    this.start();
    this.logger.debug("Cloning repo...");
    const cloneConfig: AxiosRequestConfig = {
      method: "POST",
      url: `${endpoint}/github/clone`,
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        owner: owner,
        repo: repo,
        baseBranch: baseBranch,
        taskId: id,
      },
    };

    axios(cloneConfig)
      .then((clone_results) => {
        if (clone_results.status == 200) {
          this.logger.info(clone_results.data.message);
          this.logger.debug("Making a new branch...");
          task.branchName = `Taylor_Issue_${task.baseIssue}`;

          const branchConfig: AxiosRequestConfig = {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            url: `${endpoint}/github/${owner}/${repo}/branch`,
            params: {
              owner: owner,
              repo: repo,
            },
            data: {
              baseBranch: baseBranch,
              branchName: task.branchName,
              taskId: task.id,
            },
          };
          axios(branchConfig)
            .then((branch_results) => {
              if (branch_results.status == 200) {
                this.logger.info(branch_results.data.message);
                this.task.status = TaskStatus.Queued;
              } else {
                this.logger.error(
                  `Could not create branch: ${branch_results.data.message}`,
                );
              }
            })
            .catch((err) => {
              this.logger.error(`Error creating branch: ${err}`);
            });
        } else {
          this.logger.info(
            `Could not clone repo: ${clone_results.data.message}`,
          );
        }
      })
      .catch((err) => {
        this.logger.error(`Error cloning repo: ${err}`);
      });
  }
  /**
   * Generate a task if the Task obj is queued
   */
  private async start() {
    const {
      owner,
      repo,
      branchName,
      status,
      id,
      baseTaskDescription,
      nextTaskDescription,
    } = this.task;
    const taskStatus = status;
    this.logger.debug(`This task is currently ${taskStatus}`);
    if (taskStatus == TaskStatus.Queued) {
      this.logger.info(`Decomposing Task ${id}`);
      const taskConfig: AxiosRequestConfig = {
        method: "POST",
        url: `${endpoint}/task/genTask`,
        headers: {
          "Content-Type": "application/json",
        },
        params: {},
        data: { task: this.task },
      };
      axios(taskConfig)
        .then((response) => {
          this.logger.info(`This is new task: ${response.data.data}`);
          this.task.pastTasks.push(
            JSON.stringify({
              baseTaskDescription,
              nextTaskDescription,
              status,
            }),
          );
          this.task.nextTaskDescription = response.data.data;
          this.task.status = TaskStatus.InProgress;
          //eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { pastTasks, ...currentTaskOnly } = this.task;
          const codeGenConfig: AxiosRequestConfig = {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            url: `${endpoint}/code/genCode`,
            params: {},
            data: {
              task: currentTaskOnly,
            },
          };
          this.logger.debug(codeGenConfig);
          axios(codeGenConfig).then(async (code) => {
            this.logger.info(
              `Code received! \n${JSON.stringify(code.data.data)}`,
            );
            const writeConfig: AxiosRequestConfig = {
              url: `${endpoint}/files/${owner}/${repo}/${branchName}/writeFile`,
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              params: { owner, repo: repo, branchName: branchName },
              data: { filePath: `code.js`, data: code.data.data, taskId: id },
            };
            this.logger.debug(writeConfig);
            await axios(writeConfig)
              .then((response) => {
                this.logger.info(response.data.message);
              })
              .catch((err) => {
                this.logger.error(`Error saving code to file: ${err}`);
              });
          });
        })
        .catch((err) => {
          this.logger.debug(`Error generating task: ${err}`);
        });
    } else if (taskStatus == TaskStatus.InProgress) {
      this.logger.debug("Task is processing, waiting...");
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 10000);
      }).then(() => {
        this.start();
      });
    } else if (
      taskStatus == TaskStatus.Passed ||
      taskStatus == TaskStatus.Pending ||
      taskStatus == TaskStatus.Failed
    ) {
      this.logger.info(
        `Cannot work on the task because it is ${this.task.status}`,
      );
    }
  }
}
