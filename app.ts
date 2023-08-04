/**
 * Do typescript projects even have a main?
 */
import { spawn } from 'child_process';
import { v4 as uuid } from "uuid";
import GithubUtils  from './src/utils/github_utils.js'
function runCloneRepo() {
  // Replace these values with the repository details you want to clone
  const owner = 'Gordon-BP';
  const repo = 'taylor-test-repo';
  const baseBranch = 'main'; // Replace with the desired base branch
  const taskId = uuid()

  const githubUtils = new GithubUtils();

  // Use 'spawn' to create a child process
  const gitProcess = spawn('git', [], {
    stdio: 'inherit', // This will show the output of the git commands in the terminal
  });

  // Call the cloneRepo method
  githubUtils
    .cloneRepo({
      owner,
      repo,
      baseBranch,
      taskId, 
      //gitProcess,
    })
    .catch((error) => {
      console.error('Error cloning repository:', error);
    });
}

runCloneRepo();
