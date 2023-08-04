import express from "express";
import  GithubUtils from "./utils/github_utils.js";
import {v4 as uuid} from 'uuid'
import { spawnSync } from "child_process";
import TaskLogger from "./utils/logger.js";
const logger = new TaskLogger({logLevel:"info", taskId:null});
class App {
    public express

    constructor() {
        this.express = express()
        this.mountRoutes()
    }

    private mountRoutes() : void {
        const router = express.Router()
        router.get('/', (req:any, res:any) =>{
            res.json({
                message:"Hello World"
            })
        })
        router.post('/clone', async (req:any, res: any) =>{
            const taskId = uuid()
           /** const clone_process = spawnSync(
                "echo",
                [`New process with task ${taskId}`],
                {stdio:"inherit",
                shell:true})*/
            const github = new GithubUtils();
            github.cloneRepo({
                owner:"Gordon-BP",
                repo:"taylor-test-repo",
                baseBranch:'main',
                taskId: taskId
               // gitProcess: clone_process
            }).then((out)=>{
                res.json({
                    data:out
                })
            });
        })
        this.express.use('/', router)
    }
}
export default new App().express