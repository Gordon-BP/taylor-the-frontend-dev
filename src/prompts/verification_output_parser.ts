import { AgentActionOutputParser } from "langchain/agents";
import { AgentAction, AgentFinish } from "langchain/schema";

export default class VerifyOutputParser extends AgentActionOutputParser {
  lc_namespace = ["langchain", "agents", "custom_llm_agent_chat"];

  async parse(text: string): Promise<AgentAction | AgentFinish> {
    if (text.includes("```javascript")) {
      const parts = text.split("```javascript");
      const input = parts[parts.length - 1].trim();
      const finalAnswers = { output: input };
      return { log: text, returnValues: finalAnswers };
    }

    const match = /Action: (.*)\nAction Input: (.*)/s.exec(text);
    if (!match) {
      throw new Error(`Could not parse LLM output: ${text}`);
    }

    return {
      tool: match[1].trim(),
      toolInput: match[2].trim().replace(/^"+|"+$/g, ""),
      log: text,
    };
  }

  getFormatInstructions(): string {
    throw new Error("Not implemented");
  }
}
