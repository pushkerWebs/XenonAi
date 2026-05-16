import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from "@langchain/core/messages";
import { ChatMistralAI } from "@langchain/mistralai";
import { searchInternet } from "./internet.service.js";

export const AI_MODELS = {
  GEMINI: "gemini-flash-latest",
  MISTRAL: "mistral-small-latest",
};

let geminiModel;
let mistralModel;

const getGeminiModel = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY environment variable");
  }

  if (!geminiModel) {
    geminiModel = new ChatGoogleGenerativeAI({
      model: AI_MODELS.GEMINI,
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  return geminiModel;
};

const getMistralModel = () => {
  if (!process.env.MISTRAL_API_KEY) {
    throw new Error("Missing MISTRAL_API_KEY environment variable");
  }

  if (!mistralModel) {
    mistralModel = new ChatMistralAI({
      model: AI_MODELS.MISTRAL,
      apiKey: process.env.MISTRAL_API_KEY,
    });
  }

  return mistralModel;
};

const MODEL_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 60000);
const ENABLE_WEB_SEARCH = process.env.ENABLE_WEB_SEARCH !== "false";

const withTimeout = async (promise, timeoutMs, timeoutMessage) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    }),
  ]);
};

const pickModel = (selectedModel) => {
  if (selectedModel === AI_MODELS.MISTRAL && process.env.MISTRAL_API_KEY) {
    return { model: getMistralModel(), name: AI_MODELS.MISTRAL };
  }

  return { model: getGeminiModel(), name: AI_MODELS.GEMINI };
};

const getFallbackModel = (selectedModel) => {
  if (selectedModel === AI_MODELS.MISTRAL || !process.env.MISTRAL_API_KEY) {
    return { model: getGeminiModel(), name: AI_MODELS.GEMINI };
  }

  return { model: getMistralModel(), name: AI_MODELS.MISTRAL };
};

// Helper to safely invoke a model with fallback
async function safeInvoke(messages, selectedModel, timeoutMs) {
  const primary = pickModel(selectedModel);
  const fallback = getFallbackModel(selectedModel);

  try {
    const result = await withTimeout(
      primary.model.invoke(messages),
      timeoutMs,
      "Primary model timed out"
    );
    return { result, modelUsed: primary.name, wasFallback: false, rateLimited: false };
  } catch (primaryError) {
    const isRateLimit = primaryError?.status === 429 || /429|quota|rate.?limit/i.test(primaryError?.message || "");
    console.warn(`⚠️ Primary model (${primary.name}) failed${isRateLimit ? " (RATE LIMITED)" : ""}:`, primaryError.message);

    try {
      const result = await withTimeout(
        fallback.model.invoke(messages),
        timeoutMs,
        "Fallback model timed out"
      );
      return { result, modelUsed: fallback.name, wasFallback: true, rateLimited: isRateLimit };
    } catch (fallbackError) {
      console.error("❌ Fallback model also failed:", fallbackError.message);
      throw fallbackError;
    }
  }
}

// Helper to extract text from LangChain response
function extractText(response) {
  return response?.text || response?.content || "";
}

/**
 * Build message content for Gemini multimodal (image RAG).
 * Builds multimodal image content array for Gemini HumanMessage.
 * Handles multiple images by adding each as an image_url entry.
 */
function buildImageContent(lastMessageContent, imageDocuments, textDocuments) {
  const parts = [];

  // Add any text documents as context text first
  if (textDocuments.length > 0) {
    const textContext = textDocuments
      .map((d) => `Document "${d.filename}":\n${d.text}`)
      .join("\n\n---\n\n");
    parts.push({
      type: "text",
      text: `The user has uploaded the following files. Use them to answer the question.\n\n${textContext}\n\nUser message: ${lastMessageContent}`,
    });
  } else {
    parts.push({
      type: "text",
      text: `The user has uploaded image(s). Please analyze them carefully and answer the question.\n\nUser message: ${lastMessageContent}`,
    });
  }

  // Add each image
  for (const img of imageDocuments) {
    parts.push({
      type: "image_url",
      image_url: `data:${img.mimeType};base64,${img.imageBase64}`,
    });
  }

  return parts;
}

function shouldSearchInternet(query) {
  if (!ENABLE_WEB_SEARCH) {
    return false;
  }

  const normalizedQuery = String(query || "").toLowerCase().trim();
  if (!normalizedQuery) {
    return false;
  }

  const alwaysSearchPatterns = [
    /\b(latest|current|today|news|breaking|price|weather|score|results?|update|recent|now)\b/,
    /\b(compare|review|rank|stat(s|istics)?|forecast|forecasts|population|exchange rate|currency|stock|crypt(o|ocurrency))\b/,
    /\b(2024|2025|2026)\b/,
  ];

  return alwaysSearchPatterns.some((pattern) => pattern.test(normalizedQuery));
}

export async function generateResponse(
  messages,
  selectedModel = AI_MODELS.GEMINI,
  documentContexts = null   // { documents: Array, hasImages: boolean } | null
) {
  try {
    const lastMsg = messages[messages.length - 1];
    const prevMsg = messages[messages.length - 2];

    let finalQuery = lastMsg?.content || "";

    if (
      lastMsg?.role === "user" &&
      lastMsg.content.split(" ").length <= 2 &&
      prevMsg
    ) {
      finalQuery = `${prevMsg.content} ${lastMsg.content}`.trim();
    }

    // Skip internet search when documents are attached — they are the primary context
    let searchResults = "";
    let searchError = "";
    if (!documentContexts) {
      const ignoreWords = ["hi", "hello", "hey", "ok", "thanks", "bye", "yes", "no"];
      const shouldSearch = finalQuery.length > 3 &&
        !ignoreWords.includes(finalQuery.toLowerCase().trim()) &&
        shouldSearchInternet(finalQuery);

      if (shouldSearch) {
        const searchResponse = await searchInternet({ query: finalQuery });
        searchResults = searchResponse?.text || "";
        searchError = searchResponse?.error || "";
      }
    }

    // ── Build system prompt ───────────────────────────────────────────────
    let systemPrompt = "";
    const textDocs = documentContexts?.documents?.filter((d) => !d.isImage) || [];
    const imageDocs = documentContexts?.documents?.filter((d) => d.isImage) || [];
    const hasAnyDocs = documentContexts?.documents?.length > 0;

    if (imageDocs.length > 0) {
      // Image RAG — Gemini handles this multimodally
      const imageNames = imageDocs.map((d) => `"${d.filename}"`).join(", ");
      systemPrompt = `You are Xenon, a highly capable assistant with vision capabilities.
The user has uploaded image(s): ${imageNames}. Analyze them carefully and answer their question based on what you observe.

FORMATTING RULES (ALWAYS FOLLOW):
- Use relevant emojis at the start of key points and section headers (e.g. 🔍 📊 💡 ✅ ⚡ 📌 🎯 🔑 📝)
- After the introduction paragraph, insert a horizontal rule (---) as a separator
- Insert --- before each major section header to create clear visual breaks
- Keep spacing tight — do NOT add excessive blank lines, just one blank line between sections
- Use bullet points or numbered lists instead of long paragraphs
- Break information into clear sections with ## headers when the answer is detailed
- Never write everything in a single long paragraph — use line breaks generously
- Use **bold** for important terms and key takeaways
- Keep each bullet point concise (1-2 lines max)
- Use markdown formatting for readability`;
    } else if (textDocs.length > 0) {
      // Text document RAG — inject all docs as context blocks
      const docSections = textDocs
        .map((d) => `---\n📄 "${d.filename}":\n${d.text}`)
        .join("\n\n");

      systemPrompt = searchResults
        ? `You are Xenon. The user has provided document(s) AND you have real-time internet data.

MANDATORY INSTRUCTIONS:
- The DOCUMENT CONTEXT below is the user's uploaded file(s) — treat it as the primary source of truth for document-specific questions
- The SEARCH RESULTS below contain live internet data for broader factual questions
- Combine both sources intelligently

FORMATTING RULES (ALWAYS FOLLOW):
- Use relevant emojis at the start of key points and section headers (e.g. 📄 🔍 📊 💡 ✅ ⚡ 📌)
- After the introduction paragraph, insert a horizontal rule (---) as a separator
- Insert --- before each major section header to create clear visual breaks
- Keep spacing tight — do NOT add excessive blank lines, just one blank line between sections
- Use bullet points or numbered lists instead of long paragraphs
- Break information into clear sections with ## headers when the answer is detailed
- Never write everything in a single long paragraph — use line breaks generously
- Use **bold** for important terms and key takeaways
- Keep each bullet point concise (1-2 lines max)

DOCUMENT CONTEXT:
${docSections}
---

REAL-TIME SEARCH RESULTS:
---
${searchResults}
---

Answer the user's question using the above sources.`
        : `You are Xenon. The user has uploaded document(s). Use the content below as your primary knowledge source.

MANDATORY INSTRUCTIONS:
- Answer based on the DOCUMENT CONTEXT provided
- Reference specific parts of the documents where relevant
- If the question is not covered by the documents, say so and answer from training data

FORMATTING RULES (ALWAYS FOLLOW):
- Use relevant emojis at the start of key points and section headers (e.g. 📄 🔍 📊 💡 ✅ ⚡ 📌)
- After the introduction paragraph, insert a horizontal rule (---) as a separator
- Insert --- before each major section header to create clear visual breaks
- Keep spacing tight — do NOT add excessive blank lines, just one blank line between sections
- Use bullet points or numbered lists instead of long paragraphs
- Break information into clear sections with ## headers when the answer is detailed
- Never write everything in a single long paragraph — use line breaks generously
- Use **bold** for important terms and key takeaways
- Keep each bullet point concise (1-2 lines max)

DOCUMENT CONTEXT:
${docSections}
---

Answer the user's question based on the documents above.`;
    } else if (searchResults) {
      systemPrompt = `You are Xenon, a real-time AI assistant. You have access to LIVE internet data provided below.

YOUR #1 RULE: The search results below were fetched from the internet JUST NOW in real-time. They contain the MOST UP-TO-DATE information available. You MUST use them as your PRIMARY source of truth.

MANDATORY INSTRUCTIONS:
- READ the search results carefully before answering
- EXTRACT relevant facts, names, dates, and details from the search results
- CITE information from search results in your answer
- If search results say X happened, then X happened — trust the search results over your training data
- NEVER say "my training data only goes up to..." or "I don't have info after..."
- NEVER say "I cannot verify" — the search results ARE the verification
- If the user asks about something and the search results contain the answer, GIVE THE ANSWER CONFIDENTLY

FORMATTING RULES (ALWAYS FOLLOW):
- Use relevant emojis at the start of key points and section headers (e.g. 🌐 🔍 📊 💡 ✅ ⚡ 📰 🎯)
- After the introduction paragraph, insert a horizontal rule (---) as a separator
- Insert --- before each major section header to create clear visual breaks
- Keep spacing tight — do NOT add excessive blank lines, just one blank line between sections
- Use bullet points or numbered lists instead of long paragraphs
- Break information into clear sections with ## headers when the answer is detailed
- Never write everything in a single long paragraph — use line breaks generously
- Use **bold** for important terms and key takeaways
- Keep each bullet point concise (1-2 lines max)

REAL-TIME SEARCH RESULTS (fetched just now):
---
${searchResults}
---

Answer the user's question based on the search results above. Be specific, accurate, and helpful.`;
    } else if (searchError) {
      systemPrompt = `You are Xenon, a helpful assistant.

IMPORTANT:
- A web search was attempted but returned no usable results
- Do not fabricate current facts or pretend you fetched web data
- If the user clearly needs live internet data, say that web search is unavailable right now and ask them to try again
- Otherwise, answer from general knowledge only if the question does not require current information

FORMATTING RULES (ALWAYS FOLLOW):
- Use relevant emojis naturally
- Keep the answer short and clear
- If you cannot answer confidently without live data, say so directly

SEARCH ERROR:
${searchError}`;
    } else {
      systemPrompt = `You are Xenon, a helpful and knowledgeable assistant.

FORMATTING RULES (ALWAYS FOLLOW):
- Use relevant emojis at the start of key points and section headers (e.g. 💡 ✅ ⚡ 📌 🎯 🔑 📝 🤔)
- After the introduction paragraph, insert a horizontal rule (---) as a separator
- Insert --- before each major section header to create clear visual breaks
- Keep spacing tight — do NOT add excessive blank lines, just one blank line between sections
- Use bullet points or numbered lists instead of long paragraphs
- Break information into clear sections with ## headers when the answer is detailed
- Never write everything in a single long paragraph — use line breaks generously
- Use **bold** for important terms and key takeaways
- Keep each bullet point concise (1-2 lines max)
- For short greetings or simple answers, still use emojis naturally (e.g. "👋 Hello! How can I help you today?")`;
    }

    // ── Format messages for LangChain ─────────────────────────────────────
    const formattedMessages = messages
      .map((msg, idx) => {
        if (msg.role === "user") {
          // For the LAST user message with images, inject multimodal content (Gemini only)
          if (
            idx === messages.length - 1 &&
            imageDocs.length > 0 &&
            selectedModel === AI_MODELS.GEMINI
          ) {
            return new HumanMessage({
              content: buildImageContent(msg.content, imageDocs, textDocs),
            });
          }
          return new HumanMessage(msg.content);
        }
        if (msg.role === "ai" || msg.role === "assistant") {
          return new AIMessage(msg.content);
        }
        return null;
      })
      .filter(Boolean);

    const { result: response, modelUsed, wasFallback, rateLimited } = await safeInvoke(
      [new SystemMessage(systemPrompt), ...formattedMessages],
      selectedModel,
      MODEL_TIMEOUT_MS
    );

    const result = extractText(response);
    return {
      text: result || "No response generated.",
      modelUsed,
      wasFallback,
      rateLimited,
    };
  } catch (error) {
    console.error("❌ AI Error:", error.message);
    return {
      text: "Something went wrong. Please try again.",
      modelUsed: "unknown",
      wasFallback: false,
      rateLimited: false,
    };
  }
}

// ✅ Chat title generator
export async function generateChatTitle(message) {
  try {
    const cleaned = String(message || "")
      .replace(/[\n\r]+/g, " ")
      .replace(/[^\w\s-]/g, "")
      .trim();

    if (!cleaned) {
      return "New Chat";
    }

    const title = cleaned
      .split(/\s+/)
      .slice(0, 4)
      .join(" ")
      .replace(/^./, (char) => char.toUpperCase());

    return title || "New Chat";
  } catch (error) {
    console.error("❌ Title generation failed:", error.message);
    return "New Chat";
  }
}