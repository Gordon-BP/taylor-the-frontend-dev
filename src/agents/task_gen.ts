import { OpenAI } from "langchain/llms/openai";
import { PromptTemplate } from "langchain/prompts";
import { LLMChain } from "langchain/chains";
import winston from "winston";
import axios, { AxiosResponse, AxiosError, Axios } from "axios";
import Task, { TaskStatus } from "../utils/Task";
//TODO: Change this to be configurable from env
const endpoint = "localhost:3000/app/v1"

/**
 * Decomposes the issue into a dynamic series of tasks
 */
export default class TaskGenerator{
    task:Task
    logger: winston.Logger
    question_model?: string; //model that generates questions
    answer_model?: string; //model that answers generated questions
    task_model?:string; //model that makes the next task, should be powerful
    docs_vectorstore?: string //but really langchain.Vectorstore
    constructor(task:Task){
        this.task = task
        let {owner, repo, baseBranch, id} = task
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.json(),
            defaultMeta: { service: 'file-service' },
            transports: [
              new winston.transports.File({ filename: `./repos/${owner}/${repo}/error.log`, level: 'error' }),
              new winston.transports.File({ filename: `./repos/${owner}/${repo}/env_info.txt`, level:"info" }),
              new winston.transports.File({ filename: `./repos/${owner}/${repo}/combined.log` }),
            ],
          });
          if (process.env.NODE_ENV !== 'production') {
            this.logger.add(new winston.transports.Console({
              format: winston.format.simple(),
            }));
          }
          this.init(task)
    }
    private async init(task:Task){
        let {owner, repo, baseBranch, id} = task
        // Clone the repo
          //Initialize the environment
          this.logger.debug("Cloning repo...")
        axios.post(
            `${endpoint}/github/clone`,
            {owner:owner,
            repo:repo,
        baseBranch:baseBranch,
    taskId:id}).then(response=>{
        if(response.status == 200){
            this.logger.info(response.data.message)
            //Make a new branch
            this.logger.debug("Making a new branch...")
            const branchName = `Taylor_Issue_${task.baseIssue}`
            axios.post(
                `${endpoint}/github/${owner}/${repo}/branch`,
                {branchName:branchName,
                baseBranch:baseBranch,
            taskId:task.id}).then(response =>{
                if(response.status == 200){
                    this.logger.info(response.data.message)
                    this.task.status = TaskStatus.Queued
                }else{
                    this.logger.error(`Could not create branch: ${response}`)
                }
            }).catch(err =>{
                this.logger.error(`Error creating branch: ${err}`)
            })
        } else{
            this.logger.error(`Could not clone repo: ${response}`)
        }
    }).catch(err =>{
        this.logger.error(`Error cloning repo: ${err}`)
    })
    }
    
    public async start(){
        if(this.task.status == TaskStatus.Queued){
            this.logger.info(`Beginning work on Task ${this.task.id}`)
            var qna_context = await generateQuestions(this.task)
        }
        else if((this.task.status == TaskStatus.InProgress)){
            this.logger.debug("Task is processing, waiting...")
            await new Promise<void>((resolve) => {
                setTimeout(() => {resolve()}, 30000)});
        } else if(this.task.status == TaskStatus.Finished ||
            this.task.status == TaskStatus.Pending){
                this.logger.info(`Cannot work on the task because it is ${this.task.status}`)
            }
    }
}


/**
 * Chain that generates question-answer pairs that augment task context
 * @param task 
 */
async function generateQuestions(task:Task){

}
/** 
// We can construct an LLMChain from a PromptTemplate and an LLM.
const model = new OpenAI({ temperature: 0 });
const prompt = PromptTemplate.fromTemplate(
  "What is a good name for a company that makes {product}?"
);
const chainA = new LLMChain({ llm: model, prompt });

// The result is an object with a `text` property.
const resA = await chainA.call({ product: "colorful socks" });
console.log({ resA });
// { resA: { text: '\n\nSocktastic!' } }

// Since this LLMChain is a single-input, single-output chain, we can also `run` it.
// This convenience method takes in a string and returns the value
// of the output key field in the chain response. For LLMChains, this defaults to "text".
const resA2 = await chainA.run("colorful socks");
console.log({ resA2 });
// { resA2: '\n\nSocktastic!' }
*/