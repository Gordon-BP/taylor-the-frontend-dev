"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Do typescript projects even have a main?
 */
const child_process_1 = require("child_process");
const github_utils_1 = require("./utils/github_utils");
const uuid_1 = require("uuid");
function runCloneRepo() {
    // Replace these values with the repository details you want to clone
    const owner = 'Gordon-BP';
    const repo = 'taylor-test-repo';
    const baseBranch = 'main'; // Replace with the desired base branch
    const taskId = (0, uuid_1.v4)();
    const githubUtils = new github_utils_1.GithubUtils();
    // Use 'spawn' to create a child process
    const process = (0, child_process_1.spawn)('git', [], {
        stdio: 'inherit', // This will show the output of the git commands in the terminal
    });
    // Call the cloneRepo method
    githubUtils
        .cloneRepo({
        owner,
        repo,
        baseBranch,
        taskId,
        process,
    })
        .catch((error) => {
        console.error('Error cloning repository:', error);
    });
}
runCloneRepo();
