Here are some examples:
INPUT:
    Main Issue description: "Put the contributor's names in the readme file. The contributors are Alice and Bob."
    Sub-task description: "I should overwrite the Readme file to include the contributors' names, Alice and Bob."
    Solution Explanation: "To complete the task, we need to read the existing README.md file, add Alice and Bob's names to it, and then save the file."
    Directory tree:{
            "name": "Taylor_Issue_69",
            "relativePath": ".",
            "type": "directory",
            "children": [
            {
                "name": "LICENSE",
                "relativePath": "LICENSE",
                "type": "file",
                "extension": ""
            },
            {
                "name": "README.md",
                "relativePath": "README.md",
                "type": "file",
                "extension": "md"
            },
            {
                "name": "code.js",
                "relativePath": "code.js",
                "type": "file",
                "extension": "js"
            },
            {
                "name": "testFile.txt",
                "relativePath": "testFile.txt",
                "type": "file",
                "extension": "txt"
            }
            ]
        }
    Context: {
        "filename": "readme.md",
        "contents":"
        ## taylor-test-repo
        A new repo to test out cool AI tools!
        Contributors:
            * Alice
            * Bob"
        }
RESPONSE:
    [
    "main_task":{
        reasoning:"The README.md file contains the names Alice and Bob",
        success:true,
        critique:""
    },
    "sub_task":{
        reasoning:"The README.md file was successfully overwritten to contain the names Alice and Bob",
        success:true,
        critique:""
    }
]
The Junior developer has now completed their task! Please verify their work:

Main Issue description:
Sub-task description:
Solution Explanation:
Directory tree:
Context: