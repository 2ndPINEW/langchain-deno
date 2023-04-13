import { Action } from "../agent.ts";
import { Tool } from "./tool.ts";
import { google } from "googleapis";
import { extractFromHtml } from "article-extractor";
import { conversation } from "../../utils/gpt.ts";

export class SearchAPI implements Tool {
  name: string;

  description: string;

  openAIApiKey!: string;

  googleApiKey: string;
  googleCustomSearchEngineId: string;

  constructor(options: {
    googleApiKey: string;
    googleCustomSearchEngineId: string;
  }) {
    this.name = "search";
    this.description = "Search for what is happening now.";
    this.googleApiKey = options.googleApiKey;
    this.googleCustomSearchEngineId = options.googleCustomSearchEngineId;
  }

  async call(action: Action): Promise<string> {
    const searchResult = await this.customSearch(action.toolInput);
    if (!searchResult) throw new Error("No result found.");
    const results = await Promise.all(
      searchResult.map((result) => {
        const url = result.formattedUrl ?? "";
        return this.articleResult(url, action);
      })
    );
    const resultList = results.map((result) => `・${result}`).join("\n");
    const prompt = `'${action.userInput}'この質問に対して、以下の検索結果から答えてください。回答はなるべく自然な言葉遣いになるようにしてください。
    \n${resultList}
    `;
    const finalAnswer = await conversation({
      openAIApiKey: this.openAIApiKey,
      input: prompt,
      role: "user",
    });
    return finalAnswer;
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

  async isValidArticle(action: Action, article: string): Promise<boolean> {
    const prompt = `Determine if the text you have entered provides information to answer the question text.
Question: ${action.toolInput}
Text: ${article}


Use the following format:

Yes or No`;

    const result = await conversation({
      openAIApiKey: this.openAIApiKey,
      input: prompt,
      role: "user",
    });
    if (result.includes("Yes")) return true;
    return false;
  }

  async findResultFromArticle(
    action: Action,
    article: string
  ): Promise<string> {
    const prompt = `以下の質問に対する回答を与えられた文章の中から探して答えてください。回答は日本語でしてください。
質問: ${action.userInput}
文章: ${article}`;
    const result = await conversation({
      openAIApiKey: this.openAIApiKey,
      input: prompt,
      role: "user",
    });
    return result;
  }

  async customSearch(q: string) {
    const customSearch = google.customsearch("v1");
    const result = await customSearch.cse.list({
      auth: this.googleApiKey,
      cx: this.googleCustomSearchEngineId,
      q: q,
      num: 10,
    });
    return result.data.items;
  }

  async articleResult(
    url: string,
    action: Action
  ): Promise<string | undefined> {
    try {
      const html = await this.fetch(url, action);
      const article = await this.extractArticle(html, url, action);
      const isValidArticle = await this.isValidArticle(action, article);
      if (!isValidArticle) {
        return undefined;
      }
      const result = await this.findResultFromArticle(action, article);
      action.toolLog.push({
        operation: "find result from article",
        detail: result,
      });
      return result;
    } catch {
      return undefined;
    }
  }
}
