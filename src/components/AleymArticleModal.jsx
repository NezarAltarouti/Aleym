import { useState, useEffect } from "react";
import { fetchArticleById } from "../services/aleymApi";

export default function AleymArticleModal({ articleId, onClose }) {
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!articleId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchArticleById(articleId);
        if (!cancelled) setArticle(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const timestamp = article?.published_at || article?.first_fetched_at;
  const date = timestamp ? new Date(timestamp * 1000) : null;
  const formattedDate = date
    ? date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.2s ease",
        padding: "40px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1a1a22",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px",
          padding: "40px",
          width: "680px",
          maxWidth: "100%",
          maxHeight: "80vh",
          overflowY: "auto",
          fontFamily: "'DM Sans', sans-serif",
          boxShadow:
            "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(199,146,234,0.08)",
          animation: "fadeSlideUp 0.3s ease",
          position: "relative",
        }}
      >
        {/* Close button — fixed to top right of modal */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#6a6a7a",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s ease",
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,100,100,0.1)";
            e.currentTarget.style.borderColor = "rgba(255,100,100,0.2)";
            e.currentTarget.style.color = "#ff6464";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            e.currentTarget.style.color = "#6a6a7a";
          }}
        >
          <svg
            width="16"
            height="16"
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

        {loading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "60px 20px",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                border: "3px solid rgba(255,255,255,0.06)",
                borderTop: "3px solid #c792ea",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <p style={{ color: "#5a5a6a", fontSize: "13px", margin: 0 }}>
              Loading article…
            </p>
          </div>
        )}

        {error && (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <p style={{ color: "#ff6464", fontSize: "14px" }}>
              Failed to load article
            </p>
            <p style={{ color: "#5a5a6a", fontSize: "13px" }}>{error}</p>
          </div>
        )}

        {!loading && !error && article && (
          <div>
            {/* Title */}
            <h2
              style={{
                fontSize: "24px",
                fontWeight: 700,
                fontFamily: "'Playfair Display', serif",
                color: "#e8e6e1",
                lineHeight: 1.3,
                margin: "0 0 12px 0",
                paddingRight: "44px",
              }}
            >
              {article.title}
            </h2>

            {/* Date */}
            {formattedDate && (
              <p
                style={{
                  fontSize: "13px",
                  color: "#5a5a6a",
                  margin: "0 0 24px 0",
                }}
              >
                {formattedDate}
              </p>
            )}

            {/* Divider */}
            <div
              style={{
                height: "1px",
                background:
                  "linear-gradient(90deg, rgba(199,146,234,0.2), rgba(130,170,255,0.2), transparent)",
                marginBottom: "24px",
              }}
            />

            {/* Content — rendered as HTML */}
            {article.content ? (
              <div
                className="article-content"
                dangerouslySetInnerHTML={{ __html: article.content }}
                style={{
                  fontSize: "15px",
                  lineHeight: 1.8,
                  color: "#b0b0c0",
                  fontFamily: "'Source Serif 4', serif",
                  wordBreak: "break-word",
                }}
              />
            ) : (
              <p
                style={{
                  color: "#5a5a6a",
                  fontSize: "14px",
                  fontStyle: "italic",
                }}
              >
                No content available for this article.
              </p>
            )}

            {/* Link to original */}
            {article.uri && (
              <a
                href={article.uri}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  marginTop: "28px",
                  padding: "10px 20px",
                  borderRadius: "10px",
                  background: "rgba(199,146,234,0.08)",
                  border: "1px solid rgba(199,146,234,0.15)",
                  color: "#c792ea",
                  fontSize: "13px",
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "all 0.2s ease",
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
                Read original
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}
          </div>
        )}

        <style>{`
          @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
          .article-content p { margin: 0 0 16px 0; }
          .article-content a { color: #c792ea; text-decoration: none; }
          .article-content a:hover { text-decoration: underline; }
          .article-content img { max-width: 100%; border-radius: 10px; margin: 16px 0; display: block; }
          .article-content figure { margin: 20px 0; }
          .article-content figcaption { font-size: 12px; color: #5a5a6a; margin-top: 8px; }
          .article-content em { font-style: italic; }
          .article-content strong { font-weight: 600; color: #e8e6e1; }
          .article-content h2, .article-content h3 { color: #e8e6e1; margin: 24px 0 12px; font-family: 'DM Sans', sans-serif; }
          .article-content ul, .article-content ol { padding-left: 24px; margin: 12px 0; }
          .article-content li { margin-bottom: 8px; }
          .article-content blockquote { border-left: 3px solid rgba(199,146,234,0.3); padding-left: 16px; margin: 16px 0; color: #8a8a9a; }
          .article-content hr { border: none; height: 1px; background: rgba(255,255,255,0.06); margin: 24px 0; }
        `}</style>
      </div>
    </div>
  );
}