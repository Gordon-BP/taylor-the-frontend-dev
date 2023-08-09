/**
 * Routes for generating code
 */
import express from "express";
import { Request, Response } from "express";
import bodyParser from "body-parser";
import * as v from "../utils/validators.js";
import { z } from "zod";
import { ChatOpenAI } from "langchain/chat_models/openai";
import CodeOutputParser from "../prompts/code_output_parser.js";
import CodePromptTemplate from "../prompts/code_prompt_template.js";
import { DynamicStructuredTool } from "langchain/tools";
import winston from "winston";
import axios, { AxiosRequestConfig } from "axios";
import { AgentExecutor, LLMSingleActionAgent } from "langchain/agents";
import { LLMChain } from "langchain";
//TODO: Change to be configurable from env
export const cg_router = express.Router();
const endpoint = "http://127.0.0.1:3000/app/v1";

interface FileData {
  path: string;
  data: string;
}
cg_router.use(bodyParser.json());
const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.json(),
  ),
  defaultMeta: { service: "cg-router" },
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
 * ============================================
 *             Helper functions
 * ============================================
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
function writeFiles(fileData: FileData[], taskId: string): string {
  let resp = "";
  const promises = fileData.map((file) => {
    if (/\.\/repos/.test(file.path)) {
      file.path = file.path.split("./repos")[1];
    }
    const owner = file.path.split("/")[0];
    const repo = file.path.split("/")[1];
    const branchName = file.path.split("/")[2];
    const filePath = file.path.split("/").slice(3).join("/");
    return axios.post(`${endpoint}/files/${filePath}`, {
      params: {
        owner: owner,
        repo: repo,
        branchName: branchName,
      },
      data: {
        filePath: filePath,
        data: file.data,
        taskId: taskId,
      },
    });
  });
  Promise.all(promises)
    .then((responses) => {
      resp = `Files successfully written:\n${responses}`;
    })
    .catch((err) => {
      logger.error(`Error writing files: ${err}`);
      resp = `Error writing files: ${err}`;
    });
  return resp;
}
function submit(data: string, taskId: string): string {
  const resp = writeFiles([{ path: "/tmp/tmp.js", data: data }], taskId);
  return resp;
}

/**
 * ============================================
 *                  Routes
 * ============================================
 */
cg_router.post(
  "/genCode",
  v.validateTask,
  async (req: Request, res: Response) => {
    const model = new ChatOpenAI({ temperature: 0.15 });
    const { task } = req.body;
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
    const codeTools = [
      new DynamicStructuredTool({
        name: "Submit Answer",
        description:
          "Use this to when you have written a complete function that resolves the task.",
        schema: z.object({
          data: z
            .string()
            .describe("Your function that successfully resolves the task"),
          taskId: z.string().describe("Which task this call is for"),
        }),
        func: async ({ data, taskId }) => submit(data, taskId),
        returnDirect: false,
      }),
      new DynamicStructuredTool({
        name: "Get Files",
        description: "Gets the data from each file in the provided list",
        schema: z.object({
          paths: z.array(z.string()),
          taskId: z.string(),
        }),
        func: async ({ paths, taskId }) => getFiles(paths, taskId),
        returnDirect: false,
      }),
      new DynamicStructuredTool({
        name: "Write Files",
        description: "Writes data to the specified files",
        schema: z.object({
          files: z.array(
            z.object({
              path: z
                .string()
                .describe("The filepath for the file to write to"),
              data: z.string().describe("The data to write to the file"),
            }),
          ),
          taskId: z.string().describe("Which task this call is for"),
        }),
        func: async ({ files, taskId }) => writeFiles(files, taskId),
        returnDirect: false,
      }),
    ];
    /**
     * Defining the chain, agent, and executor
     */
    const codeChain = new LLMChain({
      prompt: new CodePromptTemplate({
        tools: codeTools,
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
      outputParser: new CodeOutputParser(),
      stop: ["Submit Answer"],
    });
    const executor = new AgentExecutor({
      agent: codeAgent,
      tools: codeTools,
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
