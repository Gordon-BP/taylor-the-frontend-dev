import { GithubUtils } from "../../src/utils/github_utils.js";
import { TaskLogger } from "../../src/utils/logger";
import { v4 as uuid } from "uuid";
import { ChildProcess, spawn } from "child_process";

describe("GithubUtils", () => {
  const process = spawn("echo", ["spawning new process for tests"],{detached:true});
  beforeAll(() => {
    //clone the github repo
  });
  /**test("should create a new branch", async () => {
    const githubUtils = new GithubUtils();
    await expect(
      githubUtils.createBranch({
        owner: "Gordon-BP",
        repo: "taylor-the-frontend-dev",
        branchName: "bot-test",
        taskId: uuid(),
      }),
    ).resolves.not.toThrow();
  });*/
  const taskId = uuid();
  const logger = new TaskLogger({logLevel:"", taskId:taskId});
  test("github is installed", async () => {
    try {
      const githubUtils = new GithubUtils();
      process.stdin.cork()
      await expect(
        githubUtils.checkGithubCliInstallation({process: process }),
      ).resolves.not.toThrow();
      process.stdin.uncork()
    } catch (error) {
      logger.forTask(taskId).error(`Error! ${error}`);
    }
  });
  test("can clone a repo", async () => {
    try{
      const githubUtils = new GithubUtils();
      process.stdin.cork()
      await expect(
        githubUtils.cloneRepo({
          owner:"Gordon-BP",
          repo: "taylor-test-repo",
          baseBranch: "main",
          taskId: taskId,
          process:process
        })
      ).resolves.not.toThrow();
      process.stdin.uncork()
    } catch (error){
      logger.forTask(taskId)
    }
  }, 10000)
});
