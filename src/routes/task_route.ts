/**
 * Routes for generating an ai task
 */
import express from "express";
import { Request, Response } from "express";
import bodyParser from "body-parser";
import * as v from "../utils/validators.js";
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
//TODO: Change to be configurable from env
const endpoint = "http://127.0.0.1:3000/app/v1";
interface QuestionAnswer {
  question: string;
  answer: string;
}
/**
 * Main task gen module
 * @module task_gen
 */
export const tg_router = express.Router();
tg_router.use(bodyParser.json());
const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.json(),
  ),
  defaultMeta: { service: "tg-router" },
  transports: [
    new winston.transports.File({
      filename: `error.log`,
      level: "error",
    }),
    new winston.transports.File({
      filename: `combined.log`,
      level: "debug",
    }),
  ],
});
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.prettyPrint(),
        winston.format.simple(),
      ),
    }),
  );
}

/**
 * =======================================================
 *                Helper functions go here
 * =======================================================
 */
/**
 * Goes through a task and all its past tasks and returns task descriptions
 * by status
 * @param task
 * @returns {Array<string>}
 */
async function getTasksByStatus(
  task: Task,
  status: TaskStatus,
): Promise<string[]> {
  let descriptions: string[] = [];

  if (task.status === status) {
    descriptions.push(task.description);
  }

  if (task.pastTasks && task.pastTasks.length > 0) {
    for (const pastTask of task.pastTasks) {
      const finishedPastTaskDescriptions = await getTasksByStatus(
        pastTask,
        status,
      );
      descriptions = descriptions.concat(finishedPastTaskDescriptions);
    }
  }

  return descriptions;
}
/**
 * looks for a package.json, pipfile, or poetry.toml file and gets dependencies
 */
async function getDependencies(rootDir: string): Promise<string> {
  try {
    const dependencies: Array<any> = [];
    logger.debug("Checking for package.json...");
    const packageJson = await readFile(
      path.join(rootDir, "package.json"),
      "utf8",
    )
      .then((file) => {
        return JSON.parse(file);
      })
      .catch((err) => {
        return undefined;
      });
    if (packageJson) {
      logger.debug("Package.json found, adding to list");
      dependencies.push(Object.keys(packageJson.dependencies));
    }
    const pipfileContent = await readFile(path.join(rootDir, "Pipfile"), "utf8")
      .then((file) => {
        const matches = file.match(/^packages\s=\s\{(.*?)\}$/ms);
        if (matches) {
          return matches[1];
        } else {
          return undefined;
        }
      })
      .catch((err) => {
        return undefined;
      });
    if (pipfileContent) {
      dependencies.push(
        pipfileContent
          .split("\n")
          .map((line) => line.trim().split("=")[0].trim())
          .filter(Boolean),
      );
    }
    const poetryContent = await readFile(
      path.join(rootDir, "poetry.toml"),
      "utf8",
    )
      .then((file) => {
        const matches = file.match(/^\[tool.poetry.dependencies\](.*?)\[/ms);
        if (matches) {
          return matches[1];
        } else {
          return undefined;
        }
      })
      .catch((err) => {
        return undefined;
      });
    if (poetryContent) {
      dependencies.push(
        poetryContent
          .split("\n")
          .map((line) => line.trim().split("=")[0].trim())
          .filter(Boolean),
      );
    }
    logger.debug("Got dependencies");
    return dependencies.join("\n");
  } catch (error) {
    logger.error(`Failed to get dependencies: ${error}`);
    return "";
  }
}
/**
 * get question and answers for task context
 * @param task
 * @param repoTree
 * @param pastTasksPass
 * @param pastTasksFail
 * @returns {QuestionAnswer[]}
 */
async function generateQnas(
  task: Task,
  repoTree: object,
  pastTasksPass: Array<string>,
  pastTasksFail: Array<string>,
  dependencies: string,
): Promise<QuestionAnswer[]> {
  const qnaPairs: QuestionAnswer[] = [];
  // First build the question model
  const question_model = new OpenAI({ temperature: 0.15 });
  const q_prompt_file = await readFile("./src/prompts/question_gen.md", "utf8");
  const q_template = new PromptTemplate({
    template: q_prompt_file,
    inputVariables: [
      "description",
      "dependencies",
      "tree",
      "pastTasksPass",
      "pastTasksFail",
    ],
  });
  const questionChain = new LLMChain({
    llm: question_model,
    prompt: q_template,
  });
  //Then build the answer model
  const answer_model = new OpenAI({ temperature: 0.15 });
  const a_prompt_file = await readFile("./src/prompts/answer_gen.md", "utf8");
  const a_template = new PromptTemplate({
    template: a_prompt_file,
    inputVariables: ["tree", "question", "context"],
  });
  const answerChain = new LLMChain({ llm: answer_model, prompt: a_template });
  try {
    return new Promise<QuestionAnswer[]>((resolve, reject) => {
      questionChain
        .call({
          description: task.description,
          dependencies: dependencies,
          tree: repoTree,
          pastTasksPass: pastTasksPass,
          pastTasksFail: pastTasksFail,
        })
        .then(async (llm_answer) => {
          logger.debug(
            `Raw question response: ${JSON.stringify(llm_answer.text)}`,
          );
          let questionsArr: string[] = llm_answer.text.split("\nQuestion");
          logger.info(`Generated ${questionsArr.length} questions`);
          if (questionsArr.length != 0) {
            questionsArr = questionsArr.slice(1);
            const answerPromises: Promise<ChainValues>[] = [];
            //First item won't be a question so start from 1
            questionsArr.forEach((question) => {
              answerPromises.push(
                answerChain.call({
                  question: question,
                  tree: repoTree,
                  context: "",
                }),
              );
            });
            const answersArr: ChainValues[] = await Promise.all(answerPromises);
            logger.debug(
              `Here are the raw answers: ${JSON.stringify(answersArr)}`,
            );
            logger.debug(`We have ${answersArr.length} answers`);
            let i = 0;
            answersArr.forEach((answer) => {
              qnaPairs.push({
                question: questionsArr[i],
                answer: answer.text,
              });
              i++;
            });
            logger.info(
              `Here are the questions and answers:\n${JSON.stringify(
                qnaPairs,
              )}`,
            );
            resolve(qnaPairs);
          } else {
            logger.error("Question LLM did not generate any questions");
            reject();
          }
        })
        .catch((err) => {
          logger.error(`Something went wrong with the qna LLM chain: ${err}`);
          reject();
        });
    });
  } catch (err) {
    logger.error(`Error while generating qna pairs: ${err}`);
    return new Promise<QuestionAnswer[]>((res, rej) => {
      rej(err);
    });
  }
}
/**
 * Generates a single task
 * @param task
 * @param qnaPairs
 */
async function generateTask(
  task: Task,
  qnaPairs: QuestionAnswer[],
  repoTree: object,
  pastTasksPass: string[],
  pastTasksFail: string[],
): Promise<string> {
  //TODO: make this configurable
  const task_model = new OpenAI({ temperature: 0.15 });
  const task_prompt_file = await readFile("./src/prompts/task_gen.md", "utf8");
  const task_template = new PromptTemplate({
    template: task_prompt_file,
    inputVariables: [
      "qnaPairs",
      "description",
      "tree",
      "pastTasksPass",
      "pastTasksFail",
    ],
  });
  const taskChain = new LLMChain({
    llm: task_model,
    prompt: task_template,
  });
  try {
    return new Promise<string>((resolve, reject) => {
      taskChain
        .call({
          qnaPairs: qnaPairs,
          description: task.description,
          tree: repoTree,
          pastTasksPass: pastTasksPass,
          pastTasksFail: pastTasksFail,
        })
        .then((llm_res) => {
          const nextTask = llm_res.text.split("Task:")[1];
          resolve(nextTask);
        })
        .catch((err) => {
          logger.debug(`Error generating task: ${err}`);
          reject(err);
        });
    });
  } catch (err) {
    logger.error(`Error while generating task`);
    return new Promise<string>((res, rej) => {
      rej();
    });
  }
}

/**
 * =========================================================
 *                        Routes go here
 * ===========================================================
 */
tg_router.post(
  "/genQnas",
  v.validateTask,
  async (req: Request, res: Response) => {
    const task = req.body.task;
    //Config to get file tree
    const treeConfig: AxiosRequestConfig = {
      method: "POST",
      url: `${endpoint}/files/${task.owner}/${task.repo}/${task.branchName}/tree`,
      headers: {
        "Content-Type": "application/json",
      },
      params: {
        owner: task.owner,
        repo: task.repo,
        branchName: task.branchName,
      },
      data: { taskId: task.id },
    };
    Promise.all([
      axios(treeConfig),
      getTasksByStatus(task, TaskStatus.Passed),
      getTasksByStatus(task, TaskStatus.Failed),
      getDependencies(`./repos/${task.owner}/${task.repo}/${task.baseBranch}`),
    ])
      .then(
        async ([
          treeResponse,
          pastTasksPassed,
          pastTasksFailed,
          dependencies,
        ]) => {
          const repoTree = treeResponse.data;
          if (dependencies.length > 0) {
            await writeFile(
              `./repos/${task.owner}/${task.repo}/${task.branchName}/dependencies.txt`,
              dependencies,
            );
          }
          generateQnas(
            task,
            repoTree,
            pastTasksPassed,
            pastTasksFailed,
            dependencies,
          )
            .then((qnaPairs) => {
              logger.debug(`Generated ${qnaPairs.length} QnA pairs`);
              const resData = {
                message: `Generated ${qnaPairs.length} QnA pairs`,
                data: {
                  pairs: qnaPairs,
                  tree: repoTree,
                  ptp: pastTasksPassed,
                  ptf: pastTasksFailed,
                },
              };
              res.status(200).json({ resData });
            })
            .catch((err) => {
              logger.debug(`Error generating qna pairs: ${err}`);
              res
                .status(500)
                .json({ message: `Error generating qna pairs: ${err}` });
            });
        },
      )
      .catch((err) => {
        logger.debug(`Error gathering info for qnas: ${err}`);
        res.status(500).json({
          message: `Error gathering info for qnas: ${err}`,
        });
      });
  },
);
tg_router.post(
  "/genTask",
  v.validateTask,
  async (req: Request, res: Response) => {
    const task = req.body.task;
    const qnaConfig: AxiosRequestConfig = {
      url: `${endpoint}/ai/genQnas`,
      method: "POST",
      params: {},
      headers: {
        "Content-Type": "application/json",
      },
      data: { task: task },
    };
    axios(qnaConfig)
      .then((response) => {
        logger.debug("Qnas got now moving on to task...");
        if (response.data) {
          const { pairs, tree, ptp, ptf } = response.data;
          generateTask(task, pairs, tree, ptp, ptf)
            .then((response) => {
              logger.debug(`Task: ${response}`);
              res.status(200).json({
                message: `Task successfully generated`,
                data: response,
              });
            })
            .catch((err) => {
              logger.debug(err.message);
              res.status(500).json({ message: err });
            });
        }
      })
      .catch((err) => {
        res.status(500).json({
          message: `Error generating task, could not make qna pairs: ${err}`,
        });
      });
  },
);
