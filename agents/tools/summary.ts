import { Action } from "../agent.ts";
import { Tool } from "./tool.ts";
import { extractFromHtml } from "article-extractor";

export class SummaryAPI implements Tool {
  name: string;

  description: string;

  openAIApiKey!: string;

  constructor() {
    this.name = "summarizer";
    this.description = "Process url. Summarize the article.";
  }

  async call(action: Action): Promise<string> {
    if (!action.userInput.startsWith("https://")) {
      return "no url";
    }
    const result = await this.articleSummaryResult(action.userInput, action);
    return result ?? "記事の要約を提供することができません";
  }

  async fetch(url: string, action: Action): Promise<string> {
    const res = await fetch(url);
    const html = await res.text();
    action.toolLog.push({ operation: "fetch article", detail: url });
    return html;
  }

  async extractArticle(
    html: string,
    url: string,
    action: Action
  ): Promise<string> {
    const article = await extractFromHtml(html, url);

    if (!article?.content) {
      return "No content found.";
    }

    action.toolLog.push({ operation: "extract article", detail: url });
    article.content = article.content
      .replace(/(<[^>]+>|\{[^}]+\})/g, "")
      .replaceAll("\n", "   ");
    return article.content;
  }

  async promptGpt(prompt: string): Promise<string> {
    const chatHistory = [{ content: prompt, role: "user" }];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.openAIApiKey}`,
      },
      body: JSON.stringify({
        messages: chatHistory,
        model: "gpt-3.5-turbo",
      }),
    });
    const data = await res.json();
    return data.choices[0].message.content;
  }

  async articleSummaryResult(
    url: string,
    action: Action
  ): Promise<string | undefined> {
    try {
      const html = await this.fetch(url, action);
      const article = await this.extractArticle(html, url, action);
      const result = await this.promptGpt(
        `以下の記事の内容をよく読んで要約してください。また、回答は日本語でしてください\n${article}`
      );
      action.history.push({ role: "system", content: article });
      return result;
    } catch {
      return undefined;
    }
  }
}
