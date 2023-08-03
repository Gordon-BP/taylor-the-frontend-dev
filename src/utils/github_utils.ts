import { spawn } from "child_process";
import { Writable } from "stream";
import { LogLevel, TaskLogger } from "./logger";
/**
 * Utility class for interacting with Github and setting up the environment
 */
export class GithubUtils {
  constructor() {
    // Perform the check for GitHub CLI installation during object initialization
    this.checkGithubCliInstallation();
  }
  logger = new TaskLogger(LogLevel.INFO);
  /**
   * Checks the GitHub CLI installation and logs the result to the console.
   * If the GitHub CLI is installed, it will print "GitHub CLI is installed."
   * If the GitHub CLI is not installed, it will print "GitHub CLI is not installed."
   */
  private async checkGithubCliInstallation(): Promise<void> {
    this.logger
      .forTask("Git-install-check")
      .debug("Checking Github installation...");
    try {
      const isInstalled = await new Promise((resolve) => {
        const childProcess = spawn("gh", ["--version"]);
        childProcess.on("error", (error) => {
          this.logger
            .forTask("Git-install-check")
            .error(`Error with Github installation:\n${error}`);
          resolve(false);
        });
        childProcess.on("exit", (code) => {
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
    limit = 20
  }: {
    owner: string;
    repo: string;
    taskId: string;
    limit: number;
  }): Promise<any[]> {
    this.logger
      .forTask(taskId)
      .info(`Fetching issues from ${owner}/${repo}...`);
    return new Promise((resolve, reject) => {
      const childProcess = spawn("gh", [
        "issue",
        "list",
        "--limit",
        limit.toString(),
        "--json",
        `{"owner": "${owner}", "repo": "${repo}"}`,
      ]);
      const chunks: any[] = [];
      const writableStream = new Writable({
        write(chunk, encoding, next) {
          chunks.push(chunk);
          next();
        },
      });
      childProcess.stdout.pipe(writableStream);

      childProcess.on("error", (error) => {
        this.logger
          .forTask(taskId)
          .error(`Error etching issues from ${owner}/${repo}:\n${error}`);
        reject(error);
      });

      childProcess.on("exit", (code) => {
        if (code === 0) {
          try {
            const outputData = Buffer.concat(chunks).toString();
            const issues = JSON.parse(outputData);
            this.logger.forTask(taskId).info(`Successfully fetched issues!`);
            resolve(issues);
          } catch (parseError) {
            reject(parseError);
          }
        } else {
          reject(
            new Error(
              `Failed to fetch issues from the repository. Exit code: ${code}`,
            ),
          );
        }
      });
    });
  }
  /**
   * Creates a new branch on a GitHub repository using the GitHub CLI.
   * @param {string} owner - The owner of the repository.
   * @param {string} repo - The repository name.
   * @param {string} branchName - The name of the new branch.
   * @param {string} taskId - The task uuid.
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
    branchName,
    taskId
  }: {
    owner: string;
    repo: string;
    branchName: string;
    taskId: string;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.forTask(taskId).info(`Creating branch ${branchName} on ${owner}/${repo}...`);
      const childProcess = spawn("gh", [
        "repo",
        "create",
        `${owner}/${repo}`,
        "--branch",
        branchName,
      ]);

      childProcess.on("error", (error) => {
        this.logger.forTask(taskId).error(`Error creating branch`);
        reject(error);
      });

      childProcess.on("exit", (code) => {
        if (code === 0) {
          this.logger.forTask(taskId).info(`Branch ${branchName} on ${owner}/${repo} successfully created`);
          resolve();
        } else {
          reject(new Error(`Failed to create the branch. Exit code: ${code}`));
        }
      });
    });
  }
}
