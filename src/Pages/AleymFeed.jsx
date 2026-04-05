import { useState, useEffect, useCallback } from "react";
import Sidebar, {
  SIDEBAR_WIDTH_OPEN,
  SIDEBAR_WIDTH_CLOSED,
} from "../components/Sidebar";
import ViewToggle from "../components/ViewToggle";
import AleymArticleCard from "../components/AleymArticleCard";
import {
  fetchArticles,
  fetchSources,
  fetchCategories,
  subscribeToEvents,
} from "../services/aleymApi";

export default function AleymFeed({ navigateTo }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem("viewMode");
    return saved || "compact";
  });
  const [enableTransition, setEnableTransition] = useState(false);

  const [articles, setArticles] = useState([]);
  const [sources, setSources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedSource, setSelectedSource] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [articleLimit, setArticleLimit] = useState(50);
  const [searchQuery, setSearchQuery] = useState("");

  const [liveStatus, setLiveStatus] = useState("connecting");
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEnableTransition(true));
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const sourceMap = {};
  sources.forEach((s) => {
    sourceMap[s.id] = s.name;
  });

  useEffect(() => {
    async function loadMeta() {
      try {
        const [srcData, catData] = await Promise.all([
          fetchSources(),
          fetchCategories(),
        ]);
        setSources(srcData);
        setCategories(catData);
      } catch {}
    }
    loadMeta();
  }, []);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (selectedSource) {
        const src = sources.find((s) => s.id === selectedSource);
        if (src && !src.is_enabled) {
          setArticles([]);
          setLoading(false);
          return;
        }
        const data = await fetchArticles({ limit: articleLimit, sort_order: sortOrder, source_id: selectedSource });
        setArticles(data);
      } else if (selectedCategory) {
        const data = await fetchArticles({ limit: articleLimit, sort_order: sortOrder, category_id: selectedCategory });
        setArticles(data);
      } else {
        const allSources = sources.length > 0 ? sources : await fetchSources();
        const enabledSources = allSources.filter((s) => s.is_enabled);

        if (enabledSources.length === 0) {
          setArticles([]);
          setLoading(false);
          return;
        }

        const perSource = Math.max(Math.floor(articleLimit / enabledSources.length), 5);

        const allResults = await Promise.all(
          enabledSources.map((s) =>
            fetchArticles({ source_id: s.id, limit: perSource, sort_order: sortOrder })
              .catch(() => [])
          )
        );

        const merged = allResults.flat();
        merged.sort((a, b) => {
          const timeA = a.published_at || a.first_fetched_at || 0;
          const timeB = b.published_at || b.first_fetched_at || 0;
          return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
        });

        setArticles(merged.slice(0, articleLimit));
      }
    } catch (err) {
      setError(err.message || "Failed to load articles");
    } finally {
      setLoading(false);
    }
  }, [selectedSource, selectedCategory, sortOrder, articleLimit, sources]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  useEffect(() => {
    const es = subscribeToEvents(
      () => {
        setLastUpdate(new Date());
        loadArticles();
      },
      (failData) => {
        console.warn("Aleym source fetch failed:", failData);
      }
    );

    es.onopen = () => setLiveStatus("connected");
    es.onerror = () => setLiveStatus("error");

    return () => {
      es.close();
    };
  }, [loadArticles]);

  const marginLeft = sidebarOpen ? SIDEBAR_WIDTH_OPEN : SIDEBAR_WIDTH_CLOSED;
  const isGrid = viewMode === "grid";

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

  const filteredArticles = articles.filter((article) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (article.title && article.title.toLowerCase().includes(q)) ||
      (sourceMap[article.source] && sourceMap[article.source].toLowerCase().includes(q))
    );
  });

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
          {/* Page heading */}
          <h1
            style={{
              fontSize: "clamp(32px, 4vw, 48px)",
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

          {/* Search bar */}
          <div style={{ marginTop: "28px", marginBottom: "24px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px",
                padding: "10px 16px",
                maxWidth: "480px",
                transition: "border-color 0.2s ease",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(199,146,234,0.3)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
            >
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="#5a5a6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    background: "none", border: "none", color: "#5a5a6a",
                    cursor: "pointer", padding: "2px", display: "flex",
                    alignItems: "center", flexShrink: 0,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Filter bar + View toggle on same line */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px", flexWrap: "wrap", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <select
                value={selectedSource}
                onChange={(e) => {
                  setSelectedSource(e.target.value);
                  if (e.target.value) setSelectedCategory("");
                }}
                style={selectStyle}
                onFocus={(e) => (e.target.style.borderColor = "rgba(199,146,234,0.4)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
              >
                <option value="">All Sources</option>
                {sources.filter((s) => s.is_enabled).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  if (e.target.value) setSelectedSource("");
                }}
                style={selectStyle}
                onFocus={(e) => (e.target.style.borderColor = "rgba(130,170,255,0.4)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={selectStyle}>
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>

              <select value={articleLimit} onChange={(e) => setArticleLimit(Number(e.target.value))} style={selectStyle}>
                <option value={20}>20 articles</option>
                <option value={50}>50 articles</option>
                <option value={100}>100 articles</option>
              </select>

              <button
                onClick={loadArticles}
                style={{
                  padding: "8px 16px", fontSize: "13px", fontWeight: 500,
                  fontFamily: "'DM Sans', sans-serif", borderRadius: "10px",
                  border: "1px solid rgba(199,146,234,0.15)",
                  background: "rgba(199,146,234,0.08)", color: "#c792ea",
                  cursor: "pointer", transition: "all 0.2s ease",
                  display: "flex", alignItems: "center", gap: "6px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(199,146,234,0.15)";
                  e.currentTarget.style.borderColor = "rgba(199,146,234,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(199,146,234,0.08)";
                  e.currentTarget.style.borderColor = "rgba(199,146,234,0.15)";
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Refresh
              </button>
            </div>

            <ViewToggle
              viewMode={viewMode}
              setViewMode={(mode) => {
                localStorage.setItem("viewMode", mode);
                setViewMode(mode);
              }}
            />
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: "16px" }}>
              <div style={{ width: "40px", height: "40px", border: "3px solid rgba(255,255,255,0.06)", borderTop: "3px solid #c792ea", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <p style={{ color: "#5a5a6a", fontSize: "13px", fontWeight: 500, margin: 0 }}>Loading articles from Aleym…</p>
              <style>{`@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`}</style>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div style={{ textAlign: "center", padding: "60px 20px", opacity: 0, animation: "fadeSlideUp 0.5s ease forwards 0.1s" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "rgba(255,100,100,0.08)", border: "1px solid rgba(255,100,100,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff6464" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p style={{ color: "#ff6464", fontSize: "15px", fontWeight: 500, marginBottom: "8px" }}>Unable to load articles</p>
              <p style={{ color: "#5a5a6a", fontSize: "13px", maxWidth: "400px", margin: "0 auto" }}>
                {error}. Make sure the Aleym API server is running.
              </p>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && filteredArticles.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px", opacity: 0, animation: "fadeSlideUp 0.5s ease forwards 0.1s" }}>
              <p style={{ color: "#5a5a6a", fontSize: "15px" }}>
                {searchQuery ? "No articles match your search." : "No articles found. Try adjusting filters or add some sources."}
              </p>
            </div>
          )}

          {/* Articles grid/list */}
          {!loading && !error && filteredArticles.length > 0 && (
            <div
              style={
                isGrid
                  ? { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", width: "100%", boxSizing: "border-box" }
                  : { display: "flex", flexDirection: "column", gap: "12px", width: "100%", boxSizing: "border-box" }
              }
            >
              {filteredArticles.map((article, i) => (
                <AleymArticleCard
                  key={article.id}
                  title={article.title}
                  uri={article.uri}
                  first_fetched_at={article.first_fetched_at}
                  published_at={article.published_at}
                  sourceName={sourceMap[article.source] || "Unknown"}
                  is_read={article.is_read}
                  index={i}
                  onSelect={() => navigateTo("article", { articleId: article.id })}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}