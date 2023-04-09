import { OpenAI } from "langchain";
import { ConversationChain } from "langchain/chains";
import { BufferMemory, ChatMessageHistory } from "langchain/memory";
import { AIChatMessage, HumanChatMessage } from "langchain/schema";
import { Tool } from "./tools/tool.ts";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface Action {
  tool: string;
  toolInput: string;
  userInput: string;
  agentLog: string;
  toolLog: { operation: string; detail: string }[];
  history: ChatMessage[];
}

const PREFIX = `You are the assistant to choose the tool. You have access to the following tools`;
const formatInstructions = (
  toolNames: string,
  input: string
) => `Please select the tool you should use for the following messages and chat history.
Message: ${input}


Use the following format:

Action: the action to take, should be one of [${toolNames}]
Action Input: the input to the action
<END_OF_LINE>`;

export class MyAgent {
  openAIApiKey: string;
  modelName: string;
  tools: Tool[];

  actionHistory: Action[] = [];

  constructor(args: {
    openAIApiKey: string;
    modelName: string;
    tools: Tool[];
  }) {
    this.openAIApiKey = args.openAIApiKey;
    this.modelName = args.modelName;
    this.tools = args.tools;
  }

  async executeAction(action: Action): Promise<string> {
    const tool =
      this.tools.find((tool) => tool.name === action.tool) ?? this.tools[0];
    tool.openAIApiKey = this.openAIApiKey;
    this.actionHistory.push(JSON.parse(JSON.stringify(action)));
    try {
      const toolOutput = await tool.call(action);
      return toolOutput;
    } catch (e) {
      console.error("Error while tool calling: ", e);
      action.tool = this.tools[0].name;
      return await this.executeAction(action);
    }
  }

  async decideAction(args: {
    input: string;
    history: ChatMessage[];
  }): Promise<Action> {
    const model = new OpenAI({
      streaming: true,
      openAIApiKey: this.openAIApiKey,
      modelName: this.modelName,
    });

    const agentHistory = args.history.map((message) => {
      return message.role === "assistant"
        ? new AIChatMessage(message.content)
        : new HumanChatMessage(message.content);
    });
    const agentMemory = new BufferMemory({
      returnMessages: true,
      chatHistory: new ChatMessageHistory(
        agentHistory.length === 0 ? undefined : agentHistory
      ),
    });

    const chain = new ConversationChain({ llm: model, memory: agentMemory });

    const prompt = this.agentPrompt(args);
    const res = await chain.call({ input: prompt });

    const action = this.parseAgent(res.response, args.input, args.history);
    return action;
  }

  agentPrompt = (args: { input: string }) => {
    const toolStrings = this.tools
      .map((tool) => `${tool.name}: ${tool.description}`)
      .join("\n");
    const toolNames = this.tools.map((tool) => tool.name).join("\n");

    const instructions = formatInstructions(toolNames, args.input);
    const template = [PREFIX, toolStrings, instructions].join("\n\n");
    return template;
  };

  parseAgent = (
    text: string,
    input: string,
    history: ChatMessage[]
  ): Action => {
    const matcher =
      /Action: (?<action>.*)\nAction Input: (?<actionInput>.*)\n<END_OF_LINE>/;
    const match = text.match(matcher);
    if (!match) {
      return {
        tool: "None",
        toolInput: "",
        userInput: input,
        agentLog: text,
        toolLog: [],
        history: history,
      };
    }

    const action: Action = {
      tool: match.groups?.action ?? "None",
      toolInput: match.groups?.actionInput ?? input,
      userInput: input,
      agentLog: text,
      toolLog: [],
      history: history,
    };

    return action;
  };
}
