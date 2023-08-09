import { DynamicStructuredTool } from "langchain/tools";
import {
  BaseChatPromptTemplate,
  BasePromptTemplate,
  SerializedBasePromptTemplate,
  renderTemplate,
} from "langchain/prompts";
import {
  BaseMessage,
  HumanMessage,
  InputValues,
  PartialValues,
} from "langchain/schema";
import { readFile } from "fs/promises";
interface PromptArray {
  prefix: string;
  instructions: any;
  suffix: string;
}
async function load_prompts(): Promise<PromptArray> {
  const PREFIX = await readFile("src/prompts/code_gen_prefix.md", "utf8");
  const format_prompt = await readFile(
    "src/prompts/code_gen_format.md",
    "utf8",
  );
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  const formatInstructions = (toolNames: string) => format_prompt;
  const SUFFIX = await readFile("src/prompts/code_gen_suffix.md", "utf8");
  return { prefix: PREFIX, instructions: formatInstructions, suffix: SUFFIX };
}

export default class CodePromptTemplate extends BaseChatPromptTemplate {
  tools: DynamicStructuredTool[];

  constructor(args: {
    tools: DynamicStructuredTool[];
    inputVariables: string[];
  }) {
    super({ inputVariables: args.inputVariables });
    this.tools = args.tools;
  }

  _getPromptType(): string {
    return "BaseChatPromptTemplate";
  }

  async formatMessages(values: InputValues): Promise<BaseMessage[]> {
    /** Construct the final template */
    const toolStrings = this.tools
      .map((tool) => `${tool.name}: ${tool.description}`)
      .join("\n");
    const toolNames = this.tools.map((tool) => tool.name).join("\n");
    const pr = await load_prompts();
    const instructions = pr.instructions(toolNames);
    const template = [pr.prefix, toolStrings, instructions, pr.suffix].join(
      "\n\n",
    );

    /** Format the template. */
    const {
      0: { previousCode },
      1: { codeError },
      2: { recentLogs },
      3: { description },
      4: { tree },
      5: { feedback },
    } = values;
    const result = {
      previousCode,
      codeError,
      recentLogs,
      description,
      tree,
      feedback,
    };
    if (result.description.length == 0) {
      throw new Error("No description!");
    }

    const formatted = renderTemplate(template, "f-string", result);

    return [new HumanMessage(formatted)];
  }

  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  partial(_values: PartialValues): Promise<BasePromptTemplate> {
    throw new Error("Partial not implemented");
  }

  serialize(): SerializedBasePromptTemplate {
    throw new Error("Serialize not implemented");
  }
}
