# Website Builder!

A langchain project that can build a website for me.

## Problem Statement:
I need a website for my small business, Hanakano Consulting LLC. However, I don't know enough about react, HTML, or CSS to build one myself. Also my wife forgot how to build a website. Also I don't want to pay someone else to build it for me, or lock myself into a template from one of the big website builders.

## The Solution:
Build an LLM to write the website for me!

## But How?
1. Create a github app for the LLM, and add it to my website repo
    * Consider uing StarCoder as the LLM
2. Build a nice little postgresql database and fill it with documentation for:
    * [Next.js](https://github.com/vercel/next.js/tree/canary/docs)
    * [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss.com/tree/master/src/pages/docs)
    * Consider implmenting [PGEmbedding](https://python.langchain.com/docs/modules/data_connection/vectorstores/integrations/pgembedding) for faster retrieval times
    * Consider free tier of [Neon](https://neon.tech)
3. Add tools:
    * [Github](https://python.langchain.com/docs/modules/agents/toolkits/github)
    * [Vectorstore Agent](https://python.langchain.com/docs/modules/agents/toolkits/vectorstore)
    * [DDG Search](https://python.langchain.com/docs/modules/agents/tools/integrations/ddg)
4. Dockerize and host the agent
    * Consider [AWS EC2 Free Tier](https://aws.amazon.com/ec2/pricing/?p=ft&c=containers&z=3)
5. Begin making issues on the website github repo and watch the LLM get to work!

## Questions to answer before starting:
1. What kind of website do you want? Create scope and exact details
2. Will I be able to code-review the bot or are all PRs going to be merged automatically?
3. What service am I going to use to host this bot? GCP? AWS? Azure?