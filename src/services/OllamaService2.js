// OllamaService2.js
// Service module for local Ollama API.
// Provides article summarization via the /api/generate endpoint.

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const OLLAMA_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_OLLAMA_BASE) ||
  "http://localhost:11434";

// Default model — used as a fallback hint and for the install prompt.
// Actual model used per-call comes from the caller.
const OLLAMA_DEFAULT_MODEL =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_OLLAMA_MODEL) ||
  "llama3.2";

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class OllamaError extends Error {
  constructor(message, status, url) {
    super(message);
    this.name = "OllamaError";
    this.status = status;
    this.url = url;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasContent(field) {
  return typeof field === "string" && field.trim().length > 0;
}

function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Sanitize a model name so it's safe to use in a localStorage key. */
function sanitizeModelForKey(model) {
  return String(model || "").replace(/[^a-zA-Z0-9._-]/g, "_");
}

// ---------------------------------------------------------------------------
// Prompt builder (unchanged)
// ---------------------------------------------------------------------------

function buildSummaryPrompt(article, language = "en") {
  const hasTitle = hasContent(article.title);
  const hasDescription = hasContent(article.description);
  const hasFullContent = hasContent(article.content);
  const hasSource = hasContent(article.source);
  const hasAuthor = hasContent(article.author);

  const isArabic = language === "ar";
  const langDirective = isArabic
    ? "Write the summary in Modern Standard Arabic (العربية الفصحى). Use natural, fluent Arabic — do not transliterate English words unless they are proper nouns. Do not include any English text in the summary."
    : "Write the summary in English.";

  let instruction;
  if (hasFullContent) {
    instruction =
      "Summarize the following news article in 3-5 sentences. " +
      "Focus on the key facts, main argument, and important conclusions. " +
      "Write in a neutral, informative tone. Do not add opinions or commentary. " +
      "Do not start with 'This article' or 'The article' - jump straight into the summary. " +
      langDirective;
  } else if (hasDescription) {
    instruction =
      "Below is a short description of a news article. The full content is not available. " +
      "Expand this description into a clear, informative 2-3 sentence summary based ONLY on what is provided. " +
      "Do not invent facts. Do not speculate beyond what the description states. " +
      langDirective;
  } else if (hasTitle) {
    instruction =
      "Below is only the title of a news article - no other content is available. " +
      "Provide a brief 1-2 sentence note explaining what the article is likely about based on the title. " +
      "Be explicit that this is inferred from the title alone and that full content is not available. " +
      langDirective;
  } else {
    instruction = isArabic
      ? "لا توجد معلومات عن المقال. أجب بـ: 'لا يوجد محتوى للتلخيص.'"
      : "No article information was provided. Respond with: 'No content available to summarize.'";
  }

  const parts = [instruction, ""];

  if (hasTitle) parts.push(`Title: ${article.title.trim()}`);
  if (hasSource) parts.push(`Source: ${article.source.trim()}`);
  if (hasAuthor) parts.push(`Author: ${article.author.trim()}`);
  if (hasDescription) parts.push(`Description: ${article.description.trim()}`);

  if (hasFullContent) {
    const plain = stripHtml(article.content);
    const trimmed = plain.length > 3000 ? plain.slice(0, 3000) + "…" : plain;
    parts.push(`\nContent:\n${trimmed}`);
  }

  parts.push(isArabic ? "\nالملخص:" : "\nSummary:");

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Core API methods — model is now a required parameter
// ---------------------------------------------------------------------------

/** Non-streaming summarization. */
async function summarize(article, model, signal, language = "en") {
  if (!model) throw new OllamaError("No model specified", 0, "");
  const prompt = buildSummaryPrompt(article, language);
  const url = `${OLLAMA_BASE}/api/generate`;

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: { temperature: 0.3, top_p: 0.9, num_predict: 300 },
      }),
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new OllamaError(
      `Failed to connect to Ollama at ${OLLAMA_BASE}. Is Ollama running?`,
      0,
      url,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new OllamaError(
      `Ollama API error ${res.status}: ${body || res.statusText}`,
      res.status,
      url,
    );
  }

  const data = await res.json();
  return (data.response || "").trim();
}

/** Streaming summarization with progressive chunks. */
async function summarizeStream(
  article,
  model,
  onChunk,
  signal,
  language = "en",
) {
  if (!model) throw new OllamaError("No model specified", 0, "");
  const prompt = buildSummaryPrompt(article, language);
  const url = `${OLLAMA_BASE}/api/generate`;

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: true,
        options: { temperature: 0.3, top_p: 0.9, num_predict: 300 },
      }),
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new OllamaError(
      `Failed to connect to Ollama at ${OLLAMA_BASE}. Is Ollama running?`,
      0,
      url,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new OllamaError(
      `Ollama API error ${res.status}: ${body || res.statusText}`,
      res.status,
      url,
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        if (parsed.response) {
          fullText += parsed.response;
          if (typeof onChunk === "function") onChunk(parsed.response);
        }
      } catch {
        // skip malformed line
      }
    }
  }

  return fullText.trim();
}

/** Health check — verifies Ollama is reachable and lists installed models. */
async function healthCheck() {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return { ok: false, error: `Ollama responded with ${res.status}` };
    }
    const data = await res.json();
    const models = (data.models || []).map((m) => m.name);
    return {
      ok: true,
      models,
      hasAnyModel: models.length > 0,
    };
  } catch (err) {
    return {
      ok: false,
      error: `Cannot reach Ollama at ${OLLAMA_BASE}: ${err.message}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Local storage cache (per article × model × language)
// ---------------------------------------------------------------------------

const CACHE_PREFIX = "aleym_summary:";
const CACHE_VERSION = 3; // bumped — model is now part of the call

function cacheKey(articleId, model, language) {
  const lang = language === "ar" ? "ar" : "en";
  const safeModel = sanitizeModelForKey(model);
  return `${CACHE_PREFIX}${articleId}:${safeModel}:${lang}`;
}

function safeStorage() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function getCachedSummary(articleId, model, language = "en") {
  if (!articleId || !model) return null;
  const storage = safeStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(cacheKey(articleId, model, language));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== CACHE_VERSION) return null;
    if (typeof parsed.summary !== "string" || !parsed.summary) return null;
    return {
      summary: parsed.summary,
      model: parsed.model,
      language: parsed.language,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

function setCachedSummary(articleId, model, summary, language = "en") {
  if (!articleId || !model || !summary) return;
  const storage = safeStorage();
  if (!storage) return;

  try {
    const payload = JSON.stringify({
      version: CACHE_VERSION,
      summary,
      model,
      language: language === "ar" ? "ar" : "en",
      savedAt: Date.now(),
    });
    storage.setItem(cacheKey(articleId, model, language), payload);
  } catch {
    /* quota / storage error — silent */
  }
}

function clearCachedSummary(articleId, model, language) {
  if (!articleId) return;
  const storage = safeStorage();
  if (!storage) return;
  try {
    if (model && language) {
      storage.removeItem(cacheKey(articleId, model, language));
    } else {
      // Remove every cached entry that starts with this article's id.
      const prefix = `${CACHE_PREFIX}${articleId}:`;
      const toRemove = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(prefix)) toRemove.push(key);
      }
      toRemove.forEach((k) => storage.removeItem(k));
    }
  } catch {
    /* ignore */
  }
}

function clearAllCachedSummaries() {
  const storage = safeStorage();
  if (!storage) return;
  try {
    const toRemove = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) toRemove.push(key);
    }
    toRemove.forEach((k) => storage.removeItem(k));
  } catch {
    /* ignore */
  }
}

function hasCachedSummary(articleId, model, language = "en") {
  return getCachedSummary(articleId, model, language) !== null;
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

const ollama = {
  baseUrl: OLLAMA_BASE,
  defaultModel: OLLAMA_DEFAULT_MODEL,
  OllamaError,
  buildSummaryPrompt,
  summarize,
  summarizeStream,
  healthCheck,
  // cache
  getCachedSummary,
  setCachedSummary,
  clearCachedSummary,
  clearAllCachedSummaries,
  hasCachedSummary,
};

export default ollama;
