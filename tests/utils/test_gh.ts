import { GithubUtils } from "./src/utils/github_utils.ts"
import {v4 as uuid } from "uuid"

describe('GithubUtils', () => {
    test('should create a new branch', async () => {
    const githubUtils = new GithubUtils();
    await expect(githubUtils.createBranch({
        owner:"Gordon-BP",
        repo:"taylor-the-frontend-dev",
        branchName:"bot-test",
        limit:20,
        taskId: uuid()
    })).resolves.not.toThrow();
  });

    test('should fetch issues from a repository', async () => {
    const githubUtils = new GithubUtils();
    const issues = await githubUtils.getIssues({
        owner:"langchain-ai",
    repo:"langchain",
    taskId: uuid(),
    limit:20,
    });

    expect(Array.isArray(issues)).toBe(true);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toHaveProperty('title');
    expect(issues[0]).toHaveProperty('number');
    // Add more specific assertions based on the shape of your issues data
  });

  // Add more unit tests for other methods if needed

    test('should throw an error if GitHub CLI is not installed', () => {
    // Mock the checkGithubCliInstallation method to always throw an error
    jest.spyOn(GithubUtils.prototype, 'checkGithubCliInstallation').mockRejectedValue(new Error('GitHub CLI not found'));

    expect(() => new GithubUtils()).toThrow('GitHub CLI not found');
  });

  // Add more error scenarios to test if the methods throw errors appropriately
});
