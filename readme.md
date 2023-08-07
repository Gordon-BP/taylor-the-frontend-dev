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
- [ ] Log on client side only
    - Stream logs to file by taskId 2>>logs/taskId.txt
- [ ] Better webhook hosting than ngrok

**AI Stuff**
- [ ] Automatic curriculum
    INPUTS:
        1. Issue title and body
        2. Repo dir tree as JSON
        3. Dynamic Q&A
        4. Possibly relevant web data?
        5. Past tasks and their results as JSON
    OUTPUTS:
        1. A single task
- [ ] Web research retriever
    - will need to implement on your own with https://serpapi.com/integrations/node and LLM chain
- [ ] HNSWlib indices https://js.langchain.com/docs/modules/data_connection/vectorstores/integrations/hnswlib
    - node_modules/.bin/jsdoc -c jsdoc.conf.json -X ./src > jsdoc-ast.json
    - consider what metadata to filter on https://js.langchain.com/docs/modules/data_connection/retrievers/how_to/self_query/hnswlib-self-query
- [ ] Code generator
    INPUTS:
        1. Task
        2. Repo dir tree as JSON
        3. Primitive skills
        4. Possibly relevant skills from library
        5. Possibly relevant web data
    OUTPUTS:
        1. Tool to use with input
    
- [ ] Self validation