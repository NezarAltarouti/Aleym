import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Sidebar, {
  SIDEBAR_WIDTH_OPEN,
  SIDEBAR_WIDTH_CLOSED,
} from "../components/Sidebar";
import ViewToggle from "../components/ViewToggle";
import NewsCard from "../components/NewsCard";
import NewsCardGrid from "../components/NewsCardGrid";
import api from "../services/aleymApi";
import { ActivitySession } from "../services/activityTracker";

// ---------------------------------------------------------------------------
// For You — page that displays articles recommended by the core.
//
// Source of recommendations: GET /api/recommend
//
// We keep the same Appearance / Focus tracking that AleymFeed uses, because:
//   1. The whole point of this page is to evaluate the recommender; if we
//      stopped collecting signals here, recommended articles would be
//      invisible to the model going forward.
//   2. Appearance on a recommended-but-skipped article is a genuinely
//      useful negative signal.
// ---------------------------------------------------------------------------

const RECOMMEND_LIMIT = 50;          // matches server default
const MIN_APPEARANCE_MS = 1000;
const MIN_FOCUS_MS = 500;

export default function ForYou({ navigateTo }) {
  // -------- UI state (shared with AleymFeed via the same localStorage keys) --
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem("viewMode") || "compact",
  );
  const [enableTransition, setEnableTransition] = useState(false);

  // -------- Data state --------
  const [articles, setArticles] = useState([]);
  const [sources, setSources] = useState([]); // for source-name lookup
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // -------- Refs --------
  const requestIdRef = useRef(0);
  // Focus sessions (round-trip from this page → ArticlePage → back). Same
  // model as AleymFeed: opened on click, flushed when ForYou unmounts or
  // on beforeunload.
  const focusSessionsRef = useRef(new Map());

  // Enable transitions one frame after mount.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEnableTransition(true));
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // -------- Source lookup map (for the source-name shown on each card) -----
  const sourceMap = useMemo(() => {
    const m = {};
    sources.forEach((s) => { m[s.id] = s; });
    return m;
  }, [sources]);

  // -------- One-time load of sources --------
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api.sources.list();
        if (alive) setSources(data || []);
      } catch (err) {
        // Non-fatal: cards will fall back to "Unknown" source name.
        console.error("Failed to load sources:", err);
      }
    })();
    return () => { alive = false; };
  }, []);

  // -------- Load recommendations --------
  const loadRecommendations = useCallback(async ({ silent = false } = {}) => {
    const reqId = ++requestIdRef.current;
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await api.recommendations.list({ limit: RECOMMEND_LIMIT });
      if (reqId !== requestIdRef.current) return; // a newer request is in flight
      setArticles(data || []);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setError(err.message || "Failed to load recommendations");
      setArticles([]);
    } finally {
      if (reqId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  // -------- Refresh on SSE Update --------
  // When the core fetches new articles, the recommendation set may have
  // shifted. Quietly refresh in the background.
  useEffect(() => {
    const off = api.events.subscribe((evt) => {
      if (evt.type === "Update") loadRecommendations({ silent: true });
    });
    return off;
  }, [loadRecommendations]);

  // -------- Read-flag sync (so toggling read in a card sticks) --------
  const onArticleReadChange = useCallback((articleId, newIsRead) => {
    setArticles((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, is_read: newIsRead } : a)),
    );
  }, []);

  // -------- Focus tracking (round-trip click → ArticlePage → back) --------
  const onArticleSelect = useCallback((article) => {
    const existing = focusSessionsRef.current.get(article.id);
    if (existing) existing.session.stop();

    focusSessionsRef.current.set(article.id, {
      session: new ActivitySession(),
      openedAt: Date.now(),
    });

    navigateTo("article", { articleId: article.id });
  }, [navigateTo]);

  // Flush any open focus sessions on unmount (return-to-feed flow).
  useEffect(() => {
    return () => flushAllFocusSessions(focusSessionsRef.current);
  }, []);

  // Also flush on full-page unload.
  useEffect(() => {
    const handler = () => flushAllFocusSessions(focusSessionsRef.current);
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // -------- Layout --------
  const marginLeft = sidebarOpen ? SIDEBAR_WIDTH_OPEN : SIDEBAR_WIDTH_CLOSED;
  const isGrid = viewMode === "grid";

  return (
    <>
      <Sidebar
        open={sidebarOpen}
        setOpen={(val) => {
          const newVal = typeof val === "function" ? val(sidebarOpen) : val;
          localStorage.setItem("sidebarOpen", JSON.stringify(newVal));
          setSidebarOpen(newVal);
        }}
        navigateTo={navigateTo}
        disableTransition={!enableTransition}
      />

      <div
        style={{
          marginLeft: `${marginLeft}px`,
          width: `calc(100vw - ${marginLeft}px)`,
          transition: enableTransition
            ? "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
            : "none",
          minHeight: "100vh",
          background: "#0e0e12",
          color: "#e8e6e1",
          fontFamily: "'DM Sans', sans-serif",
          overflowX: "hidden",
          boxSizing: "border-box",
        }}
      >
        <div style={{ padding: "60px", width: "100%", boxSizing: "border-box" }}>
          {/* Header — title + subtitle + refresh + view toggle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
              marginBottom: "8px",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "clamp(32px, 4vw, 48px)",
                  fontWeight: 700,
                  lineHeight: 1.1,
                  margin: 0,
                  color: "#e8e6e1",
                  letterSpacing: "-0.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                For You
                {refreshing && (
                  <span
                    aria-label="refreshing"
                    style={{
                      width: "16px",
                      height: "16px",
                      border: "2px solid rgba(199,146,234,0.2)",
                      borderTop: "2px solid #c792ea",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                )}
              </h1>
              <p
                style={{
                  margin: "8px 0 0",
                  color: "#5a5a6a",
                  fontSize: "14px",
                  maxWidth: "560px",
                }}
              >
                Personalized articles based on what you read.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                onClick={() => loadRecommendations()}
                style={refreshButtonStyle}
                title="Reload recommendations"
              >
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Refresh
              </button>
              <ViewToggle
                viewMode={viewMode}
                setViewMode={(mode) => {
                  localStorage.setItem("viewMode", mode);
                  setViewMode(mode);
                }}
              />
            </div>
          </div>

          {/* Spacer */}
          <div style={{ height: "32px" }} />

          {/* Loading */}
          {loading && articles.length === 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "80px 20px",
                gap: "16px",
              }}
            >
              <div style={spinnerStyle} />
              <p
                style={{
                  color: "#5a5a6a",
                  fontSize: "13px",
                  fontWeight: 500,
                  margin: 0,
                }}
              >
                Loading recommendations…
              </p>
              <style>{`@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`}</style>
            </div>
          )}

          {/* Error */}
          {!loading && error && articles.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "16px",
                  background: "rgba(255,100,100,0.08)",
                  border: "1px solid rgba(255,100,100,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                }}
              >
                <svg
                  width="24" height="24" viewBox="0 0 24 24" fill="none"
                  stroke="#ff6464" strokeWidth="2" strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p
                style={{
                  color: "#ff6464",
                  fontSize: "15px",
                  fontWeight: 500,
                  marginBottom: "8px",
                }}
              >
                Unable to load recommendations
              </p>
              <p
                style={{
                  color: "#5a5a6a",
                  fontSize: "13px",
                  maxWidth: "400px",
                  margin: "0 auto",
                }}
              >
                {error}. Make sure the Aleym API server is running.
              </p>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && articles.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <p style={{ color: "#5a5a6a", fontSize: "15px", marginBottom: "8px" }}>
                No recommendations yet.
              </p>
              <p
                style={{
                  color: "#4a4a5a",
                  fontSize: "13px",
                  maxWidth: "440px",
                  margin: "0 auto",
                }}
              >
                Read a few articles in your feed and vote on them — the recommender
                needs some signal to work with.
              </p>
            </div>
          )}

          {/* Articles */}
          {articles.length > 0 && (
            <>
              <div
                style={
                  isGrid
                    ? {
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                        gap: "16px",
                        width: "100%",
                        boxSizing: "border-box",
                      }
                    : {
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        width: "100%",
                        boxSizing: "border-box",
                      }
                }
              >
                {articles.map((article, i) => (
                  <RecommendedArticleCard
                    key={article.id}
                    article={article}
                    sourceName={sourceMap[article.source]?.name || "Unknown"}
                    index={i}
                    isGrid={isGrid}
                    onSelect={() => onArticleSelect(article)}
                    onReadChange={(newIsRead) =>
                      onArticleReadChange(article.id, newIsRead)
                    }
                  />
                ))}
              </div>
              <p
                style={{
                  textAlign: "center",
                  color: "#5a5a6a",
                  fontSize: "12px",
                  padding: "32px 0",
                }}
              >
                {articles.length} {articles.length === 1 ? "recommendation" : "recommendations"}
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Helper: flush all open focus sessions and send Focus signals.
// ---------------------------------------------------------------------------

function flushAllFocusSessions(map) {
  if (!map || map.size === 0) return;
  const now = Date.now();
  for (const [articleId, entry] of map.entries()) {
    const activeMs = entry.session.stop();
    if (activeMs >= MIN_FOCUS_MS) {
      api.feedback
        .focus({
          news: articleId,
          done_at: Math.floor(now / 1000),
          duration: activeMs,
        })
        .catch((err) => console.debug("focus feedback failed:", err));
    }
  }
  map.clear();
}

// ---------------------------------------------------------------------------
// RecommendedArticleCard — same Appearance tracking as in AleymFeed.
// We deliberately keep this signal active on recommended articles too, so
// that "shown but ignored" recommendations train the model.
// ---------------------------------------------------------------------------

function RecommendedArticleCard({
  article,
  sourceName,
  index,
  isGrid,
  onSelect,
  onReadChange,
}) {
  const ref = useRef(null);
  const sessionRef = useRef(null);
  const startedAtRef = useRef(null);
  const flushedRef = useRef(false);

  const flushAppearance = useCallback(() => {
    if (flushedRef.current) return;
    if (!sessionRef.current || startedAtRef.current === null) return;

    const activeMs = sessionRef.current.stop();
    sessionRef.current = null;

    if (activeMs >= MIN_APPEARANCE_MS) {
      flushedRef.current = true;
      api.feedback
        .appearance({
          news: article.id,
          happened_at: Math.floor(startedAtRef.current / 1000),
          duration: activeMs,
        })
        .catch((err) => console.debug("appearance feedback failed:", err));
    } else {
      // Below threshold — leave room for another attempt on next intersection.
      startedAtRef.current = null;
    }
  }, [article.id]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (flushedRef.current) {
          obs.disconnect();
          return;
        }
        if (entry.isIntersecting) {
          if (!sessionRef.current) {
            sessionRef.current = new ActivitySession();
            startedAtRef.current = Date.now();
          }
        } else {
          flushAppearance();
        }
      },
      { threshold: 0.5 },
    );

    obs.observe(el);

    const onBeforeUnload = () => flushAppearance();
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      obs.disconnect();
      window.removeEventListener("beforeunload", onBeforeUnload);
      flushAppearance();
    };
  }, [flushAppearance]);

  const publishedMs =
    (article.published_at ?? article.first_fetched_at ?? 0) * 1000;

  const cardProps = {
    id: article.id,
    title: article.title,
    publishedAt: publishedMs,
    url: article.uri,
    source: sourceName,
    description: article.summary,
    isRead: article.is_read,
    onReadChange,
    index,
  };

  const handleClick = (e) => {
    if (e.target.closest("a")) return;
    if (e.target.closest("button")) return;
    onSelect();
  };

  return (
    <div ref={ref} onClick={handleClick} style={{ cursor: "pointer" }}>
      {isGrid ? <NewsCardGrid {...cardProps} /> : <NewsCard {...cardProps} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const refreshButtonStyle = {
  padding: "8px 16px",
  fontSize: "13px",
  fontWeight: 500,
  fontFamily: "'DM Sans', sans-serif",
  borderRadius: "10px",
  border: "1px solid rgba(199,146,234,0.15)",
  background: "rgba(199,146,234,0.08)",
  color: "#c792ea",
  cursor: "pointer",
  transition: "all 0.2s ease",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const spinnerStyle = {
  width: "32px",
  height: "32px",
  border: "3px solid rgba(255,255,255,0.06)",
  borderTop: "3px solid #c792ea",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};