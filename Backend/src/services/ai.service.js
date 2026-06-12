import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from "@langchain/core/messages";
import { ChatMistralAI } from "@langchain/mistralai";
import { searchInternet } from "./internet.service.js";

export const AI_MODELS = {
  GEMINI: "gemini-2.0-flash", // Default compatibility alias
  GEMINI_2_0_FLASH: "gemini-2.0-flash",
  GEMINI_2_0_FLASH_LITE: "gemini-2.0-flash-lite",
  GEMINI_2_5_PRO: "gemini-2.5-pro",
  MISTRAL: "mistral-small-latest",
};

// Separate vision model instance — always Gemini 2.0 Flash regardless of the
// user's text model selection. Images are silently dropped by Mistral.
const GEMINI_VISION_MODEL_ID = "gemini-2.0-flash";

const geminiModels = {};
let geminiVisionModel;
let mistralModel;

const getGeminiModel = (modelId = AI_MODELS.GEMINI_2_0_FLASH) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY environment variable");
  }

  // Validate or fallback to default Gemini model ID
  const validGeminiIds = [
    AI_MODELS.GEMINI,
    "gemini-2.5-flash", // support old database entries
    AI_MODELS.GEMINI_2_0_FLASH,
    AI_MODELS.GEMINI_2_0_FLASH_LITE,
    AI_MODELS.GEMINI_2_5_PRO,
  ];
  const targetId = validGeminiIds.includes(modelId) ? modelId : AI_MODELS.GEMINI_2_0_FLASH;

  if (!geminiModels[targetId]) {
    geminiModels[targetId] = new ChatGoogleGenerativeAI({
      model: targetId,
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  return geminiModels[targetId];
};

// Always returns a Gemini vision-capable model, regardless of user selection.
const getGeminiVisionModel = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY environment variable");
  }

  if (!geminiVisionModel) {
    geminiVisionModel = new ChatGoogleGenerativeAI({
      model: GEMINI_VISION_MODEL_ID,
      apiKey: process.env.GEMINI_API_KEY,
    });
    console.log(`🔭 Gemini vision model initialised: ${GEMINI_VISION_MODEL_ID}`);
  }

  return geminiVisionModel;
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

  return { model: getGeminiModel(selectedModel), name: selectedModel };
};

const getFallbackModel = (selectedModel) => {
  if (selectedModel === AI_MODELS.MISTRAL || !process.env.MISTRAL_API_KEY) {
    return { model: getGeminiModel(AI_MODELS.GEMINI_2_0_FLASH), name: AI_MODELS.GEMINI_2_0_FLASH };
  }

  return { model: getMistralModel(), name: AI_MODELS.MISTRAL };
};

// Helper to safely invoke a model with fallback
async function safeInvoke(messages, selectedModel, timeoutMs, hasImages = false) {
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

    // Mistral does not support vision — never fall back to it for image requests.
    // Falling back would send base64 image data to a text-only model and produce
    // garbage output or another error.
    if (hasImages) {
      console.error("❌ Gemini vision call failed. Mistral has no vision support — skipping fallback.");
      throw primaryError;
    }

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

  // Add each image using the native Google GenAI 'media' format.
  // The OpenAI-compatible 'image_url' type requires the adapter to transform
  // the data URI which can silently fail. 'media' is the documented format
  // for @langchain/google-genai and works reliably.
  for (const img of imageDocuments) {
    parts.push({
      type: "media",
      data: img.imageBase64,       // raw base64 string, no "data:..." prefix
      mimeType: img.mimeType,      // e.g. "image/jpeg", "image/png"
    });
  }

  return parts;
}

function shouldSearchInternet(query) {
  if (!ENABLE_WEB_SEARCH) {
    return false;
  }

  const normalizedQuery = String(query || "").toLowerCase().trim();
  if (!normalizedQuery || normalizedQuery.length <= 3) {
    return false;
  }

  // Only search for genuinely time-sensitive or live-data queries.
  // Everything else ("what is X", "explain Y") goes straight to the AI
  // — it's faster and avoids burning Tavily quota on knowledge questions.
  const timeSensitivePatterns = [
    /\b(latest|breaking|live|ongoing|right now|as of today|this week|this month|this year)\b/,
    /\b(today'?s?|tonight'?s?|yesterday'?s?|current|just announced|just released)\b/,
    /\b(news|headlines|update|score|weather|forecast|traffic)\b/,
    /\b(stock price|share price|crypto price|bitcoin price|exchange rate|market cap)\b/,
    /\b(who won|who is winning|match result|final score|election result)\b/,
    /\b(202[4-9]|2030)\b/,  // recent/future years only
  ];

  // Tier 2: Time-dependent factual queries — answers exist but go stale
  // (release dates, OTT availability, box office, upcoming events, etc.)
  const staleableFactPatterns = [
    /\b(release date|released|releasing|when (is|was|does|will|did))\b/,
    /\b(out now|is it out|already out|in theaters|now streaming|now playing)\b/,
    /\b(available on|streaming on|where to watch|which platform|ott)\b/,
    /\b(box office|collection|gross|earned|made how much)\b/,
    /\b(trailer|teaser|official trailer|dropped|reveal)\b/,
    /\b(cast|starring|who plays|who played|who is playing)\b/,
    /\b(season \d|episode \d|renewed|cancelled|canceled|next season)\b/,
    /\b(upcoming|scheduled|confirmed|announced|premiere)\b/,
  ];

  // Tier 3: Tech & product queries — versions, prices, specs, comparisons, launches.
  // Gemini's training data goes stale on these very quickly.
  const techProductPatterns = [
    // Version / release queries
    /\b(latest version|newest version|current version|stable version|lts version)\b/,
    /\b(version of (python|node|react|angular|vue|django|flutter|kotlin|swift|rust|go|java|android|ios|windows|macos|linux|ubuntu|chrome|firefox|safari))\b/,

    // Pricing
    /\b(price of|cost of|how much (does|is|costs?)|msrp|starting price|retail price)\b/,
    /\b(under \d{3,6}|below \d{3,6}|budget (phone|laptop|tablet|pc|gpu|cpu))\b/,

    // Device specs & comparisons
    /\b(specs( of)?|specifications|benchmark|performance of|review of)\b/,
    /\b(vs|versus|compare|comparison|better than|difference between).{0,40}(phone|laptop|tablet|gpu|cpu|chip|processor|camera|battery)\b/,

    // Best-of / recommendation queries
    /\b(best (phone|laptop|tablet|smartwatch|gpu|cpu|ssd|router|monitor|headphone|earphone|keyboard|mouse|gaming))\b/,
    /\b(top \d+ (phones?|laptops?|tablets?|gpus?|cpus?|ssds?))\b/,
    /\b(which (phone|laptop|tablet|gpu|cpu) (should i|to buy|is worth))\b/,

    // Brand-specific product launches
    /\b(iphone \d{1,2}|samsung galaxy (s|a|z|m)\d{1,2}|pixel \d{1}|oneplus \d{1,2}|realme \d{1,2}|redmi (note )?\d{1,2})\b/,
    /\b(macbook|ipad|apple watch|airpods|m\d (chip|pro|max|ultra))\b/,
    /\b(rtx \d{4}|rx \d{4}|snapdragon \d{3,4}|dimensity \d{3,4}|exynos \d{4}|a\d{2} (chip|bionic))\b/,

    // Software / OS / Platform
    /\b(windows \d{2}|android \d{1,2}|ios \d{1,2}|macos \w+|ubuntu \d{2})\b/,
    /\b(gpt-\d|claude \d|gemini (pro|ultra|flash|nano)|llama \d|mistral \w+)\b/,
    /\b(chatgpt|gemini|copilot|claude|perplexity|midjourney|stable diffusion|dall-?e)\b/,

    // Company leadership & status (changes frequently)
    /\b(ceo of|cto of|founder of|who (leads?|runs?|heads?|owns?|founded))\b/,
    /\b(acquired by|merger|acquisition|partnership between|deal between)\b/,
    /\b(openai|google deepmind|anthropic|mistral ai|meta ai|apple intelligence|microsoft copilot)\b/,

    // App / service availability
    /\b(is .{1,30} (available|working|down|offline|free))\b/,
    /\b(app (update|version|download|install)|plugin|extension for)\b/,
  ];

  if (timeSensitivePatterns.some((p) => p.test(normalizedQuery))) {
    return true;
  }

  if (staleableFactPatterns.some((p) => p.test(normalizedQuery))) {
    return true;
  }

  if (techProductPatterns.some((p) => p.test(normalizedQuery))) {
    return true;
  }

  return false;
}

export async function generateResponse(
  messages,
  selectedModel = AI_MODELS.GEMINI,
  documentContexts = null   // { documents: Array, hasImages: boolean } | null
) {
  try {
    // Use the latest user message as-is for the search query.
    // The full conversation history already provides all the context the AI needs;
    // mangling the query by prepending the previous message caused the AI to
    // answer old questions instead of the one the user just asked.
    const lastMsg = messages[messages.length - 1];
    let finalQuery = lastMsg?.content || "";

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
    // When images are present ALWAYS use the Gemini vision model — Mistral
    // cannot process images, and the user's model selection is ignored for
    // multimodal requests to prevent silent image drops.
    const isSelectedModelGemini = selectedModel && selectedModel.startsWith("gemini-");
    const effectiveModel = (imageDocs.length > 0 && !isSelectedModelGemini) ? GEMINI_VISION_MODEL_ID : selectedModel;

    const formattedMessages = messages
      .map((msg, idx) => {
        if (msg.role === "user") {
          // For the LAST user message, inject multimodal content when images exist.
          // No model check needed — we already forced the vision model above.
          if (idx === messages.length - 1 && imageDocs.length > 0) {
            console.log(`🖼️ Building multimodal message with ${imageDocs.length} image(s) for Gemini vision`);
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

    // For image requests, bypass pickModel/safeInvoke and call the vision model directly.
    let response, modelUsed, wasFallback, rateLimited;
    if (imageDocs.length > 0) {
      const visionModelId = (selectedModel && selectedModel.startsWith("gemini-")) ? selectedModel : GEMINI_VISION_MODEL_ID;
      const visionModel = getGeminiModel(visionModelId);
      console.log(`🔭 Sending image request to vision model: ${visionModelId}`);
      const raw = await withTimeout(
        visionModel.invoke([new SystemMessage(systemPrompt), ...formattedMessages]),
        MODEL_TIMEOUT_MS,
        "Vision model timed out"
      );
      response = raw;
      modelUsed = visionModelId;
      wasFallback = false;
      rateLimited = false;
    } else {
      const invoked = await safeInvoke(
        [new SystemMessage(systemPrompt), ...formattedMessages],
        effectiveModel,
        MODEL_TIMEOUT_MS,
        false
      );
      response = invoked.result;
      modelUsed = invoked.modelUsed;
      wasFallback = invoked.wasFallback;
      rateLimited = invoked.rateLimited;
    }

    const result = extractText(response);
    return {
      text: result || "No response generated.",
      modelUsed,
      wasFallback,
      rateLimited,
    };
  } catch (error) {
    // Log the full stack — previously only .message was logged which hid the
    // actual crash location (e.g. PDFParse constructor, image_url format, etc.)
    console.error("❌ AI Error:", error.message);
    console.error("   Stack:", error.stack);

    // Return a context-aware error message instead of the generic fallback
    const msg = error.message || "";
    let userText = "Something went wrong. Please try again.";
    if (/pdf|parse|corrupt|password/i.test(msg)) {
      userText = "❌ PDF extraction failed. The file may be corrupted or password-protected.";
    } else if (/image|vision|base64|multimodal/i.test(msg)) {
      userText = "❌ Image processing failed. Please try a different image or ask a text-only question.";
    } else if (/timed out/i.test(msg)) {
      userText = "⏱️ The AI took too long to respond. Please try again in a moment.";
    } else if (/quota|rate.?limit|429/i.test(msg)) {
      userText = "⚠️ AI rate limit reached. Please wait a moment and try again.";
    } else if (/unsupported file/i.test(msg)) {
      userText = "❌ Unsupported file type. Please upload a PDF, TXT, or image file.";
    }

    return {
      text: userText,
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