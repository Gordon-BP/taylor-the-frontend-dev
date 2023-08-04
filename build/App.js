var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import express from "express";
import GithubUtils from "./utils/github_utils.js";
import { v4 as uuid } from 'uuid';
import TaskLogger from "./utils/logger.js";
const logger = new TaskLogger({ logLevel: "info", taskId: null });
class App {
    constructor() {
        this.express = express();
        this.mountRoutes();
    }
    mountRoutes() {
        const router = express.Router();
        router.get('/', (req, res) => {
            res.json({
                message: "Hello World"
            });
        });
        router.post('/clone', (req, res) => __awaiter(this, void 0, void 0, function* () {
            const taskId = uuid();
            /** const clone_process = spawnSync(
                 "echo",
                 [`New process with task ${taskId}`],
                 {stdio:"inherit",
                 shell:true})*/
            const github = new GithubUtils();
            github.cloneRepo({
                owner: "Gordon-BP",
                repo: "taylor-test-repo",
                baseBranch: 'main',
                taskId: taskId
                // gitProcess: clone_process
            }).then((out) => {
                res.json({
                    data: out
                });
            });
        }));
        this.express.use('/', router);
    }
}
export default new App().express;
//# sourceMappingURL=App.js.map