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
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 50;
const INFINITE_SCROLL_THRESHOLD = 800;
const SEARCH_DEBOUNCE_MS = 300;

const MIN_APPEARANCE_MS = 1000;
const MIN_FOCUS_MS = 500;

const HEAD_POLL_MS = 20_000;
const HEAD_POLL_PAGE_SIZE = 50;
const MANUAL_FETCH_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Cursor helper
// ---------------------------------------------------------------------------

const cursorOf = (article) => article.first_fetched_at ?? 0;

function sortArticles(list, order) {
  const sign = order === "asc" ? 1 : -1;
  return [...list].sort((a, b) => sign * (cursorOf(a) - cursorOf(b)));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AleymFeed({
  navigateTo,
  compactMode = false,
  selectedArticleId = null,
  onSummarize,
  selectedCategoryIds = [],
  selectedSourceIds = [],
}) {
  // -------- UI state --------
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem("viewMode") || "compact",
  );
  const [enableTransition, setEnableTransition] = useState(false);

  const isGrid = !compactMode && viewMode === "grid";

  // -------- Data state --------
  const [articles, setArticles] = useState([]);
  const [sources, setSources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sourceToCategoryMap, setSourceToCategoryMap] = useState({});

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [manualFetching, setManualFetching] = useState(false);
  const [error, setError] = useState(null);
  const [reachedEnd, setReachedEnd] = useState(false);

  const [pendingNewArticles, setPendingNewArticles] = useState([]);

  // -------- Filters --------
  // Derive dropdown values from props to sync with sidebar
  const selectedSource = selectedSourceIds.length === 1 ? selectedSourceIds[0] : "";
  const selectedCategory = selectedCategoryIds.length === 1 ? selectedCategoryIds[0] : "";
  const [sortOrder, setSortOrder] = useState("desc");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // -------- Refs --------
  const focusSessionsRef = useRef(new Map());
  const sentinelRef = useRef(null);
  const scrollAnchorRef = useRef(null);

  const pageLoadIdRef = useRef(0);
  const headPollIdRef = useRef(0);

  const articlesRef = useRef(articles);
  const pendingRef = useRef(pendingNewArticles);
  const sortOrderRef = useRef(sortOrder);

  useEffect(() => {
    articlesRef.current = articles;
  }, [articles]);
  useEffect(() => {
    pendingRef.current = pendingNewArticles;
  }, [pendingNewArticles]);
  useEffect(() => {
    sortOrderRef.current = sortOrder;
  }, [sortOrder]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEnableTransition(true));
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const sourceMap = useMemo(() => {
    const m = {};
    sources.forEach((s) => {
      m[s.id] = s;
    });
    return m;
  }, [sources]);

  const hasActiveSourceFilter = selectedSourceIds.length > 0;
  const hasActiveCategoryFilter = selectedCategoryIds.length > 0;

  const filterArticles = useCallback((articles) => {
    if (!hasActiveSourceFilter && !hasActiveCategoryFilter) {
      return articles;
    }

    return articles.filter((article) => {
      if (hasActiveSourceFilter && !selectedSourceIds.includes(article.source)) {
        return false;
      }

      if (hasActiveCategoryFilter) {
        const categoryId = sourceToCategoryMap[article.source];
        if (categoryId) {
          return selectedCategoryIds.includes(categoryId);
        }
        return true;
      }

      return true;
    });
  }, [hasActiveSourceFilter, hasActiveCategoryFilter, selectedSourceIds, selectedCategoryIds, sourceToCategoryMap]);

  useEffect(() => {
    if (articles.length === 0) return;
    if (!hasActiveSourceFilter && !hasActiveCategoryFilter) return;

    setArticles((prevArticles) => filterArticles(prevArticles));
  }, [filterArticles, articles.length, hasActiveCategoryFilter, hasActiveSourceFilter]);

  // -------- Debounce search --------
  useEffect(() => {
    const t = setTimeout(
      () => setSearchQuery(searchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(t);
  }, [searchInput]);

  // -------- Source-to-category mapping (for local filtering) --------
  // Load sources & categories once, building proper category mappings
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const catData = await api.categories.list();
        if (!alive) return;
        setCategories(catData || []);

        // Build source-to-category mapping by fetching sources for each category
        const sourceToCatMap = {};
        const allSources = [];
        
        await Promise.all(
          (catData || []).map(async (cat) => {
            try {
              const srcList = await api.categories.sources(cat.id);
              (srcList || []).forEach((src) => {
                sourceToCatMap[src.id] = cat.id;
                allSources.push(src);
              });
            } catch (err) {
              console.debug("Failed to load sources for category:", cat.id, err);
            }
          }),
        );

        if (alive) {
          setSources(allSources);
          setSourceToCategoryMap(sourceToCatMap);
        }
      } catch (err) {
        console.error("Failed to load sources/categories:", err);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // -------- Filter args --------
  const buildFilterArgs = useCallback(() => {
    const q = {};
    if (selectedSourceIds.length === 1) {
      q.source_id = selectedSourceIds[0];
    } else if (selectedCategoryIds.length === 1) {
      q.category_id = selectedCategoryIds[0];
    }

    if (searchQuery) q.query = searchQuery;
    return q;
  }, [selectedSourceIds, selectedCategoryIds, searchQuery]);


  // -------- Reset & load first page when filters change --------
  const loadFirstPage = useCallback(async () => {
    const reqId = ++pageLoadIdRef.current;

    setLoadingInitial(true);
    setError(null);
    setReachedEnd(false);
    setPendingNewArticles([]);

    try {
      let page = await api.articles.list({
        ...buildFilterArgs(),
        limit: PAGE_SIZE,
        sort_order: sortOrder,
      });
      if (reqId !== pageLoadIdRef.current) return;

      page = page || [];
      let filteredList = filterArticles(page);
      let attempts = 0;
      while (
        filteredList.length === 0 &&
        page.length === PAGE_SIZE &&
        attempts < 8
      ) {
        const last = page[page.length - 1];
        const cursor = cursorOf(last);
        const cursorParams =
          sortOrder === "desc" ? { before: cursor } : { after: cursor };

        page = await api.articles.list({
          ...buildFilterArgs(),
          ...cursorParams,
          limit: PAGE_SIZE,
          sort_order: sortOrder,
        });
        if (reqId !== pageLoadIdRef.current) return;

        page = page || [];
        filteredList = filterArticles(page);
        attempts += 1;
      }

      setArticles(filteredList);
      setReachedEnd(page.length < PAGE_SIZE);
    } catch (err) {
      if (reqId !== pageLoadIdRef.current) return;
      setError(err.message || "Failed to load articles");
      setArticles([]);
      setReachedEnd(true);
    } finally {
      if (reqId === pageLoadIdRef.current) setLoadingInitial(false);
    }
  }, [buildFilterArgs, sortOrder, filterArticles]);

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  // -------- Infinite scroll: load next page --------
  const loadMore = useCallback(async () => {
    if (loadingInitial || loadingMore || reachedEnd) return;
    if (articles.length === 0) return;

    const reqId = pageLoadIdRef.current;
    setLoadingMore(true);

    try {
      let page = [];
      let last = articles[articles.length - 1];
      let cursor = cursorOf(last);
      let cursorParams =
        sortOrder === "desc" ? { before: cursor } : { after: cursor };
      let attempts = 0;

      do {
        const data = await api.articles.list({
          ...buildFilterArgs(),
          ...cursorParams,
          limit: PAGE_SIZE,
          sort_order: sortOrder,
        });
        if (reqId !== pageLoadIdRef.current) return;

        page = data || [];
        const fresh = filterArticles(page);
        if (fresh.length > 0) {
          setArticles((prev) => {
            const seen = new Set(prev.map((a) => a.id));
            const filteredFresh = fresh.filter((a) => !seen.has(a.id));
            if (filteredFresh.length === 0) {
              setReachedEnd(page.length < PAGE_SIZE);
              return prev;
            }
            return [...prev, ...filteredFresh];
          });

          if (page.length < PAGE_SIZE) setReachedEnd(true);
          return;
        }

        if (page.length < PAGE_SIZE) {
          setReachedEnd(true);
          return;
        }

        last = page[page.length - 1];
        cursor = cursorOf(last);
        cursorParams = sortOrder === "desc" ? { before: cursor } : { after: cursor };
        attempts += 1;
      } while (attempts < 8);

      setReachedEnd(page.length < PAGE_SIZE);
    } catch (err) {
      console.error("loadMore failed:", err);
    } finally {
      if (reqId === pageLoadIdRef.current) setLoadingMore(false);
    }
  }, [
    articles,
    buildFilterArgs,
    filterArticles,
    loadingInitial,
    loadingMore,
    reachedEnd,
    sortOrder,
  ]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || reachedEnd) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: `${INFINITE_SCROLL_THRESHOLD}px` },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore, reachedEnd]);

  // -------- Head poll --------
  const pollHead = useCallback(async () => {
    if (sortOrderRef.current !== "desc") return;

    const visible = articlesRef.current;
    if (visible.length === 0) return;

    const reqId = ++headPollIdRef.current;

    const headCursor = visible.reduce(
      (acc, a) => Math.max(acc, cursorOf(a)),
      0,
    );
    if (!headCursor) return;

    try {
      const data = await api.articles.list({
        ...buildFilterArgs(),
        after: headCursor,
        limit: HEAD_POLL_PAGE_SIZE,
        sort_order: "desc",
      });
      if (reqId !== headPollIdRef.current) return;

      const incoming = data || [];
      if (incoming.length === 0) return;

      const inFeed = new Set(articlesRef.current.map((a) => a.id));
      const inPending = new Set(pendingRef.current.map((a) => a.id));
      const fresh = incoming.filter(
        (a) => !inFeed.has(a.id) && !inPending.has(a.id),
      );
      if (fresh.length === 0) return;

      setPendingNewArticles((prev) => {
        const seen = new Set(prev.map((a) => a.id));
        const dedup = fresh.filter((a) => !seen.has(a.id));
        if (dedup.length === 0) return prev;
        return [...dedup, ...prev];
      });
    } catch (err) {
      console.debug("pollHead failed:", err);
    }
  }, [buildFilterArgs]);

  useEffect(() => {
    if (sortOrder !== "desc") return;
    const t = setInterval(() => {
      pollHead();
    }, HEAD_POLL_MS);
    return () => clearInterval(t);
  }, [pollHead, sortOrder]);

  useEffect(() => {
    const unsubscribe = api.events.subscribe((evt) => {
      if (evt.type === "Update") {
        pollHead();
      } else if (evt.type === "Failure") {
        console.warn("Aleym source fetch failed:", evt.raw);
      }
    });
    return unsubscribe;
  }, [pollHead]);

  const revealPendingArticles = useCallback(() => {
    const pending = pendingRef.current;
    if (pending.length === 0) return;

    setArticles((prev) => {
      const seen = new Set(prev.map((a) => a.id));
      const fresh = pending.filter((a) => !seen.has(a.id));
      return [...fresh, ...prev];
    });
    setPendingNewArticles([]);

    requestAnimationFrame(() => {
      if (scrollAnchorRef.current) {
        scrollAnchorRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }, []);

  const sortedArticles = useMemo(
    () => sortArticles(articles, sortOrder),
    [articles, sortOrder],
  );

  const onArticleReadChange = useCallback((articleId, newIsRead) => {
    setArticles((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, is_read: newIsRead } : a)),
    );
  }, []);

  const onArticleSelect = useCallback(
    (article) => {
      const existing = focusSessionsRef.current.get(article.id);
      if (existing) existing.session.stop();
      focusSessionsRef.current.set(article.id, {
        session: new ActivitySession(),
        openedAt: Date.now(),
      });
      navigateTo("article", { articleId: article.id });
    },
    [navigateTo],
  );

  useEffect(() => {
    return () => flushAllFocusSessions(focusSessionsRef.current);
  }, []);

  useEffect(() => {
    const handler = () => flushAllFocusSessions(focusSessionsRef.current);
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setError(null);
    const minSpin = new Promise((r) => setTimeout(r, 500));
    try {
      await Promise.all([pollHead(), loadFirstPage(), minSpin]);
    } finally {
      setRefreshing(false);
    }
  }, [loadFirstPage, pollHead, refreshing]);

  const onManualFetchSource = useCallback(async () => {
    if (!selectedSource || manualFetching) return;
    setManualFetching(true);
    setError(null);

    const updatePromise = new Promise((resolve) => {
      const unsubscribe = api.events.subscribe((evt) => {
        if (evt.type === "Update") {
          unsubscribe();
          resolve("update");
        }
      });
      setTimeout(() => {
        unsubscribe();
        resolve("timeout");
      }, MANUAL_FETCH_TIMEOUT_MS);
    });

    try {
      await api.sources.manualFetch(selectedSource);
      await updatePromise;
      await loadFirstPage();
    } catch (err) {
      console.error("Manual fetch failed:", err);
      setError(err.message || "Manual fetch failed");
    } finally {
      setManualFetching(false);
    }
  }, [selectedSource, manualFetching, loadFirstPage]);

  // -------- Layout --------
  const marginLeft = compactMode
    ? 0
    : sidebarOpen
      ? SIDEBAR_WIDTH_OPEN
      : SIDEBAR_WIDTH_CLOSED;

  const contentPadding = compactMode ? "24px" : "60px";

  const selectStyle = {
    padding: "8px 32px 8px 12px",
    fontSize: "13px",
    fontFamily: "'DM Sans', sans-serif",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px",
    color: "#e8e6e1",
    outline: "none",
    cursor: "pointer",
    appearance: "none",
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236a6a7a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
    transition: "border-color 0.2s ease",
  };

  return (
    <>
      {!compactMode && (
        <Sidebar
          open={sidebarOpen}
          setOpen={(val) => {
            const newVal = typeof val === "function" ? val(sidebarOpen) : val;
            localStorage.setItem("sidebarOpen", JSON.stringify(newVal));
            setSidebarOpen(newVal);
          }}
          navigateTo={navigateTo}
          selectedCategoryIds={selectedCategoryIds}
          selectedSourceIds={selectedSourceIds}
          disableTransition={!enableTransition}
        />
      )}

      <style>{`
        @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        @keyframes aleymBubblePop {
          0%   { transform: translate(-50%, -8px) scale(0.85); opacity: 0; }
          60%  { transform: translate(-50%, 2px) scale(1.04);  opacity: 1; }
          100% { transform: translate(-50%, 0)   scale(1);     opacity: 1; }
        }
        @keyframes aleymBubblePulse {
          0%, 100% { box-shadow: 0 8px 24px rgba(199,146,234,0.25), 0 0 0 0 rgba(199,146,234,0.35); }
          50%      { box-shadow: 0 8px 24px rgba(199,146,234,0.25), 0 0 0 10px rgba(199,146,234,0); }
        }
      `}</style>

      <div
        style={{
          marginLeft: `${marginLeft}px`,
          width: compactMode ? "100%" : `calc(100vw - ${marginLeft}px)`,
          transition: enableTransition
            ? "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
            : "none",
          minHeight: "100vh",
          background: "#0e0e12",
          color: "#e8e6e1",
          fontFamily: "'DM Sans', sans-serif",
          overflowX: "hidden",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        {pendingNewArticles.length > 0 && (
          <button
            onClick={revealPendingArticles}
            style={{
              position: compactMode ? "sticky" : "fixed",
              top: compactMode ? "16px" : "24px",
              left: compactMode ? "50%" : `calc(50% + ${marginLeft / 2}px)`,
              transform: "translateX(-50%)",
              zIndex: 100,
              padding: "10px 20px",
              fontSize: "13px",
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              borderRadius: "999px",
              border: "1px solid rgba(199,146,234,0.4)",
              background:
                "linear-gradient(135deg, rgba(199,146,234,0.95), rgba(130,170,255,0.95))",
              color: "#0e0e12",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              animation:
                "aleymBubblePop 0.3s cubic-bezier(0.34,1.56,0.64,1) both, aleymBubblePulse 2.4s ease-in-out 0.4s infinite",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
            aria-label={`Show ${pendingNewArticles.length} New Articles`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
            {pendingNewArticles.length} new{" "}
            {pendingNewArticles.length === 1 ? "article" : "articles"}
          </button>
        )}

        <div
          style={{
            padding: contentPadding,
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <div ref={scrollAnchorRef} />

          <h1
            style={{
              fontSize: compactMode
                ? "clamp(22px, 3vw, 28px)"
                : "clamp(32px, 4vw, 48px)",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              lineHeight: 1.1,
              margin: 0,
              color: "#e8e6e1",
              letterSpacing: "-0.5px",
            }}
          >
            Aleym Feed
          </h1>

          {/* Search */}
          <div
            style={{
              marginTop: compactMode ? "20px" : "32px",
              marginBottom: compactMode ? "14px" : "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px",
                padding: "10px 16px",
                maxWidth: compactMode ? "100%" : "480px",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#5a5a6a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search articles..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#e8e6e1",
                  fontSize: "14px",
                  fontFamily: "'DM Sans', sans-serif",
                  marginLeft: "12px",
                  width: "100%",
                }}
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#5a5a6a",
                    cursor: "pointer",
                    padding: "2px",
                    display: "flex",
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                  aria-label="Clear search"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: compactMode ? "20px" : "28px",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <select
                value={selectedSource}
                onChange={(e) => {
                  const sourceId = e.target.value;
                  navigateTo("aleym", {
                    categoryIds: [],
                    sourceIds: sourceId ? [sourceId] : [],
                  });
                }}
                style={selectStyle}
              >
                <option value="">All Sources</option>
                {sources
                  .filter((s) => s.is_enabled)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  const categoryId = e.target.value;
                  navigateTo("aleym", {
                    categoryIds: categoryId ? [categoryId] : [],
                    sourceIds: [],
                  });
                }}
                style={selectStyle}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                style={selectStyle}
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>

              <button
                onClick={onRefresh}
                disabled={refreshing}
                style={{
                  ...refreshButtonStyle,
                  opacity: refreshing ? 0.7 : 1,
                  cursor: refreshing ? "wait" : "pointer",
                }}
                title="Check for new articles and reload"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    animation: refreshing
                      ? "spin 0.8s linear infinite"
                      : "none",
                    transformOrigin: "center",
                  }}
                >
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>

              {selectedSource && (
                <button
                  onClick={onManualFetchSource}
                  disabled={manualFetching}
                  style={{
                    ...refreshButtonStyle,
                    color: "#82aaff",
                    borderColor: "rgba(130,170,255,0.15)",
                    background: "rgba(130,170,255,0.08)",
                    opacity: manualFetching ? 0.7 : 1,
                    cursor: manualFetching ? "wait" : "pointer",
                  }}
                  title="Trigger backend to fetch new articles from this source now, then refresh the feed"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      animation: manualFetching
                        ? "spin 0.8s linear infinite"
                        : "none",
                      transformOrigin: "center",
                    }}
                  >
                    <path d="M12 2v6m0 0l-4-4m4 4l4-4" />
                    <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                  </svg>
                  {manualFetching ? "Fetching…" : "Fetch Source"}
                </button>
              )}
            </div>
            {!compactMode && (
              <ViewToggle
                viewMode={viewMode}
                setViewMode={(mode) => {
                  localStorage.setItem("viewMode", mode);
                  setViewMode(mode);
                }}
              />
            )}
          </div>

          {loadingInitial && articles.length === 0 && (
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
                Loading articles…
              </p>
            </div>
          )}

          {!loadingInitial && error && articles.length === 0 && (
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
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ff6464"
                  strokeWidth="2"
                  strokeLinecap="round"
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
                Unable to load articles
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

          {!loadingInitial && !error && articles.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <p style={{ color: "#5a5a6a", fontSize: "15px" }}>
                {searchQuery
                  ? "No articles match your search."
                  : "No articles found. Try adjusting filters or add some sources."}
              </p>
            </div>
          )}

          {sortedArticles.length > 0 && (
            <>
              <div
                style={
                  isGrid
                    ? {
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(280px, 1fr))",
                        gap: "16px",
                        width: "100%",
                        boxSizing: "border-box",
                      }
                    : {
                        display: "flex",
                        flexDirection: "column",
                        gap: compactMode ? "10px" : "12px",
                        width: "100%",
                        boxSizing: "border-box",
                      }
                }
              >
                {sortedArticles.map((article, i) => (
                  <FeedArticleCard
                    key={article.id}
                    article={article}
                    sourceName={sourceMap[article.source]?.name || "Unknown"}
                    index={i}
                    isGrid={isGrid}
                    isSelected={article.id === selectedArticleId}
                    onSelect={() => onArticleSelect(article)}
                    onReadChange={(newIsRead) =>
                      onArticleReadChange(article.id, newIsRead)
                    }
                    onSummarize={onSummarize}
                  />
                ))}
              </div>

              <div ref={sentinelRef} style={{ height: "1px" }} />

              <div
                style={{
                  textAlign: "center",
                  padding: "32px 0",
                  color: "#5a5a6a",
                  fontSize: "12px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                {loadingMore && (
                  <>
                    <div style={smallSpinnerStyle} />
                    <span>Loading more…</span>
                  </>
                )}
                {!loadingMore && reachedEnd && (
                  <span>
                    {sortedArticles.length}{" "}
                    {sortedArticles.length === 1 ? "article" : "articles"} · End
                    of Feed
                  </span>
                )}
                {!loadingMore && !reachedEnd && (
                  <span>
                    {sortedArticles.length}{" "}
                    {sortedArticles.length === 1 ? "article" : "articles"}{" "}
                    loaded
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
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

function FeedArticleCard({
  article,
  sourceName,
  index,
  isGrid,
  isSelected,
  onSelect,
  onReadChange,
  onSummarize,
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
    onSummarize,
    index,
  };

  const handleClick = (e) => {
    if (e.target.closest("a")) return;
    if (e.target.closest("button")) return;
    onSelect();
  };

  return (
    <div
      ref={ref}
      onClick={handleClick}
      style={{
        cursor: "pointer",
        borderRadius: "16px",
        outline: isSelected
          ? "2px solid rgba(199,146,234,0.55)"
          : "2px solid transparent",
        outlineOffset: "2px",
        transition: "outline-color 0.2s ease",
      }}
    >
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

const smallSpinnerStyle = {
  width: "20px",
  height: "20px",
  border: "2px solid rgba(255,255,255,0.06)",
  borderTop: "2px solid #c792ea",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};
