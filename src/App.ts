import { Request, Response, NextFunction} from "express";
import express from "express"
import  GithubUtils from "./utils/github_utils.js";
import * as v from "./utils/validators.js";
import {v4 as uuid} from 'uuid'
import TaskLogger from "./utils/logger.js";
import bodyParser from "body-parser";
const logger = new TaskLogger({logLevel:"info", taskId:null});

class App {
    public express
    /**
     * Wrapper for the main app. Creates an express app with an endpoint to test
     * and another endpoint to clone a hard-coded repo.
     * @module App
     * @namespace mainRouter
     */
    constructor() {
        this.express = express()
        this.mountRoutes()
        this.express.use(bodyParser.json());
    }
    private mountRoutes() : void {
        const router = express.Router()
        this.express.use(bodyParser.json());
        /**
         * Status route / smoke signal
         * @name get/status
         * @function
         * @memberof module:App~mainRouter
         * @inner
         */
        router.get('/status', (req:Request, res:Response) =>{
            res.json({
                message:"OK"
            })
        })
        /**
         * Status route / smoke signal
         * @name get/status
         * @function
         * @memberof module:App~mainRouter
         * @inner
         * @param {string} owner - the Github repo's owner
         * @param {string} name - the repo name
         * @param {string} baseBranch - the base branch (typically main or master)
         */
        router.post('/clone', v.validateCloneReq, async (req:Request, res: Response) =>{
            console.log(req)
            let {owner, repo, baseBranch} = req.body
            const taskId = uuid()
            const github = new GithubUtils();
            const success = await github.cloneRepo({
                owner:owner,
                repo:repo,
                baseBranch:baseBranch,
                taskId: taskId});
            console.log("ok we done here?")
                if(success){
                    return res.status(200).json({
                        workDir:`./repos/${owner}/${repo}/${baseBranch}`
                    })
                } else{
                   return res.status(500)
                }
        })
        router.post('/:owner/:repo', v.validateBranchReq, async (req:Request, res:Response)=>{
            let {owner, repo} = req.params
            let {branchName, baseBranch} = req.body
            const taskId = uuid()
            const github = new GithubUtils()
            github.createBranch({
                owner:owner,
                repo:repo,
                baseBranch:baseBranch,
                branchName:branchName,
                taskId:taskId
            }).then(result =>{
                console.log(`Results is ${result}`)
                if(result){
                     res.status(200).json({
                        workDir:`./repos/${owner}/${repo}/${branchName}`
                    })
                } else{
                    res.status(500).json({
                        message: "Branch failed to be created"
                    })
                }
            }).catch(error =>{
                res.status(500).json({
                    message: "oooh big time error"
                })
            })
            
            

        })
        this.express.use('/', router)
        this.express.use('/docs', express.static("./docs"))
    }
}
export default new App().express