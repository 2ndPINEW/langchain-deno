import { conversation } from "../../utils/gpt.ts";
import { Action } from "../agent.ts";
import { Tool } from "./tool.ts";

export class GptAPI implements Tool {
  name: string;

  description: string;

  modelName: string;

  openAIApiKey!: string;

  constructor(modelName: string) {
    this.name = "chat-bot";
    this.description =
      "You can answer a wide variety of message, In addition to asking questions, they can also greet you, engage in natural conversation, and offer advice! but you are not good at conversations about recent events.";
    this.modelName = modelName;
  }

  async call(action: Action): Promise<string> {
    const data = await conversation({
      openAIApiKey: this.openAIApiKey,
      history: action.history,
      input: action.userInput,
      role: "user",
    });
    return data;
  }
}
