# Taylor the Junior Dev!

An AI-powered software dev that does some pretty cool things!
App ID 364693

## To-do list
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
- [ ] Better webhook hosting than ngrok
- [ ] Clean up your server-side logging

**Task Generation**
- [ ] Fetch info
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
> Do we _have_ to require the LLM to write Javascript? Like, the code it writes will only be consuming APIs. It'll write additional code in strings, but there's no set reason why it has to use JS/TS to call those APIs, right?
- [ ] Verification bash script
    - [ ] Lint check fixes whatever it can automatically
    - [ ] Return any errors back to the LLM
- [ ] Run the code ⚠️ oooh scary
    - [ ] Return any errors back to the LLM

**Self Validation**
> I'm also on team agent for this part, too. It should be able to read any and all files, as well as the logs, to determine if the task is passed or not.
- [ ] Read file tool
- [ ] Get the last 10 or so logs (omit unnecessary info like taskID, service)
- [ ] Return pass/fail

**Client Service**
Very much need a proper client service to consume these APIs with. I can more clearly understand the nodes & flows, and having all the steps as API services is really helpful. However, one client is needed per issue for the following reason:
1. Client-side logs will be automatically scoped to the issue/task ID
2. Client can listen for webhooks, too, when tasks are pending PR review, comment clarification, or GH automatic checks
3. Server-Client structure is better suited for having 100+ clients running at once.

**Other Notes 'N Stuff**
* Web research retriever
    - will need to implement on your own with https://serpapi.com/integrations/node and LLM chain
* HNSWlib indices https://js.langchain.com/docs/modules/data_connection/vectorstores/integrations/hnswlib
    - node_modules/.bin/jsdoc -c jsdoc.conf.json -X ./src > jsdoc-ast.json
    - consider what metadata to filter on https://js.langchain.com/docs/modules/data_connection/retrievers/how_to/self_query/hnswlib-self-query
* Consider also just doing a standard postgres database with PGVector. It will work better with scale anyways, and you can have a different (persistent) table for each repo. 

Eval will _always_ be agent

**Agent or chain ?**
For code gen as chain:
    ================== Loop 1
    - Task gen makes something super simple like "Read the index.html"
        * 11 LLM Calls
    - Code gen writes something like (readFile(index.html).then(output ={logger.info(output)}))
        * 1 LLM call
    - Evaluator looks at codebase, determines the issues is not resolved
        * 2 - 3 LLM Calls
    ================== Loop 2
    - Task gen makes something more specific like "Rewrite the function foo to return bar instead of baz" 
        * 11 LLM calls- 5 questions, 5 answers, 1 task gen
    - Code gen writes something like(
        readFile(index.html).then(output =>{
            newOutput = <text manipulations to replace the exact function>
            writeFile('/owner/repo/branch/index.html, newOutput)
        }).
    )
        * 1 LLM call
    - Evaluator looks at codebase, determines issue is resolved
        * 2 - 3 LLM calls
    **Total LLM Calls: 28 - 30**
For code gen as agent:
    ================= Loop 1
    - Task gen makes something more specific like "Rewrite the function foo in index.html to return bar instead"
        * 11 LLM calls
    - Code gen decomposes it into sub-subtasks:
        ============== Sub-Loop 1:
        - Code gen makes super simple task like "Open index.html"
            * 1 LLM call
        - Code gen uses the readFile tool to get the file data
            * 1 LLM call
        ============== Sub-Loop 2:
        - Code gen makes a super simple task like "Write new code to file"
            * 1 LLM call
        - Code gen uses the writeFile tool to overwrite the file
            * 1 LLM call
    - Evaluator looks at codebase, determines issues is resolved
        * 2 - 3 LLM calls
    **Total LLM Calls: 17 - 18**