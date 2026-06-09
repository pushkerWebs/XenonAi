import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

// Max characters per individual file to keep total context manageable
const MAX_CHARS_PER_FILE = 8000;

/**
 * Extracts plain text from a single uploaded file (multer memory storage).
 * Supports: PDF, plain text, images (base64-encoded for Gemini vision).
 */
async function extractSingleFile(file) {
  const { mimetype, buffer, originalname } = file;

  // ── PDF ──────────────────────────────────────────────────────────────────
  if (mimetype === "application/pdf") {
    try {
      const parsed = await pdfParse(buffer);
      const rawText = (parsed?.text || "").trim();
      const truncated = rawText.length > MAX_CHARS_PER_FILE
        ? rawText.slice(0, MAX_CHARS_PER_FILE) + "\n\n[Document truncated — showing first ~8,000 characters]"
        : rawText;

      return { text: truncated, isImage: false, imageBase64: null, mimeType: null, filename: originalname };
    } catch (err) {
      console.error(`RAG: PDF parse failed for "${originalname}":`, err.message);
      throw new Error(`Failed to parse "${originalname}". The file may be corrupted or password-protected.`);
    }
  }

  // ── Plain text ────────────────────────────────────────────────────────────
  if (mimetype === "text/plain") {
    const rawText = buffer.toString("utf-8").trim();
    const truncated = rawText.length > MAX_CHARS_PER_FILE
      ? rawText.slice(0, MAX_CHARS_PER_FILE) + "\n\n[Document truncated]"
      : rawText;

    return { text: truncated, isImage: false, imageBase64: null, mimeType: null, filename: originalname };
  }

  // ── Images ────────────────────────────────────────────────────────────────
  if (mimetype.startsWith("image/")) {
    return {
      text: null,
      isImage: true,
      imageBase64: buffer.toString("base64"),
      mimeType: mimetype,
      filename: originalname,
    };
  }

  throw new Error(`Unsupported file type: ${mimetype}. Please upload a PDF, TXT, or image file.`);
}

/**
 * Processes an array of multer files and returns combined document contexts.
 *
 * @param {import('multer').File[]} files - Array of multer file objects
 * @returns {Promise<{ documents: Array, hasImages: boolean }>}
 */
export async function extractDocumentContexts(files) {
  if (!files || files.length === 0) return null;

  const results = await Promise.all(files.map(extractSingleFile));

  return {
    documents: results,
    hasImages: results.some((r) => r.isImage),
  };
}
