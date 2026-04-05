// Uses relative URL so the Vite dev proxy forwards to http://127.0.0.1:5000
const ALEYM_BASE = "/api";

/**
 * Fetch all sources from the Aleym API.
 */
export async function fetchSources() {
  const response = await fetch(`${ALEYM_BASE}/sources`);
  if (!response.ok) {
    throw new Error(`Aleym API error: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetch a single source by UUID.
 */
export async function fetchSourceById(id) {
  const response = await fetch(`${ALEYM_BASE}/sources/${id}`);
  if (!response.ok) {
    throw new Error(`Aleym API error: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetch articles with optional filtering and pagination.
 * @param {Object} params
 * @param {number} [params.limit=50]
 * @param {string} [params.sort_order="desc"]
 * @param {string} [params.source_id]
 * @param {string} [params.category_id]
 * @param {number} [params.after]  - Unix timestamp
 * @param {number} [params.before] - Unix timestamp
 */
export async function fetchArticles(params = {}) {
  const query = new URLSearchParams();
  if (params.limit) query.set("limit", params.limit);
  if (params.sort_order) query.set("sort_order", params.sort_order);
  if (params.source_id) query.set("source_id", params.source_id);
  if (params.category_id) query.set("category_id", params.category_id);
  if (params.after) query.set("after", params.after);
  if (params.before) query.set("before", params.before);

  const url = `${ALEYM_BASE}/articles${query.toString() ? `?${query}` : ""}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Aleym API error: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetch a single article by UUID (includes full content).
 */
export async function fetchArticleById(id) {
  const response = await fetch(`${ALEYM_BASE}/articles/${id}`);
  if (!response.ok) {
    throw new Error(`Aleym API error: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetch all categories.
 */
export async function fetchCategories() {
  const response = await fetch(`${ALEYM_BASE}/categories`);
  if (!response.ok) {
    throw new Error(`Aleym API error: ${response.status}`);
  }
  return response.json();
}

/**
 * Subscribe to real-time SSE updates from the Aleym scheduler.
 * Returns the EventSource instance (caller should close it on unmount).
 * @param {function} onUpdate - called when new articles are available
 * @param {function} onFailure - called when a source fetch failed
 */
export function subscribeToEvents(onUpdate, onFailure) {
  const es = new EventSource("/events");

  es.addEventListener("Update", (e) => {
    if (onUpdate) onUpdate(e.data);
  });

  es.addEventListener("Failure", (e) => {
    if (onFailure) onFailure(e.data);
  });

  return es;
}