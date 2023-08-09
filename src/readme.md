A brief explanation of where everything is:

## Utils
These are helper functions and classes, which get called by the routes to do stuff.

## Routes
These are the individual API routes for doing each section of the action loop. There's one for Github tasks, one for file tasks, one for code generation, one for task generation. There will also be one for task verification but that's still in progress.

## Prompts
These are both the prompt templates (.md files) and the output parsers + template formatters for our two custom agents, code gen and verification. Should probably separate those out into different folders....

## Agents
These actually don't do anything yet. In the future, this will be the retriever and skill manager