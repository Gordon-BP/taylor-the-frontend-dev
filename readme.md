# Taylor the Junior Dev!

An AI-powered software dev that does some pretty cool things!
App ID 364693

## To-do list

**Self Validation**
> I'm also on team agent for this part, too. It should be able to read any and all files, as well as the logs, to determine if the task is passed or not.
- [ ] Verification bash script
    - [ ] Lint check fixes whatever it can automatically
    - [ ] Return any errors back to the LLM
- [ ] Run the code ⚠️ oooh scary
    - [ ] Return any errors back to the LLM
- [X] Read file tool
- [ ] Get the last 10 or so logs (omit unnecessary info like taskID, service)
- [ ] Return pass/fail

**DevOps Things**
- [ ] Dockerize app
- [ ] Better webhook hosting than ngrok
- [ ] Clean up your server-side logging

## Done ✅ Tasks
**Github Utilities:** --Almost there!
- [x] Clone repo
- [x] Create new branch
- [x] Stage, Commit, and Push combo
- [x] Create Pull Request
- [x] Get Issue
- [x] Listen for issue creation
- [x] Listen for pull request updates
- [x] Comment on issue
- [x] auth as app <- BIG WIN

✅ DONE WITH GITHUB ✅


**Primitive Skills:**
- [x] Read file
- [x] Write or Create File
- [x] Delete File
- [x] Get Directory Tree
- [x] Tests for file skills

✅ DONE WITH PRIMITIVES ✅

**Other Utilities**
- [x] Stream task-specific logs to a task-specific file
- [x] Implement API Client service

**Task Generation**
- [~] Fetch info
    - [x] Dir tree
    - [x] Past tasks passed
    - [x] Past tasks failed
    - [ ] Reference from docs (pushed to v0.0.2)
- [x] Generate Questions
- [x] Answer questions
- [x] Use all info to make task
- [x] Return task as single string

✅ DONE WITH TASK GENERATION ✅ (for now)

**Code Generation**
> Now I'm back on team agent for this part. While simple stuff (like changing a README file) can be done in one shot, bug-fixing and small tweaks require a loop of Read File > Analyze > Make changes. We can either pass the contents of all the files into the LLM context, or we can let it read whatever files it wants.
- [x] Fetch info
    - [x] Dir tree
    - [~] Relevant docs (pushed to v0.0.2)
- [ ] Skills library
    - [x] Primitive skills
    - [ ] LLM's own custom skills
- [x] Save code to a file
✅ DONE WITH CODE GENERATION ✅ (for now)

> Do we _have_ to require the LLM to write Javascript? Like, the code it writes will only be consuming APIs. It'll write additional code in strings, but there's no set reason why it has to use JS/TS to call those APIs, right?

## Other Notes 'N Stuff
* Web research retriever
    - will need to implement on your own with https://serpapi.com/integrations/node and LLM chain
* HNSWlib indices https://js.langchain.com/docs/modules/data_connection/vectorstores/integrations/hnswlib
    - node_modules/.bin/jsdoc -c jsdoc.conf.json -X ./src > jsdoc-ast.json
    - consider what metadata to filter on https://js.langchain.com/docs/modules/data_connection/retrievers/how_to/self_query/hnswlib-self-query
* Consider also just doing a standard postgres database with PGVector. It will work better with scale anyways, and you can have a different (persistent) table for each repo. 
* Since this "bot" makes calls to models on external systems, can I run this on a free GCP VM? Or an old iPhone?