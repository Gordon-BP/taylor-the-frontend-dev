var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { spawn } from "child_process";
import { existsSync } from "fs";
import { Writable } from "stream";
import TaskLogger from "./logger.js";
export default class GithubUtils {
    /**
     * Creates a new GithubUtils
     * @name GithubUtils
     * @class
     * @classdesc Utility class for dealing with github repositories
     */
    constructor() {
        this.logger = new TaskLogger({ logLevel: "info", taskId: "" });
    }
    /**
     * Checks the GitHub CLI installation and logs the result to the console.
     * @param {ChildProcess} gitProcess - the child process in which to check GitHub installation.
     * @returns {Promise<boolean>} - resolves to true if the installation is OK
     * @example
     * const isInstalled = await checkGithubCliInstallation(gitProcess)
     * if(!isInstalled){
     *  throw new Error("Github is not installed, please install it")
     * }
     */
    checkGithubCliInstallation({ gitProcess, }) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger
                .forTask("Git-install-check")
                .debug("Checking Github installation...");
            try {
                return new Promise((resolve, reject) => {
                    gitProcess.stdin.write("gh --version");
                    gitProcess.once("error", (error) => {
                        this.logger
                            .forTask("Git-install-check")
                            .error(`Error with Github installation:\n${error}`);
                        //  gitProcess.stdin!.uncork()
                        reject();
                    });
                    gitProcess.once("exit", (code) => {
                        this.logger
                            .forTask("Git-install-check")
                            .debug("Github installation OK!");
                        //    gitProcess.stdin!.uncork()
                        if (code === 0) {
                            this.logger.forTask("Git-install-check").info("Github is installed");
                            resolve(true);
                        }
                        else {
                            this.logger.forTask("Git-install-check").error(`Something is wrong with Github CLI: ${code}`);
                            resolve(false);
                        }
                    });
                });
            }
            catch (error) {
                this.logger
                    .forTask("Git-install-check")
                    .error(`Error with Github: ${error}`);
                return new Promise((resolve, reject) => { reject(); });
            }
        });
    }
    /**
     * Gets issues from a GitHub repository using the GitHub CLI.
     * @param {Object} args - The named arguments for this function
     * @param {string} args.owner - The owner of the repository.
     * @param {string} args.repo - The repository name.
     * @param {taskId} args.taskId - The task uuid.
     * @param {limit} args.limit - The maximum number of issues to fetch. 20 by default.
     * @returns {Promise<any[]>} A Promise that resolves to an array of issues in JSON format.
     * @example
     * const github = new GithubUtils();
     * try{
     *    const issues = await githubUtils.getIssuesFromRepo({
     *        owner: "github-username",
     *        repo: "my-repository-name"
     *        taskId: uuid()
     *        });
     *    issues.forEach((issue) => {
     *        console.log(`${issue.title}: ${issue.status}`)
     *    }
     * } catch (error){
     *    console.error("Error getting issues:", error.message)
     * }
     */
    getIssuesFromRepo({ owner, repo, taskId, limit = 20, gitProcess, }) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger
                .forTask(taskId)
                .info(`Fetching issues from ${owner}/${repo}...`);
            return new Promise((resolve, reject) => {
                var _a;
                gitProcess.stdin.write(`gh issue list --limit ${limit} --json "assignees,body,comments,createdAt,id,labels,number,state,title,updatedAt"`);
                const chunks = [];
                const writableStream = new Writable({
                    write(chunk, encoding, next) {
                        chunks.push(chunk);
                        next();
                    },
                });
                (_a = gitProcess.stdout) === null || _a === void 0 ? void 0 : _a.pipe(writableStream);
                gitProcess.once("error", (error) => {
                    this.logger
                        .forTask(taskId)
                        .error(`Error etching issues from ${owner}/${repo}:\n${error}`);
                    reject(error);
                });
                gitProcess.once("exit", (code) => {
                    const outputData = Buffer.concat(chunks).toString();
                    this.logger.forTask(taskId).info(outputData);
                    if (code === 0) {
                        try {
                            const issues = JSON.parse(outputData);
                            this.logger.forTask(taskId).info(`Successfully fetched issues!`);
                            resolve(issues);
                        }
                        catch (parseError) {
                            reject(parseError);
                        }
                    }
                    else {
                        reject(new Error(`Failed to fetch issues from the repository.\n${outputData}`));
                    }
                });
            });
        });
    }
    /**
     * Creates a new branch on a GitHub repository and then clones it as a worktree to the local
     * disk. Branches are saved to repos/owner/repo-branchName
     *
     * @param {Object} args - The named arguments for this function
     * @param {string} args.owner - The owner of the repository.
     * @param {string} args.repo - The repository name.
     * @param {string} args.baseBranch - The repository base branch name. Defaults to "main".
     * @param {string} args.branchName - The name of the new branch.
     * @param {string} args.taskId - The task uuid.
     * @returns {Promise<boolean>} A Promise that resolves true when the branch is successfully created.
     * @example
     * const github = new GithubUtils();
     * try {
     *   await github.createBranch({
     *    owner: "github-user",
     *    repo: "my-repository-name",
     *    branchName: "my-new-branch"
     *    taskId: uuid()
     * });
     *   console.log("Branch created successfully.");
     * } catch (error) {
     *    console.error("Error creating the branch:", error.message);
     * }
     */
    createBranch({ owner, repo, baseBranch = "main", branchName, taskId }) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                const workDir = `./repos/${owner}/${repo}`;
                this.logger.forTask(taskId).info(`Checking for repo on local disk..`);
                if (!existsSync(`${workDir}/${baseBranch}`)) {
                    this.logger
                        .forTask(taskId)
                        .info(`Repo has not been cloned to disk. Cloning...`);
                    yield this.cloneRepo({
                        owner: owner,
                        repo: repo,
                        baseBranch: baseBranch,
                        taskId: taskId
                    });
                }
                const isValidRepo = yield this.checkGitRepository({ dir: `${workDir}/${baseBranch}`, taskId: taskId });
                if (!isValidRepo) {
                    this.logger.forTask(taskId).error("Something is wrong with the local base branch");
                    return reject(new Error("Local repo base branch ain't right"));
                }
                if (existsSync(`workDir/${branchName}`)) {
                    this.logger.forTask(taskId).error(`${branchName} already exists!`);
                    return resolve(false);
                }
                this.logger
                    .forTask(taskId)
                    .info(`Creating new branch ${branchName} on ${owner}/${repo}/${branchName}...`);
                const gitProcess = spawn("git", ["worktree", "add", "-b", branchName, `../${branchName}`], { stdio: 'inherit', cwd: workDir });
                gitProcess.once("error", (error) => {
                    this.logger.forTask(taskId).error(`Error creating branch`);
                    return reject(error);
                });
                gitProcess.once("exit", (code) => {
                    if (code === 0) {
                        this.logger
                            .forTask(taskId)
                            .info(`Branch ${branchName} on ${owner}/${repo} successfully created`);
                        return resolve(true);
                    }
                    else {
                        this.logger.forTask(taskId).error(`Failed to create the branch. Exit code: ${code}`);
                        return resolve(false);
                    }
                });
            }));
        });
    }
    /**
     * Clones a Github reo to the working directory.
     *
     * @param {string} owner - The owner of the repository.
     * @param {string} repo - The repository name.
     * @param {string} taskId - The task uuid.
     * @example
     * cloneRepo({
     *  owner:"Gordon-BP",
     *  repo:"taylor-test-repo",
     *  baseBranch:"main",
     *  taskId: uuid()}).then(res =>{
     *  if(res){
     *    console.log("Repo successfully cloned!")}
     * })
     * @returns {Promise<boolean>} - A Promise that resolves true when the branch is successfully created.
     */
    cloneRepo({ owner, repo, baseBranch = "main", taskId, }) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                    const workDir = `./repos/${owner}/${repo}/${baseBranch}`;
                    const gitProcess = spawn("git", ["clone", `https://github.com/${owner}/${repo}`, workDir], { stdio: 'inherit', shell: true });
                    this.logger
                        .forTask(taskId)
                        .info(`Cloning ${owner}/${repo} to ${workDir}...`);
                    gitProcess.once("error", (error) => {
                        this.logger.forTask(taskId).error(`Error creating branch:\n${error}`);
                        reject();
                    });
                    gitProcess.once("exit", (code) => {
                        if (code === 0) {
                            this.logger
                                .forTask(taskId)
                                .info(`Branch on ${owner}/${repo} successfully created`);
                            resolve(true);
                        }
                        else {
                            this.logger.forTask(taskId).error(`Failed to create the branch. Exit code: ${code}`);
                            resolve(false);
                        }
                    });
                }));
            }
            catch (error) {
                this.logger.forTask(taskId).error(`There was an error: ${error}`);
                return new Promise((resolve, reject) => { reject(); });
            }
        });
    }
    /**
     * Commits changes from local repo to the branch
     * @param {string} dir - The working directory, typically ./repos/:owner/:repo/:branch
     * @param {string} message - Commit message
     * @param {string} taskId - The task Id
     * @param} gitProcess - The child gitProcesses to run it in
     * @returns
     */
    commit(dir, message, taskId, gitProcess) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                const isRepo = yield this.checkGitRepository({
                    dir: dir,
                    taskId: taskId,
                });
                if (!isRepo) {
                    this.logger
                        .forTask(taskId)
                        .error("gitProcess is not in a valid repo directory");
                    resolve();
                }
                // stage commits
                gitProcess.stdin.write("git add .\n");
                // make the commits
                gitProcess.stdin.write(`git commit -a -m "${message}"\n`);
                gitProcess.stdin.end();
                gitProcess.once("exit", (code) => {
                    if (code !== 0) {
                        throw new Error(`Error staging changes for commit. Exited with code ${code}`);
                    }
                    resolve();
                });
                gitProcess.once("error", (error) => {
                    this.logger.forTask(taskId).error(`Error creating branch`);
                    reject(error);
                });
            }));
        });
    }
    /**
     * Validates if the current working directory is a valid Github repo
     * @param {Object} args - Named arguments
     * @param {string} args.dir - The directory to check
     * @param {string} args.taskId - The Task Id
     * @returns {Promise<boolean>} True or False
     */
    checkGitRepository({ dir, taskId, }) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.forTask(taskId).debug(`Checking if ${dir} is a valid repo...`);
            try {
                return new Promise((resolve, reject) => {
                    const gitProcess = spawn("git", ["rev-parse", "--is-inside-work-tree"], { stdio: 'inherit', cwd: dir });
                    gitProcess.once("error", (error) => {
                        this.logger.forTask(taskId).error(`Error with local repo:\n${error}`);
                        reject();
                    });
                    gitProcess.once("exit", (code) => {
                        if (code == 0) {
                            this.logger.forTask(taskId).info("Dir is a valid Github repo!");
                            resolve(true);
                        }
                        else {
                            this.logger.forTask(taskId).error(`Dir is NOT a valid Github repo!\nCode: ${code}`);
                            resolve(false);
                        }
                    });
                });
            }
            catch (error) {
                this.logger
                    .forTask(taskId)
                    .error(`Error validating local repo: ${error}`);
                return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () { reject(); }));
            }
            ;
        });
    }
    createPR(baseBranch, branchName, title, body, gitProcess) {
        return __awaiter(this, void 0, void 0, function* () {
            gitProcess.stdin.write(`
    cd ../${baseBranch} && 
    gh push -u ../${branchName} && 
    gh pr create --base ${baseBranch} --head ${branchName} --title ${title} --body ${body}`);
        });
    }
}
//# sourceMappingURL=github_utils.js.map