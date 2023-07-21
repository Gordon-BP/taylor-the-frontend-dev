from dotenv import load_dotenv
load_dotenv(".env")
from modded_github import GitHubAPIWrapper
from langchain.agents import AgentType
from langchain.agents import initialize_agent
from langchain.agents.agent_toolkits.github.toolkit import GitHubToolkit
from langchain.llms import OpenAI
#from langchain.utilities.github import GitHubAPIWrapper

llm = OpenAI(temperature=0)
github = GitHubAPIWrapper()
issues = github.get_issues()
print(issues)
toolkit = GitHubToolkit.from_github_api_wrapper(github)
agent = initialize_agent(
    toolkit.get_tools(), llm, agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION, verbose=True
)
agent.run(
"""
You are an experienced frontend developer tasked with completing issues on a github repository.
Please look at the existing issues and complete them.
"""
)