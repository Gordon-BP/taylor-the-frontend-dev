import express from "express";
import { Request, Response } from "express";
import bodyParser from "body-parser";
import * as v from "../utils/validators.js";
import { z } from "zod";
import { ChatOpenAI } from "langchain/chat_models/openai";
import VerifyOutputParser from "../prompts/verification_output_parser.js";
import VerifyPromptTemplate from "../prompts/verification_prompt_template.js";
import { DynamicStructuredTool } from "langchain/tools";
import winston from "winston";
import axios, { AxiosRequestConfig } from "axios";
import { AgentExecutor, LLMSingleActionAgent } from "langchain/agents";
import { LLMChain } from "langchain";
import  * as eslint from "eslint";
import CodeWrapper from "../utils/CodeWrapper.js"
import {writeFile} from "node:fs/promises"
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

  async function lintScript(filePath:string) {
    const linter = new eslint.ESLint({
      fix:true,
      useEslintrc: false,
      overrideConfig: {
        extends: ["eslint:recommended"],
        parserOptions: {
            sourceType: "module",
            ecmaVersion: "latest",
        },
        rules:{
            "no-unused-vars":"off"
        },
        env: {
            es2022: true,
            node: true,
        },
    },
    });

    return await linter.lintFiles([filePath]);
  }
/**
 * ====================================
 *      API Routes
 * ====================================
 */
vr_router.post(
    "/",
    v.validateReq([], ['filePath', "task"]),
    v.validateTask,
    async (req: Request, res: Response) => {
      const model = new ChatOpenAI({ temperature: 0.15 });
      const {task, filePath} = req.body
      const {owner, repo, branchName, id, baseTaskDescription, nextTaskDescription} = task
      if (!nextTaskDescription || nextTaskDescription.length == 0) {
        res
          .status(400)
          .json({ message: "Invalid request- task is without description!" });
      }
      console.log("Step 1: open code.js and verify that it has content")
      const readFileConfig:AxiosRequestConfig={
        method:'GET',
        url:`${endpoint}/files/${owner}/${repo}/${branchName}/code.js`,
        //params:{owner, repo, branchName, filePath},
        data:{taskId:id}
      }
      var codeFile = await axios(readFileConfig)
      if(!codeFile.data.data || codeFile.data.data.length == 0){
        res.status(500).json({message:`No code in code.js to verify`})
      }
     // console.log("Step 2: Import our fileTools so the code might actually work")
     // const codeString= `import { readFiles, writeFiles } from "../../../../src/utils/fileTools.js"\n` + codeFile.data.data
     // await writeFile(`./repos/${owner}/${repo}/${branchName}/code.js`, codeString)
     // console.log("Step 3: Lint the code, fix what we can, and record any errors")
     // const lintResult = await lintScript(`./repos/${owner}/${repo}/${branchName}/code.js`);
     // lintResult.forEach(result =>{
     //   if (result.errorCount > 0) {
     //       logger.error(`Linting issues found:${lintResult}`);
     //       res.status(700).json({message:`Linting issues found in code.js`, data:lintResult})
     //     }
     // })
      console.log("Step 4: Run the code")
      

    const generator = new CodeWrapper(codeFile.data.data, task);
    const msg = await generator.executeCode()
    if(msg){
            logger.info(msg)
            logger.info("Code ran let's goooooo")
           // res.status(200).json({message:"Code ran successfully lets goooooo"})
        }
    else{
            logger.info(`Code failed`)
            res.status(400).json({message:`Code failed`})
        }

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
    /**   executor
        .call([
          { previousCode: "None available- you are on your first attempt!" },
          { codeError: "None available- you are on your first attempt!" },
          { recentLogs: "None available- you are on your first attempt!" },
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
        });*/
    try{
        const commitConfig:AxiosRequestConfig={
            method:'POST',
            url:`${endpoint}/github/${owner}/${repo}/${branchName}/commit`,
            headers:{
                "Content-Type":"application/json"
            },
            params: {owner, repo, branchName},
            data:{message:`Addressing ${id}`,taskId:id}
        }
        axios(commitConfig).then(msg=>{
            logger.info(`Commit successful ${msg}`)
            const prConfig:AxiosRequestConfig={
                method:'POST',
                url:`${endpoint}/github/${owner}/${repo}/${branchName}/createPR`,
                headers:{
                    "Content-Type":"application/json"
                },
                params:{owner, repo, branchName},
                data:{
                    title:`Fix for Issue ${task.baseIssue}`,
                    body:task.nextTaskDescription,
                    taskId:id,
                    baseBranch:task.baseBranch,
                    num:task.baseIssue}
            }
            axios(prConfig).then(msg=>{
                logger.info(`PR Successfully created: ${msg.data.message}`)
                res.status(200).json({message:msg.data.message})
            }).catch(err=>{
                logger.error(`Error making PR: ${err}}`)
                res.status(500).json({message:`Error making PR: ${err}`})
            })
            
        }).catch(err=>{
            logger.error(`Error committing changes${err}`)
        })
    }catch(err){
        logger.error(`Error happened somewhere: ${err}`)
    }
    }
  );
  