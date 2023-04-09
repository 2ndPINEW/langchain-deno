import { HandlerContext } from "$fresh/server.ts";
import { ChatMessage, MyAgent } from "../../agents/agent.ts";
import { GptAPI } from "../../agents/tools/gpt.ts";
import { SearchAPI } from "../../agents/tools/search.ts";

export const handler = async (
  req: Request,
  _ctx: HandlerContext
): Promise<Response> => {
  const request = await req.json();
  const headers = req.headers;

  const openAIApiKey = headers.get("openai-api-key");
  const googleApiKey = headers.get("google-api-key");
  const googleCustomSearchEngineId = headers.get(
    "google-custom-search-engine-id"
  );

  if (!openAIApiKey || !googleApiKey || !googleCustomSearchEngineId) {
    return new Response("Missing API keys", {
      status: 400,
      headers: {
        "content-type": "text/plain",
      },
    });
  }
  const input = request.input;
  if (!input) {
    return new Response("Missing input", {
      status: 400,
      headers: {
        "content-type": "text/plain",
      },
    });
  }

  const messages: ChatMessage[] = request.messages || [];

  const agent = new MyAgent({
    openAIApiKey: openAIApiKey,
    modelName: "gpt-3.5-turbo",
    tools: [
      new GptAPI("gpt-3.5-turbo"),
      new SearchAPI({
        googleApiKey: googleApiKey,
        googleCustomSearchEngineId: googleCustomSearchEngineId,
      }),
    ],
  });
  const action = await agent.decideAction({
    input: input,
    history: messages,
  });
  console.log({
    tool: action.tool,
    toolInput: action.toolInput,
    userInput: action.userInput,
  });

  const actionRes = await agent.executeAction(action);

  messages.push({ role: "user", content: input });
  messages.push({ role: "assistant", content: actionRes });

  const res = {
    messages: messages,
    actions: agent.actionHistory,
  };

  return new Response(JSON.stringify(res), {
    headers: {
      "content-type": "application/json",
    },
  });
};
