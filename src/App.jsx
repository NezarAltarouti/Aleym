import { useState, useEffect } from "react";
import SourcesManagements from "./Pages/SourcesManagement";
import AleymFeed from "./Pages/AleymFeed";
import ArticlePage from "./Pages/ArticlePage";
import ForYou from "./Pages/ForYou";

// SLIDE-IN PANEL VERSION
// When an article is selected from "aleym" or "foryou", the feed shrinks to a
// 420px column on the left and ArticlePage slides in from the right.

// ---------------------------------------------------------------------------
// localStorage keys for navigation state
// ---------------------------------------------------------------------------
const NAV_KEY = "navState";

// "article" is included as a fallback route for refresh-recovery when no
// feed is open.
const VALID_PAGES = new Set(["sources", "aleym", "foryou", "article"]);
const VALID_RETURN_PAGES = new Set(["sources", "aleym", "foryou"]);

// Feed pages — these support the slide-in article panel.
const FEED_PAGES = new Set(["aleym", "foryou"]);

function loadNavState() {
  try {
    const raw = localStorage.getItem(NAV_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveNavState(state) {
  try {
    localStorage.setItem(NAV_KEY, JSON.stringify(state));
  } catch {
    // Out of quota or storage disabled — non-fatal.
  }
}

export default function App() {
  const initial = loadNavState() || {};

  const initialPage = (() => {
    const p = initial.page;
    if (!VALID_PAGES.has(p)) return "aleym";
    if (p === "article" && !initial.selectedArticleId) {
      return VALID_RETURN_PAGES.has(initial.articleReturnTo)
        ? initial.articleReturnTo
        : "aleym";
    }
    return p;
  })();

  const [page, setPage] = useState(initialPage);
  const [selectedArticleId, setSelectedArticleId] = useState(
    initial.selectedArticleId ?? null,
  );
  const [articleReturnTo, setArticleReturnTo] = useState(
    VALID_RETURN_PAGES.has(initial.articleReturnTo)
      ? initial.articleReturnTo
      : "aleym",
  );

  useEffect(() => {
    saveNavState({ page, selectedArticleId, articleReturnTo });
  }, [page, selectedArticleId, articleReturnTo]);

  const navigateTo = (p, data) => {
    if (p === "article" && data?.articleId) {
      // If we're currently on a feed page, open the article as a slide-in
      // panel — DO NOT switch to the standalone "article" route, since that
      // would render the article a second time on top of the slide.
      if (FEED_PAGES.has(page)) {
        setSelectedArticleId(data.articleId);
        setArticleReturnTo(page);
        return; // stay on the feed page
      }

      // Coming from a non-feed page (e.g. "sources") — use the standalone
      // route as a fallback.
      setSelectedArticleId(data.articleId);
      setArticleReturnTo(VALID_RETURN_PAGES.has(page) ? page : "aleym");
      setPage("article");
      return;
    }

    // Any other navigation — clear the slide panel as we leave.
    setSelectedArticleId(null);
    setPage(p);
  };

  // Close the slide-in panel without leaving the feed.
  const handleCloseArticle = () => {
    setSelectedArticleId(null);
    // If we're on the dedicated "article" route (refresh-recovery case),
    // drop back to the return target.
    if (page === "article") {
      setPage(articleReturnTo);
    }
  };

  // Helper to render a feed page with optional slide-in article panel.
  const renderFeedWithSlide = (FeedComponent, feedKey) => {
    const showPanel = !!selectedArticleId;
    return (
      <div
        style={{
          display: "flex",
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: showPanel ? "0 0 420px" : "1 1 auto",
            minWidth: 0,
            overflowY: "auto",
            overflowX: "hidden",
            transition: "flex 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
            borderRight: showPanel
              ? "1px solid rgba(255,255,255,0.06)"
              : "none",
          }}
        >
          <FeedComponent
            navigateTo={navigateTo}
            compactMode={showPanel}
            selectedArticleId={selectedArticleId}
          />
        </div>
        {showPanel && (
          <div
            key={selectedArticleId}
            style={{
              flex: "1 1 0",
              minWidth: 0,
              overflow: "hidden",
              animation: "slideInFromRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <ArticlePage
              articleId={selectedArticleId}
              navigateTo={navigateTo}
              returnTo={feedKey}
              embedded
              onClose={handleCloseArticle}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700&family=Literata:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Source+Serif+4:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&family=IBM+Plex+Mono:wght@300;400;500&display=swap');

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0e0e12; overflow-x: hidden; }

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideInFromRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }

        html { scrollbar-width: thin; scrollbar-color: rgba(199,146,234,0.2) transparent; }

        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb {
          background: rgba(199,146,234,0.15);
          border-radius: 100px;
          border: 1px solid transparent;
          background-clip: padding-box;
          transition: background 0.3s ease;
        }
        ::-webkit-scrollbar-thumb:hover { background: rgba(199,146,234,0.35); }
        ::-webkit-scrollbar-thumb:active { background: rgba(199,146,234,0.5); }
        ::-webkit-scrollbar-corner { background: transparent; }

        body { overflow-y: overlay; }
        @supports not (overflow-y: overlay) { body { overflow-y: auto; } }
      `}</style>

      {page === "sources" && <SourcesManagements navigateTo={navigateTo} />}
      {page === "aleym" && renderFeedWithSlide(AleymFeed, "aleym")}
      {page === "foryou" && renderFeedWithSlide(ForYou, "foryou")}
      {/* Standalone article route — only reached when navigating from a
          non-feed page, or recovering from a refresh that landed here. */}
      {page === "article" && (
        <ArticlePage
          articleId={selectedArticleId}
          navigateTo={navigateTo}
          returnTo={articleReturnTo}
        />
      )}
    </>
  );
}