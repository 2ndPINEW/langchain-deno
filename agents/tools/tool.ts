import { Action } from "../agent.ts";

export declare abstract class Tool {
  constructor();
  abstract call(action: Action): Promise<string>;
  abstract name: string;
  abstract description: string;
  abstract openAIApiKey: string;
}
