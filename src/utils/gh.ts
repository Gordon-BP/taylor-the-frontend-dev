import { spawn } from "child_process";
import { Writable } from "stream";
/**
 * Utility class for interacting with Github and setting up the environment
 */
class GithubUtils {
  constructor() {
    // Perform the check for GitHub CLI installation during object initialization
    this.checkGithubCliInstallation();
  }

  /**
   * Checks the GitHub CLI installation and logs the result to the console.
   * If the GitHub CLI is installed, it will print "GitHub CLI is installed."
   * If the GitHub CLI is not installed, it will print "GitHub CLI is not installed."
   */
  private async checkGithubCliInstallation(): Promise<void> {
    try {
      const isInstalled = await new Promise((resolve) => {
        const childProcess = spawn("gh", ["--version"]);
        childProcess.on("error", () => {
          resolve(false);
        });
        childProcess.on("exit", (code) => {
          resolve(code === 0);
        });
      });
      if (isInstalled) {
        console.log("GitHub CLI is installed ✅");
      } else {
        throw new Error("GitHub CLI is not installed.");
      }
    } catch (error) {
      console.error("Error checking GitHub CLI installation:", error);
    }
  }
  /**
   * Gets issues from a GitHub repository using the GitHub CLI.
   * @param {string} owner - The owner of the repository.
   * @param {string} repo - The repository name.
   * @returns {Promise<any[]>} A Promise that resolves to an array of issues in JSON format.
   * @example
   * const github = new GithubUtils();
   * try{
   *    const issues = await githubUtils.getIssuesFromRepo({
   *        owner: "github-username",
   *        repo: "my-repository-name"});
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
  }: {
    owner: string;
    repo: string;
  }): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const childProcess = spawn("gh", [
        "issue",
        "list",
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
        reject(error);
      });

      childProcess.on("exit", (code) => {
        if (code === 0) {
          try {
            const outputData = Buffer.concat(chunks).toString();
            const issues = JSON.parse(outputData);
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
   * @returns {Promise<void>} A Promise that resolves when the branch is successfully created.
   * @example
   * const github = new GithubUtils();
   * try {
   *   await github.createBranch({
   *    owner: "github-user",
   *    repo: "my-repository-name",
   *    branchName: "my-new-branch"
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
  }: {
    owner: string;
    repo: string;
    branchName: string;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      const childProcess = spawn("gh", [
        "repo",
        "create",
        `${owner}/${repo}`,
        "--branch",
        branchName,
      ]);

      childProcess.on("error", (error) => {
        reject(error);
      });

      childProcess.on("exit", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Failed to create the branch. Exit code: ${code}`));
        }
      });
    });
  }
}
