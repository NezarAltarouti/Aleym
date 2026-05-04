//NO DELETE CATEGORY

// aleymapi.js
// Service module for the Aleym API.
// Covers every REST endpoint exposed by the Rust backend (axum) and the SSE
// `/events` stream. Designed to be imported anywhere in a React project.
//
// Usage:
//   import api from "./aleymapi";
//   const articles = await api.articles.list({ limit: 20, query: "rust" });
//   const stop = api.events.subscribe((evt) => console.log(evt));
//   // later: stop();

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Allow overriding the base URL via Vite / CRA / Next env vars, otherwise
// fall back to same-origin (the Rust server serves the SPA from `web/dist`).
const BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_ALEYM_API_BASE) ||
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_ALEYM_API_BASE) ||
  "";

const API_PREFIX = `${BASE_URL}/api`;
const EVENTS_URL = `${BASE_URL}/events`;

// ---------------------------------------------------------------------------
// Type reference (JSDoc — informational only)
// ---------------------------------------------------------------------------
//
// The Rust backend serializes these shapes. Listed here so editors / readers
// know what the endpoints return without having to dig into Rust source.
//
// SimpleArticle (returned by /articles and /recommend):
//   {
//     id:               string (UUID),
//     source:           string (UUID),
//     title:            string,
//     uri:              string | null,
//     summary:          string | null,
//     first_fetched_at: number  (unix seconds),
//     last_fetched_at:  number  (unix seconds),
//     published_at:     number | null (unix seconds),
//     is_read:          boolean,
//   }
//
// Article (returned by /articles/{id}) — same as SimpleArticle plus:
//   {
//     content:          string | null,
//   }
//
// Source (returned by /sources, /sources/{id}, /categories/{id}/sources):
//   {
//     id:                string (UUID),
//     parent_directory:  string (UUID),
//     informant:         number (i8 — informant kind id),
//     networktype:       "Clear" | "Tor",
//     name:              string,
//     description:       string | null,
//     icon_uri:          string | null,
//     logo_uri:          string | null,
//     custom_id:         string | null,
//     is_enabled:        boolean,
//   }
//
// Category (returned by /categories, /sources/{id}/categories):
//   {
//     id:          string (UUID),
//     name:        string,
//     description: string | null,
//   }

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class AleymApiError extends Error {
  constructor(status, statusText, body, url) {
    super(`Aleym API ${status} ${statusText} @ ${url}: ${body || "(no body)"}`);
    this.name = "AleymApiError";
    this.status = status;
    this.statusText = statusText;
    this.body = body;
    this.url = url;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build a URL with a query string, dropping null/undefined params.
 */
function buildUrl(path, params) {
  const url = new URL(`${API_PREFIX}${path}`, window.location.origin);
  if (params && typeof params === "object") {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      url.searchParams.append(k, String(v));
    }
  }
  // If BASE_URL is absolute it takes precedence; otherwise return relative path.
  return BASE_URL ? url.toString() : `${url.pathname}${url.search}`;
}

/**
 * Core fetch wrapper. Handles JSON, errors, and empty 200 responses.
 *
 * @param {string} url
 * @param {RequestInit} init
 * @param {AbortSignal} [signal]
 */
async function request(url, init = {}, signal) {
  const headers = {
    Accept: "application/json",
    ...(init.body ? { "Content-Type": "application/json" } : {}),
    ...(init.headers || {}),
  };

  let res;
  try {
    res = await fetch(url, { ...init, headers, signal });
  } catch (networkErr) {
    throw new AleymApiError(0, "Network Error", networkErr.message, url);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AleymApiError(res.status, res.statusText, body, url);
  }

  // 200 OK with no body (e.g. update/delete handlers returning StatusCode::OK)
  // shouldn't choke on `res.json()`.
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const get = (path, params, signal) =>
  request(buildUrl(path, params), { method: "GET" }, signal);

const post = (path, body, signal) =>
  request(
    buildUrl(path),
    { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined },
    signal,
  );

const put = (path, body, signal) =>
  request(
    buildUrl(path),
    { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined },
    signal,
  );

const del = (path, signal) =>
  request(buildUrl(path), { method: "DELETE" }, signal);

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

export const articles = {
  /**
   * GET /api/articles
   * Returns a list of SimpleArticle.
   *
   * Each item includes: id, source, title, uri, summary, first_fetched_at,
   * last_fetched_at, published_at, is_read.
   *
   * @param {Object} [params]
   * @param {number} [params.limit]          default 50 server-side
   * @param {number} [params.after]          unix timestamp (seconds) — only articles fetched after
   * @param {number} [params.before]         unix timestamp (seconds) — only articles fetched before
   * @param {"asc"|"desc"} [params.sort_order]   default "desc"
   * @param {string} [params.source_id]      UUID; takes priority over category_id
   * @param {string} [params.category_id]    UUID
   * @param {string} [params.query]          full-text search query
   * @param {AbortSignal} [signal]
   */
  list(params = {}, signal) {
    return get("/articles", params, signal);
  },

  /**
   * GET /api/articles
   * Convenience wrapper for full-text search. Equivalent to
   * `list({ query, ...rest })`.
   *
   * @param {string} query   — search text (required)
   * @param {Object} [rest]  — same fields as `list` (limit, source_id, etc.)
   * @param {AbortSignal} [signal]
   */
  search(query, rest = {}, signal) {
    if (!query || typeof query !== "string") {
      throw new Error("articles.search: query string is required");
    }
    return get("/articles", { ...rest, query }, signal);
  },

  /**
   * GET /api/articles/{id}
   * Returns a full Article (includes `content` in addition to all
   * SimpleArticle fields).
   */
  getById(id, signal) {
    if (!id) throw new Error("articles.getById: id is required");
    return get(`/articles/${encodeURIComponent(id)}`, undefined, signal);
  },

  /**
   * GET /api/articles/{id}/read?is_read={bool}
   *
   * Sets (or unsets) the read flag on an article. The Rust handler accepts
   * `is_read` as a query parameter — `true` marks it as read, `false`
   * marks it as unread.
   *
   * @param {string} id           UUID of the article
   * @param {boolean} isRead      true = mark as read, false = mark as unread
   * @param {AbortSignal} [signal]
   */
  setRead(id, isRead, signal) {
    if (!id) throw new Error("articles.setRead: id is required");
    if (typeof isRead !== "boolean") {
      throw new Error("articles.setRead: isRead must be a boolean");
    }
    return get(
      `/articles/${encodeURIComponent(id)}/read`,
      { is_read: isRead },
      signal,
    );
  },

  /** Mark an article as read. Shorthand for `setRead(id, true)`. */
  markRead(id, signal) {
    return articles.setRead(id, true, signal);
  },

  /** Mark an article as unread. Shorthand for `setRead(id, false)`. */
  markUnread(id, signal) {
    return articles.setRead(id, false, signal);
  },
};

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

export const recommendations = {
  /**
   * GET /api/recommend
   * Returns a list of SimpleArticle recommendations.
   *
   * @param {Object} [params]
   * @param {number} [params.limit]   default 50
   * @param {AbortSignal} [signal]
   */
  list(params = {}, signal) {
    return get("/recommend", params, signal);
  },
};

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const categories = {
  /** GET /api/categories */
  list(signal) {
    return get("/categories", undefined, signal);
  },

  /**
   * POST /api/categories
   * @param {{ name: string, description?: string|null }} payload
   * @returns {Promise<string>} the new category UUID
   */
  create(payload, signal) {
    if (!payload || !payload.name) throw new Error("categories.create: name is required");
    return post("/categories", payload, signal);
  },

  /**
   * PUT /api/categories/{id}
   *
   * Server uses `Option<Option<String>>` semantics for description:
   *   - omit `description` entirely  -> field unchanged   (NotSet)
   *   - description: null            -> clear description (Set None)
   *   - description: "..."           -> update description
   *
   * To preserve that distinction, pass `{ name, description: null }`
   * to clear, or just `{ name }` to leave it alone.
   */
  update(id, payload, signal) {
    if (!id) throw new Error("categories.update: id is required");
    if (!payload || !payload.name) throw new Error("categories.update: name is required");
    return put(`/categories/${encodeURIComponent(id)}`, payload, signal);
  },

  /** DELETE /api/categories/{id} */
  remove(id, signal) {
    if (!id) throw new Error("categories.remove: id is required");
    return del(`/categories/${encodeURIComponent(id)}`, signal);
  },

  /** GET /api/categories/{id}/sources */
  sources(id, signal) {
    if (!id) throw new Error("categories.sources: id is required");
    return get(`/categories/${encodeURIComponent(id)}/sources`, undefined, signal);
  },
};

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

/**
 * NetworkType values accepted by the API.
 * Mirrors the Rust enum (serialized as the variant name).
 */
export const NetworkType = Object.freeze({
  Clear: "Clear",
  Tor: "Tor",
});

export const sources = {
  /**
   * GET /api/sources
   * Returns a list of Source. Each item includes: id, parent_directory,
   * informant, networktype, name, description, icon_uri, logo_uri,
   * custom_id, is_enabled.
   */
  list(signal) {
    return get("/sources", undefined, signal);
  },

  /** GET /api/sources/{id} — returns a full Source object. */
  getById(id, signal) {
    if (!id) throw new Error("sources.getById: id is required");
    return get(`/sources/${encodeURIComponent(id)}`, undefined, signal);
  },

  /**
   * POST /api/sources
   * @param {{
   *   name: string,
   *   description?: string|null,
   *   network: "Clear"|"Tor",
   *   informant: object,    // e.g. { FeedRs: { feed_url: "..." } }
   * }} payload
   * @returns {Promise<string>} the new source UUID
   */
  create(payload, signal) {
    if (!payload) throw new Error("sources.create: payload required");
    if (!payload.name) throw new Error("sources.create: name required");
    if (!payload.network) throw new Error("sources.create: network required");
    if (!payload.informant) throw new Error("sources.create: informant required");
    return post("/sources", payload, signal);
  },

  /**
   * PUT /api/sources/{id}
   * @param {string} id
   * @param {{
   *   name: string,
   *   description?: string|null,
   *   network: "Clear"|"Tor",
   *   is_enabled: boolean,
   * }} payload
   */
  update(id, payload, signal) {
    if (!id) throw new Error("sources.update: id is required");
    if (!payload) throw new Error("sources.update: payload required");
    return put(`/sources/${encodeURIComponent(id)}`, payload, signal);
  },

  /** DELETE /api/sources/{id} */
  remove(id, signal) {
    if (!id) throw new Error("sources.remove: id is required");
    return del(`/sources/${encodeURIComponent(id)}`, signal);
  },

  /** GET /api/sources/{id}/categories */
  categories(id, signal) {
    if (!id) throw new Error("sources.categories: id is required");
    return get(`/sources/${encodeURIComponent(id)}/categories`, undefined, signal);
  },

  /** POST /api/sources/{source_id}/categories/{category_id} */
  linkCategory(sourceId, categoryId, signal) {
    if (!sourceId || !categoryId)
      throw new Error("sources.linkCategory: sourceId and categoryId are required");
    return post(
      `/sources/${encodeURIComponent(sourceId)}/categories/${encodeURIComponent(categoryId)}`,
      undefined,
      signal,
    );
  },

  /** DELETE /api/sources/{source_id}/categories/{category_id} */
  unlinkCategory(sourceId, categoryId, signal) {
    if (!sourceId || !categoryId)
      throw new Error("sources.unlinkCategory: sourceId and categoryId are required");
    return del(
      `/sources/${encodeURIComponent(sourceId)}/categories/${encodeURIComponent(categoryId)}`,
      signal,
    );
  },

  /** GET /api/sources/{id}/fetch  — triggers a manual fetch */
  manualFetch(id, signal) {
    if (!id) throw new Error("sources.manualFetch: id is required");
    return get(`/sources/${encodeURIComponent(id)}/fetch`, undefined, signal);
  },
};

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

/**
 * Helpers to build properly-shaped feedback signals matching the Rust
 * `UserFeedbackSignal` enum. Each variant is serialized by serde with an
 * external tag (the variant name as the JSON key).
 */
export const FeedbackSignal = {
  /** { Appearance: { news, happened_at, duration } } */
  appearance({ news, happened_at, duration }) {
    return { Appearance: { news, happened_at, duration } };
  },
  /** { Focus: { news, done_at, duration } } */
  focus({ news, done_at, duration }) {
    return { Focus: { news, done_at, duration } };
  },
  /** { Read: { news, done_at, duration, scroll_depth_percentage } } */
  read({ news, done_at, duration, scroll_depth_percentage }) {
    return { Read: { news, done_at, duration, scroll_depth_percentage } };
  },
  /** { ExplicitVote: { news, done_at, is_up_vote } } */
  explicitVote({ news, done_at, is_up_vote }) {
    return { ExplicitVote: { news, done_at, is_up_vote } };
  },
};

export const feedback = {
  /** POST /api/feedback */
  send(signal, signalAbort) {
    if (!signal) throw new Error("feedback.send: signal payload required");
    return post("/feedback", signal, signalAbort);
  },

  /** Convenience wrappers — pass plain objects, the variant gets wrapped. */
  appearance(data, signalAbort) {
    return post("/feedback", FeedbackSignal.appearance(data), signalAbort);
  },
  focus(data, signalAbort) {
    return post("/feedback", FeedbackSignal.focus(data), signalAbort);
  },
  read(data, signalAbort) {
    return post("/feedback", FeedbackSignal.read(data), signalAbort);
  },
  explicitVote(data, signalAbort) {
    return post("/feedback", FeedbackSignal.explicitVote(data), signalAbort);
  },
};

// ---------------------------------------------------------------------------
// Server-Sent Events (/events)
// ---------------------------------------------------------------------------
//
// The Rust backend emits two event types via SSE:
//   { "type": "Update"  }  — new articles fetched, client should refresh
//   { "type": "Failure" }  — an informant failed to fetch
//
// Comments below explain the design decisions important to your request:
// "when the listener waits its event, collect all the events. So do not
//  exclude anything."
//
// 1. We use the native `EventSource` so the browser handles reconnects.
// 2. We attach BOTH a `message` handler AND a generic listener that
//    captures *every* event regardless of `event:` field, so no event
//    is silently dropped — even unexpected ones from future API versions.
// 3. Every parsed event is pushed into an in-memory buffer (`history`)
//    and ALSO fanned out to all subscribers, so late subscribers can
//    replay what they missed via `getHistory()`.
// 4. Subscribers receive a normalized object:
//      { type: "Update"|"Failure"|<raw>, raw: <original payload>, receivedAt: <Date> }
//

export const EventTypes = Object.freeze({
  Update: "Update",
  Failure: "Failure",
});

class EventBus {
  constructor() {
    this.source = null;
    this.subscribers = new Set();
    this.history = []; // every event ever seen this session, in order
    this.maxHistory = 1000; // safety cap; raise/lower as needed
    this.openListeners = new Set();
    this.errorListeners = new Set();
  }

  _ensureConnected() {
    if (this.source) return;

    const url = BASE_URL ? `${EVENTS_URL}` : EVENTS_URL;
    const es = new EventSource(url, { withCredentials: false });
    this.source = es;

    es.onopen = (e) => {
      for (const fn of this.openListeners) {
        try { fn(e); } catch (err) { console.error("[aleymapi] open listener threw:", err); }
      }
    };

    // Default `message` handler — fires for events with no `event:` field
    // or `event: message`. The Rust side uses `Event::default().json_data(...)`
    // which emits the default `message` event, so this is the main path.
    es.onmessage = (evt) => this._dispatch(evt);

    // Defensive: also attach handlers for the named event types we know
    // about, in case the backend ever switches to named events. Doing
    // this means we *never* miss an event because of a naming mismatch.
    for (const type of Object.values(EventTypes)) {
      es.addEventListener(type, (evt) => this._dispatch(evt, type));
    }

    es.onerror = (e) => {
      // EventSource will auto-reconnect; we just notify listeners.
      for (const fn of this.errorListeners) {
        try { fn(e); } catch (err) { console.error("[aleymapi] error listener threw:", err); }
      }
    };
  }

  _dispatch(evt, namedType) {
    let parsed = null;
    try {
      parsed = evt.data ? JSON.parse(evt.data) : null;
    } catch {
      parsed = { raw: evt.data };
    }

    const normalized = {
      type: (parsed && parsed.type) || namedType || "Unknown",
      raw: parsed,
      receivedAt: new Date(),
    };

    // Buffer it — never drop. Trim from the front only when over cap.
    this.history.push(normalized);
    if (this.history.length > this.maxHistory) {
      this.history.splice(0, this.history.length - this.maxHistory);
    }

    // Fan out to every subscriber. Each subscriber's failure is isolated
    // so one buggy handler can't starve the others.
    for (const fn of this.subscribers) {
      try {
        fn(normalized);
      } catch (err) {
        console.error("[aleymapi] subscriber threw:", err);
      }
    }
  }

  subscribe(fn) {
    if (typeof fn !== "function") throw new Error("subscribe expects a function");
    this._ensureConnected();
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  /** Subscribe but only receive a particular event type. */
  on(type, fn) {
    return this.subscribe((evt) => {
      if (evt.type === type) fn(evt);
    });
  }

  onOpen(fn) {
    this._ensureConnected();
    this.openListeners.add(fn);
    return () => this.openListeners.delete(fn);
  }

  onError(fn) {
    this._ensureConnected();
    this.errorListeners.add(fn);
    return () => this.errorListeners.delete(fn);
  }

  /**
   * Returns a copy of every event received this session (in order).
   * Useful for components that mount after events have already streamed in.
   */
  getHistory(filterType) {
    return filterType
      ? this.history.filter((e) => e.type === filterType)
      : this.history.slice();
  }

  clearHistory() {
    this.history.length = 0;
  }

  close() {
    if (this.source) {
      this.source.close();
      this.source = null;
    }
    this.subscribers.clear();
    this.openListeners.clear();
    this.errorListeners.clear();
  }

  /** True if EventSource is currently OPEN. */
  isConnected() {
    return !!this.source && this.source.readyState === EventSource.OPEN;
  }
}

export const events = new EventBus();

// ---------------------------------------------------------------------------
// Default export — single namespace for convenience
// ---------------------------------------------------------------------------

const api = {
  baseUrl: BASE_URL,
  AleymApiError,
  NetworkType,
  EventTypes,
  FeedbackSignal,
  articles,
  recommendations,
  categories,
  sources,
  feedback,
  events,
};

export default api;