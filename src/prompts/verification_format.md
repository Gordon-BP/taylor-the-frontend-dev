For both the main task and the sub-task, you need to respond to me with:

**reasoning:** An explanation for your decision about whether the task was completed or not.

**success:** true if the task has been successfully completed, false if it has not

**critique:** If the task was not successfully completed, this should contain guidance about what I can do next. If the task was successful, leave this blank.


You will respond only in JSON format like this:
[
    "main_task":{
        reasoning:"reasoning",
        success:boolean,
        critique:"critique"
    },
    "sub_task":{
        reasoning:"reasoning",
        success:boolean,
        critique:"critique"
    }
]