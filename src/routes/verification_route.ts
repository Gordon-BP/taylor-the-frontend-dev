/**
 * Cleans and runs the code. Then assesses the local repo to determine task success.
 */
//
//Step 1: open code.js and verify that it has content

//Step 2: use basic regex rules to cut out any markdown or
//other text that could be leftover from the llm prompt

//Step 3: Run the code and record any errors

//Step 4: Update the task status
import express from "express";
import { Request, Response } from "express";
import bodyParser from "body-parser";
import * as v from "../utils/validators.js";
import { z } from "zod";
import { ChatOpenAI } from "langchain/chat_models/openai";
import VerifyOutputParser from "../prompts/verification_output_parser.js";
import VerifyPromptTemplate from "../prompts/verification_output_parser.js";
import { DynamicStructuredTool } from "langchain/tools";
import winston from "winston";
import axios, { AxiosRequestConfig } from "axios";
import { AgentExecutor, LLMSingleActionAgent } from "langchain/agents";
import { LLMChain } from "langchain";
import { open, mkdir, rm } from "node:fs/promises";
import { spawn } from "child_process";
const endpoint = "http://127.0.0.1:3000/app/v1";
export const vr_router = express.Router();
vr_router.use(bodyParser.json());
const logger = winston.createLogger({
    level: "debug",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.colorize(),
      winston.format.json(),
    ),
    defaultMeta: { service: "vr-router" },
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
 * =====================================
 *      Helper Functions
 * =====================================
 */
function getFiles(paths: string[], taskId: string): string {
    let fileContent = "";
    const promises = paths.map((filePath) => {
      if (/\.\/repos/.test(filePath)) {
        filePath = filePath.split("./repos")[1];
      }
      return axios.get(`${endpoint}/files/${filePath}`, {
        data: {
          taskId: taskId,
        },
      });
    });
    Promise.all(promises)
      .then((responses) => {
        const fileContents = responses.map((response) => response.data);
        fileContent = fileContents.join("\n");
      })
      .catch((err) => {
        logger.error(`Error fetching files: ${err}`);
      });
    return fileContent;
  }

/**
 * ====================================
 *      API Routes
 * ====================================
 */
vr_router.post(
    "/verify",
    v.validateTask,
    async (req: Request, res: Response) => {
      const model = new ChatOpenAI({ temperature: 0.15 });
      const { task } = req.body;
      const {owner, repo, baseTaskDescription, nextTaskDescription} = task
      const nextTask = task.nextTaskDescription;
      if (!nextTask || nextTask.length == 0) {
        res
          .status(400)
          .json({ message: "Invalid request- task is without description!" });
      }
      const treeConfig: AxiosRequestConfig = {
        method: "POST",
        url: `${endpoint}/files/${task.owner}/${task.repo}/${task.branchName}/tree`,
        params: {
          owner: task.owner,
          repo: task.repo,
          branchName: task.branchName,
        },
        data: {
          taskId: task.id,
        },
      };
      const treeResponse = await axios(treeConfig);
      const verifyTools = [
        new DynamicStructuredTool({
          name: "Get Files",
          description: "Gets the data from each file in the provided list",
          schema: z.object({
            paths: z.array(z.string()),
            taskId: z.string(),
          }),
          func: async ({ paths, taskId }) => getFiles(paths, taskId),
          returnDirect: false,
        })
      ];
      /**
       * Defining the chain, agent, and executor
       */
      const codeChain = new LLMChain({
        prompt: new VerifyPromptTemplate({
          tools: verifyTools,
          inputVariables: [
            "previousCode",
            "codeError",
            "recentLogs",
            "description",
            "tree",
            "feedback",
          ],
        }),
        llm: model,
      }); //End chain def
      const codeAgent = new LLMSingleActionAgent({
        llmChain: codeChain,
        outputParser: new VerifyOutputParser(),
        stop: ["Submit Answer"],
      });
      const executor = new AgentExecutor({
        agent: codeAgent,
        tools: verifyTools,
        maxIterations: 4, //TODO: Make this configurable from env
        verbose: true,
      });
      executor
        .call([
          { previousCode: "None available- you are on your first attempt!" },
          { codeError: "None available- you are on your first attempt!" },
          { recentLogs: "None available- you are on your first attempt!" },
          { description: nextTask },
          { tree: treeResponse.data },
          { feedback: "None available- you are on your first attempt!" },
        ])
        .then((response) => {
          logger.info(`Code Gen Response: \n${response.output}`);
          res.status(200).json({
            message: "Code successfully generated!",
            data: response.output,
          });
        })
        .catch((err) => {
          logger.error(`Code Gen Error ${err}`);
          res.status(500).json({ message: `Code Gen Error ${err}` });
        });
    },
  );
  