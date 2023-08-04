import { ChildProcess, execSync,spawn, spawnSync } from "child_process";
import { existsSync } from "fs";
import { Writable } from "stream";
import  TaskLogger  from "./logger.js";
import path from "path";
import { promisify } from "util";

/**
 * Utility class for interacting with Github and setting up the environment
 */
export default class GithubUtils {
  constructor() {}
  logger = new TaskLogger({ logLevel: "info", taskId: "" });
  /**
   * Checks the GitHub CLI installation and logs the result to the console.
   * If the GitHub CLI is installed, it will print "GitHub CLI is installed."
   * If the GitHub CLI is not installed, it will print "GitHub CLI is not installed."
   * @param} gitProcess - the child gitProcess in which to check GitHub installation.
   */
  public async checkGithubCliInstallation({
    gitProcess,
  }: {
    gitProcess:ChildProcess;
  }): Promise<void> {
    this.logger
      .forTask("Git-install-check")
      .debug("Checking Github installation...");
    try {
      const isInstalled = await new Promise((resolve) => {
        gitProcess.stdin!.write("gh --version");
        gitProcess.once("error", (error: any) => {
          this.logger
            .forTask("Git-install-check")
            .error(`Error with Github installation:\n${error}`);
          //  gitProcess.stdin!.uncork()
          resolve(false);
        });
        gitProcess.once("exit", (code: number) => {
          this.logger
            .forTask("Git-install-check")
            .debug("Github installation OK!");
          //    gitProcess.stdin!.uncork()
          resolve(code === 0);
        });
      });
      if (isInstalled) {
        this.logger.forTask("Git-install-check").info("Github is installed");
      } else {
        throw new Error("GitHub CLI is not installed.");
      }
    } catch (error) {
      this.logger
        .forTask("Git-install-check")
        .error(`Error with Github: ${error}`);
    }
  }
  /**
   * Gets issues from a GitHub repository using the GitHub CLI.
   * @param {string} owner - The owner of the repository.
   * @param {string} repo - The repository name.
   * @param {taskId} taskId - The task uuid.
   * @param {limit} limit - The maximum number of issues to fetch. 20 by default.
   * @param} gitProcess - The child gitProcess in which to run.
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
  public async getIssuesFromRepo({
    owner,
    repo,
    taskId,
    limit = 20,
    gitProcess,
  }: {
    owner: string;
    repo: string;
    taskId: string;
    limit: number;
    gitProcess:ChildProcess;
  }): Promise<any[]> {
    this.logger
      .forTask(taskId)
      .info(`Fetching issues from ${owner}/${repo}...`);
    return new Promise((resolve, reject) => {
      gitProcess.stdin!.write(
        `gh issue list --limit ${limit} --json "assignees,body,comments,createdAt,id,labels,number,state,title,updatedAt"`,
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
          } catch (parseError) {
            reject(parseError);
          }
        } else {
          reject(
            new Error(
              `Failed to fetch issues from the repository.\n${outputData}`,
            ),
          );
        }
      });
    });
  }
  /**
   * Creates a new branch on a GitHub repository and then clones it as a worktree to the local
   * disk. Branches are saved to repos/owner/repo-branchName
   * @param {string} owner - The owner of the repository.
   * @param {string} repo - The repository name.
   * @param {string} baseBranch - The repository base branch name. Defaults to "main".
   * @param {string} branchName - The name of the new branch.
   * @param {string} taskId - The task uuid.
   * @param} gitProcess - The child gitProcess in which to run this
   * @returns {Promise<void>} A Promise that resolves when the branch is successfully created.
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
  public async createBranch({
    owner,
    repo,
    baseBranch = "main",
    branchName,
    taskId,
    gitProcess,
  }: {
    owner: string;
    repo: string;
    baseBranch: string;
    branchName: string;
    taskId: string;
    gitProcess:ChildProcess;
  }): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const workDir = `./repos/${owner}/${repo}`;
      this.logger.forTask(taskId).info(`Checking for repo on local disk..`);
      if (!existsSync(`workDir/${baseBranch}`)) {
        this.logger
          .forTask(taskId)
          .info(`Repo has not been cloned to disk. Cloning...`);
        await this.cloneRepo({
          owner: owner,
          repo: repo,
          baseBranch: baseBranch,
          taskId: taskId,
        //  gitProcess: gitProcess,
        });
      }
      this.logger
        .forTask(taskId)
        .info(
          `Creating branch ${branchName} on ${owner}/${repo}/${branchName}...`,
        );
      gitProcess.stdin!.write(
        `cd ${workDir}/main && git worktree add -b ${branchName} ../${branchName}`,
      );
      gitProcess.stdin!.end();
      gitProcess.once("error", (error) => {
        this.logger.forTask(taskId).error(`Error creating branch`);
        reject(error);
      });
      gitProcess.once("exit", (code) => {
        if (code === 0) {
          this.logger
            .forTask(taskId)
            .info(
              `Branch ${branchName} on ${owner}/${repo} successfully created`,
            );
          resolve();
        } else {
          reject(new Error(`Failed to create the branch. Exit code: ${code}`));
        }
      });
    });
  }
  /**
   * Clones a Github reo to the working directory.
   * @param {string} owner - The owner of the repository.
   * @param {string} repo - The repository name.
   * @param {string} taskId - The task uuid.
   * @returns {Promise<void>} A Promise that resolves when the branch is successfully created.
   * @example
   *
   */
  public async cloneRepo({
    owner,
    repo,
    baseBranch = "main",
    taskId,
 //   gitProcess,
  }: {
    owner: string;
    repo: string;
    baseBranch: string;
    taskId: string;
   // gitProcess: ChildProcess;
  }): Promise<void> {
    try{
    return new Promise(async (resolve, reject) => {
      const workDir = `./repos/${owner}/${repo}/${baseBranch}`;
      const gitProcess = spawn(
        "git",
        ["clone","--progres",`https://github.com/${owner}/${repo}`,workDir],
      {stdio:'inherit', shell:true})

      this.logger
        .forTask(taskId)
        .info(`Cloning ${owner}/${repo} to ${workDir}...`);
       gitProcess.once("error", (error:any) => {
        this.logger.forTask(taskId).error(`Error creating branch`);
        if (error.code == "EPIPE") {
          console.log("Eeeeee pipe")
        }
        reject(error);
      });
      gitProcess.once("exit", (code) => {
        if (code === 0) {
          this.logger
            .forTask(taskId)
            .info(`Branch on ${owner}/${repo} successfully created`);
          resolve();
        } else {
          reject(new Error(`Failed to create the branch. Exit code: ${code}`));
        }
      });
      //gitProcess.stdin!.cork()
      // gitProcess.stdin!.write(`git clone --progress https://github.com/${owner}/${repo} ${workDir}\n`)
       //gitProcess.stdin!.uncork()
    });
  }catch(error:any){
    this.logger.forTask(taskId).error(`There was an error: ${error}`)
  }
  }
  /**
   * Commits changes from local repo to the branch
   * @param {string} message - Commit message
   * @param {string} taskId - The task Id
   * @param} gitProcess - The child gitProcesses to run it in
   * @returns
   */
  public async commit(
    message: string,
    taskId: string,
    gitProcess:ChildProcess,
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const isRepo = await this.checkGitRepository({
        gitProcess: gitProcess,
        taskId: taskId,
      });
      if (!isRepo) {
        this.logger
          .forTask(taskId)
          .error("gitProcess is not in a valid repo directory");
        resolve();
      }
      // stage commits
      gitProcess.stdin!.write("git add .\n");
      // make the commits
      gitProcess.stdin!.write(`git commit -a -m "${message}"\n`);
      gitProcess.stdin!.end();

      gitProcess.once("exit", (code) => {
        if (code !== 0) {
          throw new Error(
            `Error staging changes for commit. Exited with code ${code}`,
          );
        }
        resolve();
      });
      gitProcess.once("error", (error) => {
        this.logger.forTask(taskId).error(`Error creating branch`);
        reject(error);
      });
    });
  }
  /**
   * Validates if the current working directory is a valid Github repo
   * @param} gitProcess - The gitProcess running this
   * @param {string} taskId - The Task Id
   * @returns {boolean} True or False
   */
  private async checkGitRepository({
    gitProcess,
    taskId,
  }: {
    gitProcess: ChildProcess;
    taskId: string;
  }): Promise<boolean> {
    this.logger.forTask(taskId).debug("Checking if dir is a valid repo...");

    return new Promise<boolean>((resolve, reject) => {
      try {
        gitProcess.stdin!.write("git rev-parse --is-inside-work-tree\n");
        gitProcess.stdin!.end();
        gitProcess.once("error", (error) => {
          this.logger.forTask(taskId).error(`Error with local repo:\n${error}`);
          resolve(false);
        });
        gitProcess.once("exit", () => {
          this.logger.forTask(taskId).info("Dir is a valid Github repo!");
          resolve(true);
        });
      } catch (error) {
        this.logger
          .forTask(taskId)
          .error(`Error validating local repo: ${error}`);
        return reject();
      }
    });
  }

  public async createPR(
    baseBranch: string,
    branchName: string,
    title: string,
    body: string,
    gitProcess:ChildProcess,
  ): Promise<void> {
    gitProcess.stdin!.write(`
    cd ../${baseBranch} && 
    gh push -u ../${branchName} && 
    gh pr create --base ${baseBranch} --head ${branchName} --title ${title} --body ${body}`);
  }
}