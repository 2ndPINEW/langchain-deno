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
    const chatHistory = JSON.parse(JSON.stringify(action.history));
    chatHistory.push({ content: action.userInput, role: "user" });
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.openAIApiKey}`,
      },
      body: JSON.stringify({
        messages: chatHistory,
        model: this.modelName,
      }),
    });
    action.toolLog.push({ operation: "use model", detail: this.modelName });
    const data = await res.json();
    return data.choices[0].message.content;
  }
}
