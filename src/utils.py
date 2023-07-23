from dotenv import load_dotenv
load_dotenv(".env")
import os
from langchain.agents import AgentType
from langchain.agents import initialize_agent, Tool
from langchain.agents.agent_toolkits.github.toolkit import GitHubToolkit
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import PGEmbedding
from load_data import load_mdx_files
from langchain.llms import OpenAI
from langchain.chat_models import ChatOpenAI
from langchain.chains import RetrievalQA
from langchain.utilities.github import GitHubAPIWrapper


def add_docs(store:PGEmbedding)-> None:
    """
    Loads documents from docs/ and puts them in the vectorstore

    Parameters:
        store(PGEmbedding): the vectorstore object
    Returns:
        Nothing!
    """
    docs = load_mdx_files("docs/")
    print(f"There are {len(docs)} docs!")
    # SQLAlchemy times out if we try to do everything at once
    # So we need to embed & insert docs in chunks of 100
    for i in range(0, len(docs), 100):
        print(f"Embedding docs {i} - {i+100}")
        chunk = docs[i:i + 100]
        store.from_documents(
            embedding=OpenAIEmbeddings(),
            documents=chunk,
            collection_name="website_docs",
            connection_string=os.environ.get("DATABASE_URL"),
            pre_delete_collection=False #Change to true to start from scratch
    )
def make_retrieval_tool(store:PGEmbedding)->RetrievalQA:
    """
    Creates a retriever from the vectorstore

    Parameters:
        store(PGEmbedding): The vectorstore
    Returns:
        RetrievalQA: a retrieval object
    """
    return RetrievalQA.from_chain_type(
        llm = OpenAI(temperature=0),
        chain_type="stuff",
        retriever = store.as_retriever()
    )
if __name__ == "__main__":
    # First, init the vectorstore
    store = PGEmbedding(
        embedding_function = OpenAIEmbeddings(),
        connection_string = os.environ['DATABASE_URL'],
        collection_name = "website_docs",
        pre_delete_collection = False # Set to True if you want to start over
    )
    # add_docs(store) #Danger! Only do this once!
    # Until Langchain gets updated, you have to use Gordy's custom GitHubAPIWrapper
    github = GitHubAPIWrapper()
    retriever = make_retrieval_tool(store)
    # TODO: make this a pydantic class with input schema
    tools = [
        Tool(
            name="Search Next.js and Tailwind CSS Documentation",
            func=retriever.run,
            description="Useful for when you need to search the documentation for Next.js or Tailwind CSS. Input should be a search query.",
        ),
    ]
    toolkit = GitHubToolkit.from_github_api_wrapper(github)
    tools += toolkit.get_tools()
    agent = initialize_agent(
        tools, 
        llm=ChatOpenAI(), # TODO: Add an option for a code-specific LLM like starcoder
        agent=AgentType.CHAT_ZERO_SHOT_REACT_DESCRIPTION, 
        verbose=True
    )
    prompt = """
    You are an experienced frontend developer tasked with completing issues on a github repository.
    This repository is for a website built using Next.js and Tailwind CSS.
    You have been assigned the task of completing issues.
    Look at the existing issues and find one you can complete. If you are unsure about any code,
    check the documentation.
    Once you have completed an issue, create a new pull request.
    """
    agent.run(prompt)