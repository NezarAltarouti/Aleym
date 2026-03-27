import { useState, useEffect } from "react";
import NewsCard from "./NewsCard";
import NewsCardGrid from "./NewsCardGrid";
import { fetchCyberSecurityNews } from "../services/newsApi";

/**
 * NewsFeed — fetches cybersecurity news on mount (and on page refresh)
 * and renders a list of NewsCard (compact) or NewsCardGrid (grid) components.
 *
 * Loading state uses a simple centered spinner instead of skeleton cards
 * so the surrounding layout (search bar, toggle) stays fixed in place.
 */
export default function NewsFeed({ viewMode = "compact" }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadNews() {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchCyberSecurityNews();
        if (!cancelled) {
          const cleaned = data.filter(
            (a) => a.title && a.title !== "[Removed]",
          );
          setArticles(cleaned);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load news");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadNews();

    return () => {
      cancelled = true;
    };
  }, []);

  const isGrid = viewMode === "grid";

  /* ── Loading — centered spinner ── */
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 20px",
          gap: "16px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Spinning circle */}
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "3px solid rgba(255,255,255,0.06)",
            borderTop: "3px solid #c792ea",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p
          style={{
            color: "#5a5a6a",
            fontSize: "13px",
            fontWeight: 500,
            margin: 0,
          }}
        >
          Loading News
        </p>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px 20px",
          opacity: 0,
          animation: "fadeSlideUp 0.5s ease forwards 0.1s",
        }}
      >
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
            strokeLinejoin="round"
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
          Unable to load news
        </p>
        <p
          style={{
            color: "#5a5a6a",
            fontSize: "13px",
            maxWidth: "360px",
            margin: "0 auto",
          }}
        >
          {error}. Refresh the page to try again.
        </p>
      </div>
    );
  }

  /* ── Empty state ── */
  if (articles.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px 20px",
          opacity: 0,
          animation: "fadeSlideUp 0.5s ease forwards 0.1s",
        }}
      >
        <p style={{ color: "#5a5a6a", fontSize: "15px" }}>
          No articles found. Refresh the page to try again.
        </p>
      </div>
    );
  }

  /* ── Article list / grid ── */
  const CardComponent = isGrid ? NewsCardGrid : NewsCard;

  return (
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
        <CardComponent
          key={article.url + i}
          title={article.title}
          publishedAt={article.publishedAt}
          url={article.url}
          source={article.source?.name}
          description={article.description}
          content={article.content}
          author={article.author}
          urlToImage={article.urlToImage}
          index={i}
        />
      ))}
    </div>
  );
}
