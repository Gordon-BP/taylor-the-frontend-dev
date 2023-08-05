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
import path from "node:path";
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
                            this.logger
                                .forTask("Git-install-check")
                                .info("Github is installed");
                            resolve(true);
                        }
                        else {
                            this.logger
                                .forTask("Git-install-check")
                                .error(`Something is wrong with Github CLI: ${code}`);
                            resolve(false);
                        }
                    });
                });
            }
            catch (error) {
                this.logger
                    .forTask("Git-install-check")
                    .error(`Error with Github: ${error}`);
                return new Promise((resolve, reject) => {
                    reject();
                });
            }
        });
    }
    /**
     * Helper function to promiseify spawn() and chain multiple commands
     * @param {SpawnCommands} commandArgs - the command with args to run
     * @returns {Promise<number | Error>}
     */
    spawnAsync(commandArgs) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const proc = spawn(commandArgs.command, commandArgs.args, commandArgs.options);
                proc.once("error", (err) => reject(err));
                proc.once("exit", (code) => resolve(code));
            });
        });
    }
    /**
     * Gets issues from a GitHub repository using the GitHub CLI.
     * @param {Object} args - The named arguments for this function
     * @param {string} args.owner - The owner of the repository.
     * @param {string} args.repo - The repository name.
     * @param {taskId} args.taskId - The task uuid.
     * @param {limit} args.num - The issue number to fetch info from
     * @returns {Promise<any[]>} A Promise that resolves to an array of issues in JSON format.
     */
    getIssueFromRepo({ owner, repo, taskId, num, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const log = new TaskLogger({ logLevel: "debug", taskId });
            log.info(`Fetching issue from ${owner}/${repo}...`);
            const p = path.join("./repos", owner, repo);
            return new Promise((resolve, reject) => {
                var _a;
                const gitProcess = spawn("gh", [
                    "issue",
                    "view",
                    num,
                    "-R",
                    `${owner}/${repo}`,
                    "--json",
                    "assignees,author,body,comments,createdAt,state,title,updatedAt,url",
                ], { cwd: p });
                const chunks = [];
                const writableStream = new Writable({
                    write(chunk, encoding, next) {
                        chunks.push(chunk);
                        next();
                    },
                });
                (_a = gitProcess.stdout) === null || _a === void 0 ? void 0 : _a.pipe(writableStream);
                gitProcess.once("error", (error) => {
                    log.error(`Error fetching issue from ${owner}/${repo}:\n${error}`);
                    reject(error);
                });
                gitProcess.once("exit", (code) => {
                    const outputData = Buffer.concat(chunks).toString();
                    if (code === 0) {
                        try {
                            const issues = JSON.parse(outputData);
                            resolve(issues);
                        }
                        catch (err) {
                            reject(new Error(`Error parsing reply:${err}`));
                        }
                    }
                    else {
                        reject(new Error(`Failed to fetch issue from the repository.\n${outputData}`));
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
     */
    createBranch({ owner, repo, baseBranch = "main", branchName, taskId, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const log = new TaskLogger({ logLevel: "debug", taskId: taskId });
            const p = path.join("./repos", owner, repo, branchName);
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    this.logger.forTask(taskId).info(`Checking for repo on local disk..`);
                    if (!existsSync(p)) {
                        log.info(`Repo has not been cloned to disk. Cloning...`);
                        yield this.cloneRepo({
                            owner: owner,
                            repo: repo,
                            baseBranch: baseBranch,
                            taskId: taskId,
                        });
                    }
                    const isValidRepo = yield this.checkGitRepository({
                        dir: p,
                        taskId: taskId,
                    });
                    if (!isValidRepo) {
                        log.error(`Something is wrong with the local base branch at ${p}`);
                        reject(new Error("Local repo base branch is not a valid Github repo"));
                    }
                    if (existsSync(p)) {
                        log.error(`${branchName} already exists!`);
                        resolve(false);
                    }
                    log.info(`Creating new branch ${branchName} on ${p}...`);
                    const gitProcess = spawn("git", ["worktree", "add", "-b", branchName, `../${branchName}`], { stdio: "inherit", cwd: p });
                    gitProcess.once("error", (err) => {
                        log.error(`Error creating branch: ${err}`);
                        reject(err);
                    });
                    gitProcess.once("exit", (code) => {
                        if (code === 0) {
                            log.info(`Branch ${branchName} on ${owner}/${repo} successfully created`);
                            resolve(true);
                        }
                        else {
                            log.error(`Failed to create the branch. Exit code: ${code}`);
                            resolve(false);
                        }
                    });
                }
                catch (err) {
                    log.error(`Error while creating branch: ${err}`);
                    reject();
                }
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
            const log = new TaskLogger({ logLevel: "debug", taskId: taskId });
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const workDir = path.join("./repos", owner, repo, baseBranch);
                    log.info(`Cloning ${owner}/${repo} to ${workDir}...`);
                    const gitProcess = spawn("git", ["clone", `https://github.com/${owner}/${repo}`, workDir], { stdio: "inherit", shell: true });
                    gitProcess.once("error", (error) => {
                        log.error(`Error cloning repo:\n${error}`);
                        reject();
                    });
                    gitProcess.once("exit", (code) => {
                        if (code === 0) {
                            log.info(`Successfully cloned ${owner}/${repo}!`);
                            resolve(true);
                        }
                        else {
                            log.error(`Failed to clone the repo. Exit code: ${code}`);
                            resolve(false);
                        }
                    });
                }
                catch (error) {
                    log.error(`There was an error: ${error}`);
                    reject();
                }
            }));
        });
    }
    /**
     * Commits changes from local repo to the branch
     * @param {Object} args - names arguments
     * @param {string} args.dir - The working directory, typically ./repos/:owner/:repo/:branch
     * @param {string} args.message - Commit message
     * @param {string} args.taskId - The task Id
     * @returns {Promise<boolean>} - True is the commit is successful
     */
    commit({ owner, repo, branchName, dir, message, taskId, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const log = new TaskLogger({ logLevel: "info", taskId: taskId });
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const isRepo = yield this.checkGitRepository({
                        dir: dir,
                        taskId: taskId,
                    });
                    if (!isRepo) {
                        log.error("gitProcess is not in a valid repo directory");
                        reject();
                    }
                    const comms = [
                        {
                            // Step 1: stage your commits
                            command: "git",
                            args: ["add", "--all"],
                            options: { stdio: "inherit", cwd: dir },
                        },
                        {
                            //Step 2: commit the tracked changes
                            command: "git",
                            args: ["commit", "-a", "-m", message],
                            options: { stdio: "inherit", cwd: dir },
                        },
                        {
                            //Step 3: Remove whatever remote used to be called "origin"
                            command: "git",
                            args: ["remote", "remove", "origin"],
                            options: { stdio: "inherit", cwd: dir },
                        },
                        {
                            //Step 4: Set new repo as "origin"
                            command: "git",
                            args: [
                                "remote",
                                "add",
                                "origin",
                                `https://github.com/${owner}/${repo}`,
                            ],
                            options: { stdio: "inherit", cwd: dir },
                        },
                        {
                            //Step 4: Verify the remote URL
                            command: "git",
                            args: ["remote", "-v"],
                            options: { stdio: "inherit", cwd: dir },
                        },
                        {
                            //Step 5: Push changes from local to remote
                            command: "git",
                            args: ["push", "origin", branchName],
                            options: { stdio: "inherit", cwd: dir },
                        },
                    ];
                    for (const comm of comms) {
                        log.debug(`Running ${comm.command} ${comm.args.toString()}...`);
                        yield this.spawnAsync({
                            command: comm.command,
                            args: comm.args,
                            options: comm.options,
                        });
                    }
                    resolve(true);
                }
                catch (error) {
                    log.error(`Error committing: ${error}`);
                    reject();
                }
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
            const log = new TaskLogger({ logLevel: "info", taskId: taskId });
            log.debug(`Checking if ${dir} is a valid repo...`);
            const comm = {
                command: "git",
                args: ["rev-parse", "--is-inside-work-tree"],
                options: { stdio: "inherit", cwd: dir },
            };
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const code = yield this.spawnAsync(comm);
                    if (code !== 0) {
                        log.error(`Cannot validate local repo:\nError code ${code}`);
                        resolve(false);
                    }
                    else {
                        this.logger.forTask(taskId).info(`${dir} is a valid Github repo!`);
                        resolve(true);
                    }
                }
                catch (error) {
                    log.error(`Error validating local repo: ${error}`);
                    reject();
                }
            }));
        });
    }
    /**
     * Creates a new Pull Request
     * @param owner
     * @param repo
     * @param baseBranch
     * @param branchName
     * @param title
     * @param body
     * @param num
     * @param taskId
     */
    createPR({ owner, repo, baseBranch, branchName, title, body, taskId, num, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const dir = path.join("./repos", owner, repo, branchName);
            const log = new TaskLogger({ logLevel: "info", taskId: taskId });
            const comms = [
                {
                    //Step 1: Remove whatever remote used to be called "origin"
                    command: "git",
                    args: ["remote", "remove", "origin"],
                    options: { stdio: "inherit", cwd: dir },
                },
                {
                    //Step 2: Set new repo as "origin"
                    command: "git",
                    args: [
                        "remote",
                        "add",
                        "origin",
                        `https://github.com/${owner}/${repo}`,
                    ],
                    options: { stdio: "inherit", cwd: dir },
                },
                {
                    //Step 3: Verify the remote URL
                    command: "git",
                    args: ["remote", "-v"],
                    options: { stdio: "inherit", cwd: dir },
                },
                {
                    //Step 4: Push changes from local to remote
                    command: "git",
                    args: ["push", "origin", branchName],
                    options: { stdio: "inherit", cwd: dir },
                },
                {
                    //Step 5: Create the pull request
                    command: "gh",
                    args: [
                        "pr",
                        "create",
                        "--base",
                        baseBranch,
                        "--head",
                        branchName,
                        "--title",
                        title,
                        "--body",
                        body + `\n fixes ${num}`,
                    ],
                    options: { stdio: "inherit", cwd: dir },
                },
            ];
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    for (const comm of comms) {
                        log.debug(`Running command ${comm.command} ${comm.args.toString()}...`);
                        yield this.spawnAsync({
                            command: comm.command,
                            args: comm.args,
                            options: comm.options,
                        });
                    }
                    log.info("Pull request successfully created!");
                    resolve(true);
                }
                catch (err) {
                    log.error(`Error creating pull request: ${err}`);
                    reject();
                }
            }));
        });
    }
}
//# sourceMappingURL=github_utils.js.map