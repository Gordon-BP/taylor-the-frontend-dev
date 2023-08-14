import axios, {AxiosRequestConfig } from "axios";
import path from "node:path";
import Task from "./Task";
const endpoint = "http://127.0.0.1:3000/app/v1";
export interface FileData {
    path: string;
    data: string;
  }
/**
 * Removes the first directory from a file path.
 * 
 * @param {string} filepath - The file path to modify.
 * @returns {string} The modified file path without the first directory.
 */
function popFirstDir(filepath:string) {
  const normalPath = path.normalize(filepath);
  const parts = normalPath.split(path.sep);

  // Remove the first directory
  parts.shift();

  // Join the parts back into a path
  return parts.join(path.sep);
}
/**
 * Retrieves the contents of multiple files specified by their file paths.
 * 
 * @param paths - An array of file paths.
 * @param taskId - The task ID for identification purposes.
 * @returns A promise that resolves with a string containing the concatenated contents of all the files.
 */
export function readFiles(paths: string[], taskId: string): Promise<string> {
    let fileContent = "";
    var updatedFilepath = ""
    const promises = paths.map((filePath) => {
      if (/\.\/repos/.test(filePath)) {
        updatedFilepath = popFirstDir(filePath)
      }else{
        updatedFilepath = filePath
      }
      return axios.get(`${endpoint}/files/${filePath}`, {
        data: {
          taskId: taskId,
        },
      });
    });
    return new Promise((resolve, reject) => {
      Promise.all(promises)
        .then((responses) => {
          const fileContents = responses.map((response) => response.data);
          fileContent = fileContents.join("\n");
          resolve(fileContent);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
/**
 * Writes files to the specified paths using a POST request.
 * 
 * @param fileData - An array of objects representing the files to be written. Each object should have a `path` property indicating the path where the file should be written, and a `data` property containing the content of the file.
 * @param task - An object containing information about the task being performed, including the `owner` (repository owner), `repo` (repository name), `branchName` (name of the branch), and `id` (task ID).
 * @returns A string indicating whether the files were successfully written or if there was an error.
 */
export function writeFiles(fileData: FileData[], task: Task): string {
  let resp = "";
  var updatedFilepath = ""
  const {owner, repo, branchName, id} = task
  const promises = fileData.map((file) => {
    if (/\.\/repos/.test(file.path)) {
      updatedFilepath = popFirstDir(file.path)
    }else{
      updatedFilepath = file.path
    }
    const fileWriteConfig:AxiosRequestConfig={
      method:'POST',
      url:`${endpoint}/files/${owner}/${repo}/${branchName}/writeFile`,
      headers:{
        "Content-Type":"application/json"
      },
      params:{owner: owner,
        repo: repo,
        branchName: branchName,},
        data:{ filePath: "./"+updatedFilepath,
          data: file.data,
          taskId: id,}
    }
    return axios(fileWriteConfig);
  });
  Promise.all(promises)
    .then((responses) => {
      console.log(responses)
      resp = `Files successfully written:\n${responses}`;
    })
    .catch((err) => {
      console.error(err)
      resp = `Error writing files: ${err}`;
    });
  return resp;
}
/**
 * Submits the given data as a file for writing.
 * 
 * @param data The content of the file to be written.
 * @param task The task associated with the file.
 * @returns A string indicating the response from the file writing operation.
 */
export function submit(data: string, task: Task): string {
  const resp = writeFiles([{ path: "/tmp/tmp.js", data: data }], task);
  return resp;
}