import { tavily as Tavily } from "@tavily/core";

const tavily = process.env.TAVILY_API_KEY
  ? Tavily({
      apiKey: process.env.TAVILY_API_KEY,
    })
  : null;

const SEARCH_TIMEOUT_MS = Number(process.env.SEARCH_TIMEOUT_MS || 8000);

const withTimeout = async (promise, timeoutMs, timeoutMessage) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    }),
  ]);
};

export const searchInternet = async ({ query }) => {
  if (!tavily) {
    return {
      text: "",
      error: "Web search is disabled because TAVILY_API_KEY is missing.",
    };
  }

  try {
    const result = await withTimeout(
      tavily.search(query, {
        maxResults: 5,
      }),
      SEARCH_TIMEOUT_MS,
      "Internet search timed out"
    );

    // Extract useful text
    const text = (result.results || [])
      .map((r, i) => `${i + 1}. ${r.title}\n${r.content}`)
      .join("\n\n");

    return {
      text,
      error: text ? null : "No useful search results were returned.",
    };
  } catch (error) {
    console.warn("Search Error:", error.message);
    return {
      text: "",
      error: error.message || "Internet search failed.",
    };
  }
};