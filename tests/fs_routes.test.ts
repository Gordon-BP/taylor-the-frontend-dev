import request from "supertest";
import { v4 as uuid } from "uuid";
import express from 'express'
import App from "../src/App.js"

const endpoint = "localhost:3000/app/v1"; //should probably be configurable from an env
const app = App
const task_id = "tests_" + uuid()
describe("GET /status", () =>{
  test("Check overall server status 200", async ()=>{
    const response = await request(app).get(`/app/v1/status`)
    expect(response.status).toBe(200)
  })
  test("Check file server status", async () =>{
    const response = await request(app).get(`/app/v1/files/status`)
    expect(response.status).toBe(200)
  })
})
describe("GET /:owner/:repo/:branchName/:filePath", () => {
  const test_endpoint = "/app/v1/files/Gordon-BP/taylor-test-repo/test-es"
  test("read the file data with 200 status code", async () => {
    return request(app)
    .get(test_endpoint+"/testFile.txt")
    .send({taskId:task_id}).then(data =>{
      expect(data.status).toBe(200);
      expect(data.body.data).toBe("I like blue and red and puppies and yellow");
    })
    
    
  });

  test("should return 500 status code if the file doesn't exist", async () => {
    // Mock the open function to return null (file not found)
    const response = await request(app)
      .get(test_endpoint+"/fakeFile.txt")
      .send({ taskId: task_id });

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Error while reading file:Error: ENOENT: no such file or directory, open 'repos/Gordon-BP/taylor-test-repo/test-es/fakeFile.txt'");
  });
});

describe("POST /:owner/:repo/:branchName/writeFile", () => {
  const test_endpoint = "/app/v1/files/Gordon-BP/taylor-test-repo/test-es/writeFile";
  test("should write to an existing file and return 200 status code", async () => {
    const response = await request(app)
    .post(test_endpoint).send({
      filePath: "testFile.txt",
      data: "I like blue and red and puppies and yellow",
      taskId: task_id,
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("File write successful");
  });

  test("should create new file or directory, then write the file and return 200 status code", async () => {

    const response = await request(app).post(test_endpoint).send({
      filePath: "newTestFile.txt",
      data: "test content",
      taskId: task_id,
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("File write successful");
  });

  test("should return 500 status code if file cannot be written/created", async () => {
    // Mock the open function to throw an error
    jest.mock("fs/promises", () => ({
      open: jest.fn().mockRejectedValue(new Error("Some error")),
      mkdir: jest.fn().mockResolvedValue(undefined),
    }));

    const response = await request(app).post(test_endpoint).send({
      filePath: "",
      data: "your file content",
      taskId: task_id,
    });

    expect(response.status).toBe(500);
    expect(response.body.message).toBe(
      "Error writing file- see logs for details",
    );
  });
});
describe("DELETE /:owner/:repo/:branchName/deleteFile", ()=>{
  const test_endpoint = "/app/v1/files/Gordon-BP/taylor-test-repo/test-es/deleteFile";
  test("Should delete the file created by previous test", async ()=>{
    const response = await request(app).delete(test_endpoint).send({
      filePath: "newTestFile.txt",
      taskId: task_id,
    });
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("File successfully deleted");
  });
  test("Should error when a file cannot be found or deleted", async ()=>{
    const response = await request(app).delete(test_endpoint).send({
      filePath: "newTestFile.txt",
      taskId: task_id,
    });
    expect(response.status).toBe(500);
    expect(response.body.message).toBe(
      "Error deleting file repos/Gordon-BP/taylor-test-repo/test-es/newTestFile.txt "+
      "Error: ENOENT: no such file or directory, stat 'repos/Gordon-BP/taylor-test-repo/test-es/newTestFile.txt'"
    );
  });
});