import { ChildProcess, spawn } from "child_process";
import { promisify } from 'util';
import { existsSync } from 'fs';
import { Writable } from "stream";
import { LogLevel, TaskLogger } from "./logger";
const execAsync = promisify(require('child_process').exec);
/**
 * Utility class for interacting with Github and setting up the environment
 */
export class GithubUtils {
   constructor(){}
  logger = new TaskLogger(LogLevel.INFO);
  /**
   * Checks the GitHub CLI installation and logs the result to the console.
   * If the GitHub CLI is installed, it will print "GitHub CLI is installed."
   * If the GitHub CLI is not installed, it will print "GitHub CLI is not installed."
   * @param {ChildProcess} process - the child process in which to check GitHub installation.
   */
  public async checkGithubCliInstallation({process}:{process:ChildProcess}): Promise<void> {
    this.logger
      .forTask("Git-install-check")
      .debug("Checking Github installation...");
    try {
      const isInstalled = await new Promise((resolve) => {
        process.stdin!.write("gh --version");
        process.stdin!.end();
        process.once("error", (error) => {
          this.logger
            .forTask("Git-install-check")
            .error(`Error with Github installation:\n${error}`);
          resolve(false);
        });
        process.once("exit", (code) => {
          this.logger
            .forTask("Git-install-check")
            .debug("Github installation OK!");
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
   * @param {ChildProcess} process - The child process in which to run.
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
    process
  }: {
    owner: string;
    repo: string;
    taskId: string;
    limit: number;
    process: ChildProcess
  }): Promise<any[]> {
    this.logger
      .forTask(taskId)
      .info(`Fetching issues from ${owner}/${repo}...`);
    return new Promise((resolve, reject) => {
      process.stdin!.write(`gh issue list --limit ${limit} --json "assignees,body,comments,createdAt,id,labels,number,state,title,updatedAt"`);
      process.stdin!.end();
      const chunks: any[] = [];
      const writableStream = new Writable({
        write(chunk, encoding, next) {
          console.log(chunk)
          chunks.push(chunk);
          next();
        },
      });
      process.stdout?.pipe(writableStream);
      
      process.once("error", (error) => {
        this.logger
          .forTask(taskId)
          .error(`Error etching issues from ${owner}/${repo}:\n${error}`);
        reject(error);
      });

      process.once("exit", (code) => {
        const outputData = Buffer.concat(chunks).toString();
        this.logger.forTask(taskId).info(outputData)
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
   * @param {ChildProcess} process - The child process in which to run this
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
    process
  }: {
    owner: string;
    repo: string;
    baseBranch: string
    branchName: string;
    taskId: string;
    process: ChildProcess
  }): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const workDir = `./repos/${owner}/${repo}`
      this.logger.forTask(taskId).info(`Checking for repo on local disk..`);
      if (!existsSync(`workDir/${baseBranch}`)) {
        this.logger.forTask(taskId).info(`Repo has not been cloned to disk. Cloning...`)
        await this.cloneRepo({owner:owner, repo:repo, baseBranch:baseBranch,taskId:taskId})
      }
      this.logger.forTask(taskId).info(`Creating branch ${branchName} on ${owner}/${repo}/${branchName}...`);
      process.stdin!.write(`cd ${workDir}/main && git worktree add -b ${branchName} ../${branchName}`)
      process.stdin!.end();
      process.once("error", (error) => {
        this.logger.forTask(taskId).error(`Error creating branch`);
        reject(error);
      });
      process.once("exit", (code) => {
        if (code === 0) {
          this.logger.forTask(taskId).info(`Branch ${branchName} on ${owner}/${repo} successfully created`);
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
    baseBranch='main',
    taskId
  }: {
    owner: string;
    repo: string;
    baseBranch:string;
    taskId: string;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.forTask(taskId).info(`Cloning ${owner}/${repo} to working dir...`);
      process.stdin!.write(`cd ./repos && git clone https://github.com/${owner}/${repo} ${owner}/${repo}/${baseBranch}`)
      process.stdin!.end();
      process.once("error", (error) => {
        this.logger.forTask(taskId).error(`Error creating branch`);
        reject(error);
      });

      process.once("exit", (code) => {
        if (code === 0) {
          this.logger.forTask(taskId).info(`Branch on ${owner}/${repo} successfully created`);
          resolve();
        } else {
          reject(new Error(`Failed to create the branch. Exit code: ${code}`));
        }
      });
    });
  }
  public async commit(message: string, taskId:string, process:ChildProcess):Promise<void>{
    return new Promise(async (resolve, reject) =>{
        await this.checkGitRepository(process);
         // Run 'git add .' to stage all changes for commit
         process.stdin!.write('git add .\n');
         process.stdin!.write(`git commit -a -m "${message}"\n`);
         process.stdin!.end(); // Signal the end of input

        process.once('exit', (code) => {
             if (code !== 0) {
               throw new Error('Error staging changes for commit.');
             }
             resolve()
           });
           process.once("error", (error) => {
            this.logger.forTask(taskId).error(`Error creating branch`);
            reject(error);
          });
});
}
    
      private async checkGitRepository(process: ChildProcess): Promise<void> {
        // Run 'git rev-parse --is-inside-work-tree' to check if the current directory is a Git repository
        process.stdin!.write('git rev-parse --is-inside-work-tree\n');
        process.stdin!.end(); // Signal the end of input
        await new Promise<void>((resolve) => {
          process.once('exit', (code) => {
            if (code !== 0) {
              throw new Error('Current directory is not a Git repository.');
            }
            resolve();
          });
        });
      }
    

    
  public async createPR(
   baseBranch:string, branchName:string, title:string, body:string, process:ChildProcess
  ):Promise<void>{
    process.stdin!.write(`
    cd ../${baseBranch} && 
    gh push -u ../${branchName} && 
    gh pr create --base ${baseBranch} --head ${branchName} --title ${title} --body ${body}`)
  }
}
