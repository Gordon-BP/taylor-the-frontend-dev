import { OpenAI } from "langchain/llms/openai";
import { PromptTemplate } from "langchain/prompts";
import { LLMChain } from "langchain/chains";
import { writeFile } from "node:fs/promises";
import path from "path";
import winston from "winston";
import axios, { AxiosRequestConfig } from "axios";
import Task, { TaskStatus } from "../utils/Task.js";
import { readFile } from "fs/promises";
import { ChainValues } from "langchain/dist/schema";
//TODO: Change this to be configurable from env
const endpoint = "http://127.0.0.1:3000/app/v1";
interface QuestionAnswer {
  question: string;
  answer: string;
}
/**
 * @class
 */
export default class TaskGenerator {
  task: Task;
  logger: winston.Logger;
  question_model?: string; //model that generates questions
  answer_model?: string; //model that answers generated questions
  task_model?: string; //model that makes the next task, should be powerful
  docs_vectorstore?: string; //but really langchain.Vectorstore
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
        taskId: task.id,
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
    const taskStatus = this.task.status;
    this.logger.debug(`This task is currently ${taskStatus}`);
    if (taskStatus == TaskStatus.Queued) {
      this.logger.info(`Beginning work on Task ${this.task.id}`);
      const taskConfig: AxiosRequestConfig = {
        method: "POST",
        url: `${endpoint}/ai/genTask`,
        headers: {
          "Content-Type": "application/json",
        },
        params: {},
        data: { task: this.task },
      };
      axios(taskConfig)
        .then((response) => {
          this.logger.info(`This is the task: ${response.data.data}`);
        })
        .catch((err) => {
          this.logger.debug(`Error generating task`);
        });
    } else if (taskStatus == TaskStatus.InProgress) {
      this.logger.debug("Task is processing, waiting...");
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 10000);
      }).then((resolve) => {
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
