import { ChildProcess, spawn } from "child_process";
import type { PullRequestEvent, IssuesEvent } from "@octokit/webhooks-types";
import { existsSync } from "fs";
import { Writable } from "stream";
import TaskLogger from "./logger.js";
import path from "node:path";

interface SpawnCommands {
  command: string;
  args: Array<string>;
  options: object;
}
const issuesCommentedOn:number[] = []
export default class GithubUtils {
  /**
   * Creates a new GithubUtils
   * @name GithubUtils
   * @class
   * @classdesc Utility class for dealing with github repositories
   */
  constructor() {}
  logger = new TaskLogger({ logLevel: "info", taskId: "" });
  /**
   * Checks the GitHub CLI installation and logs the result to the console.
   * @param {ChildProcess} gitProcess - the child process in which to check GitHub installation.
   * @returns {Promise<boolean>} - resolves to true if the installation is OK
   */
  public async checkGithubCliInstallation({
    gitProcess,
  }: {
    gitProcess: ChildProcess;
  }): Promise<boolean> {
    this.logger
      .forTask("Git-install-check")
      .debug("Checking Github installation...");
    try {
      return new Promise((resolve, reject) => {
        gitProcess.stdin!.write("gh --version");
        gitProcess.once("error", (error: any) => {
          this.logger
            .forTask("Git-install-check")
            .error(`Error with Github installation:\n${error}`);
          //  gitProcess.stdin!.uncork()
          reject();
        });
        gitProcess.once("exit", (code: number) => {
          this.logger
            .forTask("Git-install-check")
            .debug("Github installation OK!");
          //    gitProcess.stdin!.uncork()
          if (code === 0) {
            this.logger
              .forTask("Git-install-check")
              .info("Github is installed");
            resolve(true);
          } else {
            this.logger
              .forTask("Git-install-check")
              .error(`Something is wrong with Github CLI: ${code}`);
            resolve(false);
          }
        });
      });
    } catch (error) {
      this.logger
        .forTask("Git-install-check")
        .error(`Error with Github: ${error}`);
      return new Promise<boolean>((resolve, reject) => {
        reject();
      });
    }
  }
  /**
   * Helper function to promiseify spawn() and chain multiple commands
   * @param {SpawnCommands} commandArgs - the command with args to run
   * @returns {Promise<number | Error>}
   */
  private async spawnAsync(commandArgs: SpawnCommands) {
    return new Promise((resolve, reject) => {
      const proc = spawn(
        commandArgs.command,
        commandArgs.args,
        commandArgs.options,
      );
      proc.once("error", (err) => reject(err));
      proc.once("exit", (code) => resolve(code));
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
  public async getIssueFromRepo({
    owner,
    repo,
    taskId,
    num,
  }: {
    owner: string;
    repo: string;
    taskId: string;
    num: string;
  }): Promise<object> {
    const log = new TaskLogger({ logLevel: "debug", taskId });
    log.info(`Fetching issue from ${owner}/${repo}...`);
    const p = path.join("./repos", owner, repo);
    return new Promise((resolve, reject) => {
      const gitProcess = spawn(
        "gh",
        [
          "issue",
          "view",
          num,
          "-R",
          `${owner}/${repo}`,
          "--json",
          "assignees,author,body,comments,createdAt,state,title,updatedAt,url",
        ],
        { cwd: p },
      );
      const chunks: any[] = [];
      const writableStream = new Writable({
        write(chunk, encoding, next) {
          chunks.push(chunk);
          next();
        },
      });
      gitProcess.stdout?.pipe(writableStream);
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
          } catch (err: any) {
            reject(new Error(`Error parsing reply:${err}`));
          }
        } else {
          reject(
            new Error(
              `Failed to fetch issue from the repository.\n${outputData}`,
            ),
          );
        }
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
  public async createBranch({
    owner,
    repo,
    baseBranch = "main",
    branchName,
    taskId,
  }: {
    owner: string;
    repo: string;
    baseBranch: string;
    branchName: string;
    taskId: string;
  }): Promise<boolean> {
    const log = new TaskLogger({ logLevel: "debug", taskId: taskId });
    const p = path.join("./repos", owner, repo, branchName);
    return new Promise(async (resolve, reject) => {
      try {
        this.logger.forTask(taskId).info(`Checking for repo on local disk..`);
        if (!existsSync(p)) {
          log.info(`Repo has not been cloned to disk. Cloning...`);
          await this.cloneRepo({
            owner: owner,
            repo: repo,
            baseBranch: baseBranch,
            taskId: taskId,
          });
        }
        const isValidRepo = await this.checkGitRepository({
          dir: p,
          taskId: taskId,
        });
        if (!isValidRepo) {
          log.error(`Something is wrong with the local base branch at ${p}`);
          reject(
            new Error("Local repo base branch is not a valid Github repo"),
          );
        }
        if (existsSync(p)) {
          log.error(`${branchName} already exists!`);
          resolve(false);
        }
        log.info(`Creating new branch ${branchName} on ${p}...`);
        const gitProcess = spawn(
          "git",
          ["worktree", "add", "-b", branchName, `../${branchName}`],
          { stdio: "inherit", cwd: p },
        );

        gitProcess.once("error", (err) => {
          log.error(`Error creating branch: ${err}`);
          reject(err);
        });
        gitProcess.once("exit", (code) => {
          if (code === 0) {
            log.info(
              `Branch ${branchName} on ${owner}/${repo} successfully created`,
            );
            resolve(true);
          } else {
            log.error(`Failed to create the branch. Exit code: ${code}`);
            resolve(false);
          }
        });
      } catch (err) {
        log.error(`Error while creating branch: ${err}`);
        reject();
      }
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
  public async cloneRepo({
    owner,
    repo,
    baseBranch = "main",
    taskId,
  }: {
    owner: string;
    repo: string;
    baseBranch: string;
    taskId: string;
  }): Promise<boolean> {
    const log = new TaskLogger({ logLevel: "debug", taskId: taskId });
    return new Promise(async (resolve, reject) => {
      try {
        const workDir = path.join("./repos", owner, repo, baseBranch);
        log.info(`Cloning ${owner}/${repo} to ${workDir}...`);
        const gitProcess = spawn(
          "git",
          ["clone", `https://github.com/${owner}/${repo}`, workDir],
          { stdio: "inherit", shell: true },
        );
        gitProcess.once("error", (error: any) => {
          log.error(`Error cloning repo:\n${error}`);
          reject();
        });
        gitProcess.once("exit", (code) => {
          if (code === 0) {
            log.info(`Successfully cloned ${owner}/${repo}!`);
            resolve(true);
          } else {
            log.error(`Failed to clone the repo. Exit code: ${code}`);
            resolve(false);
          }
        });
      } catch (error: any) {
        log.error(`There was an error: ${error}`);
        reject();
      }
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
  public async commit({
    owner,
    repo,
    branchName,
    dir,
    message,
    taskId,
  }: {
    owner: string;
    repo: string;
    branchName: string;
    dir: string;
    message: string;
    taskId: string;
  }): Promise<boolean> {
    const log = new TaskLogger({ logLevel: "info", taskId: taskId });

    return new Promise(async (resolve, reject) => {
      try {
        const isRepo = await this.checkGitRepository({
          dir: dir,
          taskId: taskId,
        });
        if (!isRepo) {
          log.error("gitProcess is not in a valid repo directory");
          reject();
        }
        const comms: SpawnCommands[] = [
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
          await this.spawnAsync({
            command: comm.command,
            args: comm.args,
            options: comm.options,
          });
        }
        resolve(true);
      } catch (error) {
        log.error(`Error committing: ${error}`);
        reject();
      }
    });
  }
  /**
   * Validates if the current working directory is a valid Github repo
   * @param {Object} args - Named arguments
   * @param {string} args.dir - The directory to check
   * @param {string} args.taskId - The Task Id
   * @returns {Promise<boolean>} True or False
   */
  private async checkGitRepository({
    dir,
    taskId,
  }: {
    dir: string;
    taskId: string;
  }): Promise<boolean> {
    const log = new TaskLogger({ logLevel: "info", taskId: taskId });
    log.debug(`Checking if ${dir} is a valid repo...`);

    const comm: SpawnCommands = {
      command: "git",
      args: ["rev-parse", "--is-inside-work-tree"],
      options: { stdio: "inherit", cwd: dir },
    };
    return new Promise<boolean>(async (resolve, reject) => {
      try {
        const code = await this.spawnAsync(comm);
        if (code !== 0) {
          log.error(`Cannot validate local repo:\nError code ${code}`);
          resolve(false);
        } else {
          log.info(`${dir} is a valid Github repo!`);
          resolve(true);
        }
      } catch (error) {
        log.error(`Error validating local repo: ${error}`);
        reject();
      }
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
  public async createPR({
    owner,
    repo,
    baseBranch,
    branchName,
    title,
    body,
    taskId,
    num,
  }: {
    owner: string;
    repo: string;
    baseBranch: string;
    branchName: string;
    title: string;
    body: string;
    taskId: string;
    num: string;
  }): Promise<boolean> {
    const dir = path.join("./repos", owner, repo, branchName);
    const log = new TaskLogger({ logLevel: "info", taskId: taskId });
    const issueLink = `https://github.com/${owner}/${repo}/issues/${num}`;
    const comms: SpawnCommands[] = [
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
          body + `\n fixes ${issueLink}`,
        ],
        options: { stdio: "inherit", cwd: dir },
      },
    ];
    return new Promise<boolean>(async (resolve, reject) => {
      try {
        for (const comm of comms) {
          log.debug(
            `Running command ${comm.command} ${comm.args.toString()}...`,
          );
          await this.spawnAsync({
            command: comm.command,
            args: comm.args,
            options: comm.options,
          });
        }
        log.info("Pull request successfully created!");
        resolve(true);
      } catch (err) {
        log.error(`Error creating pull request: ${err}`);
        reject();
      }
    });
  }
  /**
   * Comment on Issue
   */
  public async postIssueComment(
    {event, taskId}:{
      event:IssuesEvent, taskId:string}){
    //es-lint ignore
    const log = new TaskLogger({ logLevel: "info", taskId: taskId });
    let {number, body, user, state, comments, created_at, updated_at} = event.issue 
    if(issuesCommentedOn.includes(number)){
      return new Promise<boolean>(async (resolve, reject)=>{
        log.info("We have already commented on this issue")
        resolve(false)
      })
    }
    let {full_name} = event.repository
      const comm: SpawnCommands = {
        command: "gh",
        args: ["issue","comment",number.toString(),"-R", `https://github.com/${full_name}`, "-b", "OK I will work on this task"],
        options: { stdio: "inherit"},
      };
      return new Promise<boolean>(async (resolve, reject) => {
        try {
          const code = await this.spawnAsync(comm);
          if (code !== 0) {
            issuesCommentedOn.push(number)
            log.error(`Cannot leave comment\nError code ${code}`);
            resolve(false);
          } else {
            issuesCommentedOn.push(number)
            log.info(`We have replied to the comment`);
            resolve(true);
          }
        } catch (error) {
          issuesCommentedOn.push(number)
          log.error(`Error making comment: ${error}`);
          reject();
        }
      });
    }

  /**
   * Comment on PR
   */
}
