export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export const conversation = async (args: {
  openAIApiKey: string;
  history?: ChatMessage[];
  input: string;
  role: ChatMessage["role"];
  modelName?: string;
}): Promise<string> => {
  const chatHistory = args.history
    ? JSON.parse(JSON.stringify(args.history))
    : [];
  chatHistory.push({ content: args.input, role: args.role });
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.openAIApiKey}`,
    },
    body: JSON.stringify({
      messages: chatHistory,
      model: args.modelName ?? "gpt-3.5-turbo",
    }),
  });

  // if (args.action) {
  //   args.action.toolLog.push({
  //     operation: "use model",
  //     detail: args.modelName ?? "gpt-3.5-turbo",
  //   });
  // }

  const data = await res.json();

  return data.choices[0].message.content;
};
