import { GithubUtils } from "../../src/utils/github_utils";
import { v4 as uuid } from "uuid";


beforeAll(()=>{
  //clone the github repo
})
describe("GithubUtils", () => {
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

  test("github is installed", async () => {
    const githubUtils = new GithubUtils();
    expect(githubUtils.checkGithubCliInstallation())
    .resolves.not.toThrow()
  })

  test("should fetch issues from a repository", async () => {
    const githubUtils = new GithubUtils();
    const issues = await githubUtils.getIssuesFromRepo({
      owner: "langchain-ai",
      repo: "langchain",
      taskId: uuid(),
      limit: 15,
    });

    expect(Array.isArray(issues)).toBe(true);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toHaveProperty("title");
    expect(issues[0]).toHaveProperty("number");
    // Add more specific assertions based on the shape of your issues data
  });
});
