import { useState, useEffect, useRef } from "react";
import api from "../services/aleymApi";
import { ActivitySession } from "../services/activityTracker";

// SLIDE-IN PANEL VERSION (embedded mode supported)
// Minimum active-time before a Read signal is sent.
const MIN_READ_MS = 2000;

export default function ArticlePage({
  articleId,
  navigateTo,
  returnTo = "aleym",
  embedded = false,
  onClose,
}) {
  const [article, setArticle] = useState(null);
  const [sourceName, setSourceName] = useState("Unknown");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Reading session tracking
  const sessionRef = useRef(null);
  const maxScrollDepthRef = useRef(0);
  const readSentRef = useRef(false);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (!articleId) return;
    let cancelled = false;

    maxScrollDepthRef.current = 0;
    readSentRef.current = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [articleData, sourcesData] = await Promise.all([
          api.articles.getById(articleId),
          api.sources.list(),
        ]);
        if (cancelled) return;
        setArticle(articleData);
        const src = (sourcesData || []).find(
          (s) => s.id === articleData.source,
        );
        if (src) setSourceName(src.name);

        sessionRef.current = new ActivitySession();
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load article");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  // Scroll depth tracking
  useEffect(() => {
    if (!article) return;

    const target = embedded ? scrollContainerRef.current : window;
    if (!target) return;

    const handleScroll = () => {
      let percentage;
      if (embedded && scrollContainerRef.current) {
        const el = scrollContainerRef.current;
        const docHeight = el.scrollHeight - el.clientHeight;
        if (docHeight <= 0) return;
        percentage = Math.min(
          100,
          Math.round((el.scrollTop / docHeight) * 100),
        );
      } else {
        const docHeight =
          document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight <= 0) return;
        percentage = Math.min(
          100,
          Math.round((window.scrollY / docHeight) * 100),
        );
      }
      if (percentage > maxScrollDepthRef.current) {
        maxScrollDepthRef.current = percentage;
      }
    };

    handleScroll();
    target.addEventListener("scroll", handleScroll, { passive: true });
    return () => target.removeEventListener("scroll", handleScroll);
  }, [article, embedded]);

  // Send Read on leave
  useEffect(() => {
    if (!article) return;

    const sendReadSignal = () => {
      if (readSentRef.current) return;
      const session = sessionRef.current;
      if (!session) return;

      const activeMs = session.stop();
      sessionRef.current = null;

      if (activeMs < MIN_READ_MS) return;

      readSentRef.current = true;
      api.feedback
        .read({
          news: article.id,
          done_at: Math.floor(Date.now() / 1000),
          duration: activeMs,
          scroll_depth_percentage: maxScrollDepthRef.current,
        })
        .catch((err) => console.debug("Read feedback failed:", err));
    };

    window.addEventListener("beforeunload", sendReadSignal);
    return () => {
      sendReadSignal();
      window.removeEventListener("beforeunload", sendReadSignal);
    };
  }, [article]);

  // Vote handlers
  const [voteState, setVoteState] = useState(null);
  const [voteBusy, setVoteBusy] = useState(false);

  useEffect(() => {
    if (!articleId) {
      setVoteState(null);
      return;
    }
    try {
      const stored = localStorage.getItem(`aleym:vote:${articleId}`);
      if (stored === "up") setVoteState("up");
      else if (stored === "down") setVoteState("down");
      else setVoteState(null);
    } catch {
      setVoteState(null);
    }
  }, [articleId]);

  useEffect(() => {
    if (!articleId) return;
    const handleVoteChange = (e) => {
      if (e.detail?.articleId !== articleId) return;
      setVoteState(e.detail.vote);
    };
    window.addEventListener("aleym:vote-changed", handleVoteChange);
    return () => {
      window.removeEventListener("aleym:vote-changed", handleVoteChange);
    };
  }, [articleId]);

  const handleVote = (isUpVote) => {
    if (!article || voteBusy) return;

    const previousVote = voteState;
    const intendedVote = isUpVote ? "up" : "down";
    const isUndo = previousVote === intendedVote;
    const newVote = isUndo ? null : intendedVote;

    setVoteBusy(true);
    setVoteState(newVote);

    try {
      if (newVote === null) {
        localStorage.removeItem(`aleym:vote:${article.id}`);
      } else {
        localStorage.setItem(`aleym:vote:${article.id}`, newVote);
      }
    } catch {}

    window.dispatchEvent(
      new CustomEvent("aleym:vote-changed", {
        detail: { articleId: article.id, vote: newVote },
      }),
    );

    let apiPromise;
    if (isUndo) {
      if (api.feedback && typeof api.feedback.removeVote === "function") {
        apiPromise = api.feedback.removeVote({
          news: article.id,
          done_at: Math.floor(Date.now() / 1000),
        });
      } else {
        apiPromise = Promise.resolve();
      }
    } else {
      apiPromise = api.feedback.explicitVote({
        news: article.id,
        done_at: Math.floor(Date.now() / 1000),
        is_up_vote: isUpVote,
      });
    }

    apiPromise
      .catch((err) => {
        console.warn("Vote feedback failed:", err);
        setVoteState(previousVote);
        try {
          if (previousVote === null) {
            localStorage.removeItem(`aleym:vote:${article.id}`);
          } else {
            localStorage.setItem(`aleym:vote:${article.id}`, previousVote);
          }
        } catch {}
        window.dispatchEvent(
          new CustomEvent("aleym:vote-changed", {
            detail: { articleId: article.id, vote: previousVote },
          }),
        );
      })
      .finally(() => setVoteBusy(false));
  };

  const backLabel = returnTo === "foryou" ? "Back to For You" : "Back to Feed";
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
  const formattedTime = date
    ? date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : "";

  const handleBack = () => {
    if (embedded && onClose) {
      onClose();
    } else {
      navigateTo(returnTo);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0e0e12",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
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
        <p style={{ color: "#5a5a6a", fontSize: "13px", margin: 0 }}>
          Loading article…
        </p>
        <style>{`@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0e0e12",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Sans', sans-serif",
          padding: "40px",
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
            marginBottom: "20px",
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
          Unable to load article
        </p>
        <p style={{ color: "#5a5a6a", fontSize: "13px", marginBottom: "24px" }}>
          {error}
        </p>
        <button
          onClick={handleBack}
          style={{
            padding: "10px 24px",
            fontSize: "14px",
            fontWeight: 500,
            fontFamily: "'DM Sans', sans-serif",
            borderRadius: "10px",
            border: "none",
            background: "linear-gradient(135deg, #c792ea, #82aaff)",
            color: "#0e0e12",
            cursor: "pointer",
          }}
        >
          ← {embedded ? "Close" : backLabel}
        </button>
      </div>
    );
  }

  if (!article) return null;

  return (
    <div
      ref={scrollContainerRef}
      style={{
        minHeight: "100vh",
        background: "#0e0e12",
        fontFamily: "'DM Sans', sans-serif",
        color: "#e8e6e1",
        ...(embedded
          ? { height: "100vh", overflowY: "auto", overflowX: "hidden" }
          : {}),
      }}
    >
      {embedded ? (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            background: "rgba(14,14,18,0.85)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          {article.uri ? (
            <a
              href={article.uri}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 500,
                borderRadius: "8px",
                border: "1px solid rgba(199,146,234,0.15)",
                background: "rgba(199,146,234,0.08)",
                color: "#c792ea",
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
              Open Original
              <svg
                width="13"
                height="13"
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
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#6a6a7a",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
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
            <span style={{ fontSize: "18px", color: "white" }}>&#10005;</span>
          </button>
        </div>
      ) : (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            background: "rgba(14,14,18,0.85)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            padding: "16px 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            onClick={() => navigateTo(returnTo)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              color: "#b0b0c0",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(199,146,234,0.08)";
              e.currentTarget.style.borderColor = "rgba(199,146,234,0.2)";
              e.currentTarget.style.color = "#c792ea";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              e.currentTarget.style.color = "#b0b0c0";
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
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            {backLabel}
          </button>

          {article.uri && (
            <a
              href={article.uri}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 500,
                borderRadius: "10px",
                border: "1px solid rgba(199,146,234,0.15)",
                background: "rgba(199,146,234,0.08)",
                color: "#c792ea",
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
              Open Original
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

      {/* Body */}
      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          padding: embedded ? "32px 32px 80px" : "60px 40px 100px",
          animation: "fadeSlideUp 0.5s ease forwards",
        }}
      >
        <div
          style={{
            display: "inline-block",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            color: "#c792ea",
            background: "rgba(199,146,234,0.08)",
            border: "1px solid rgba(199,146,234,0.12)",
            borderRadius: "6px",
            padding: "4px 12px",
            marginBottom: "24px",
          }}
        >
          {sourceName}
        </div>

        <h1
          style={{
            fontSize: embedded
              ? "clamp(24px, 3vw, 34px)"
              : "clamp(28px, 4vw, 42px)",
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            lineHeight: 1.25,
            color: "#e8e6e1",
            margin: "0 0 20px 0",
          }}
        >
          {article.title}
        </h1>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "32px",
            flexWrap: "wrap",
          }}
        >
          {formattedDate && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#5a5a6a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span style={{ fontSize: "13px", color: "#5a5a6a" }}>
                {formattedDate}
              </span>
            </div>
          )}
          {formattedTime && (
            <>
              <span style={{ color: "#3a3a4a" }}>•</span>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#5a5a6a"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span style={{ fontSize: "13px", color: "#5a5a6a" }}>
                  {formattedTime}
                </span>
              </div>
            </>
          )}
          {!article.is_read && (
            <>
              <span style={{ color: "#3a3a4a" }}>•</span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#82aaff",
                  background: "rgba(130,170,255,0.1)",
                  border: "1px solid rgba(130,170,255,0.15)",
                  borderRadius: "6px",
                  padding: "2px 8px",
                }}
              >
                Unread
              </span>
            </>
          )}
        </div>

        <div
          style={{
            height: "1px",
            background:
              "linear-gradient(90deg, rgba(199,146,234,0.3), rgba(130,170,255,0.3), transparent)",
            marginBottom: "36px",
          }}
        />

        {article.content ? (
          <>
            <div
              className="article-content"
              dangerouslySetInnerHTML={{ __html: article.content }}
              style={{
                fontSize: embedded ? "16px" : "17px",
                lineHeight: 1.8,
                color: "#c8c6c1",
                fontFamily: "'Source Serif 4', serif",
                wordBreak: "break-word",
                letterSpacing: "0.2px",
              }}
            />

            {/* Source-provided summary, shown after the article body */}
            {article.summary && (
              <div
                style={{
                  marginTop: "40px",
                  padding: "20px 24px",
                  borderRadius: "12px",
                  background: "rgba(199,146,234,0.04)",
                  border: "1px solid rgba(199,146,234,0.12)",
                }}
              >
                <div
                  style={{
                    marginBottom: "10px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      letterSpacing: "1.2px",
                      textTransform: "uppercase",
                      color: "#c792ea",
                    }}
                  >
                    Source Summary
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    lineHeight: 1.65,
                    color: "#b8b6b1",
                    fontStyle: "italic",
                  }}
                >
                  {article.summary}
                </p>
              </div>
            )}
          </>
        ) : article.summary ? (
          /* No content but summary available — show summary + redirect CTA */
          <div>
            <div
              style={{
                padding: "24px",
                borderRadius: "14px",
                background: "rgba(199,146,234,0.04)",
                border: "1px solid rgba(199,146,234,0.12)",
                marginBottom: "32px",
              }}
            >
              <div
                style={{
                  marginBottom: "14px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "1.2px",
                    textTransform: "uppercase",
                    color: "#c792ea",
                  }}
                >
                  Source Summary
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: embedded ? "15px" : "16px",
                  lineHeight: 1.75,
                  color: "#c8c6c1",
                  fontFamily: "'Source Serif 4', serif",
                }}
              >
                {article.summary}
              </p>
            </div>

            <div
              style={{
                textAlign: "center",
                padding: "32px 20px",
                borderRadius: "14px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p
                style={{
                  color: "#8a8a9a",
                  fontSize: "14px",
                  fontWeight: 500,
                  margin: "0 0 6px 0",
                }}
              >
                Want to read the full article?
              </p>
              <p
                style={{
                  color: "#5a5a6a",
                  fontSize: "13px",
                  maxWidth: "420px",
                  margin: "0 auto 20px",
                }}
              >
                Only the summary is available here. Visit the source for the
                complete story.
              </p>
              {article.uri && (
                <a
                  href={article.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "12px 24px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #c792ea, #82aaff)",
                    color: "#0e0e12",
                    fontSize: "14px",
                    fontWeight: 600,
                    textDecoration: "none",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow =
                      "0 8px 30px rgba(199,146,234,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  Read on {sourceName}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        ) : (
          /* No content AND no summary state */
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
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
                stroke="#5a5a6a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p
              style={{
                color: "#5a5a6a",
                fontSize: "15px",
                fontWeight: 500,
                marginBottom: "8px",
              }}
            >
              No content available
            </p>
            <p
              style={{
                color: "#4a4a5a",
                fontSize: "13px",
                maxWidth: "400px",
                margin: "0 auto 24px",
              }}
            >
              This article doesn't have inline content or a summary. You can
              read the full article on the original website.
            </p>
            {article.uri && (
              <a
                href={article.uri}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 24px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #c792ea, #82aaff)",
                  color: "#0e0e12",
                  fontSize: "14px",
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 30px rgba(199,146,234,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                Read on {sourceName}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </a>
            )}
          </div>
        )}

        {(article.content || article.summary) && (
          <div
            style={{
              marginTop: "48px",
              padding: "20px",
              borderRadius: "14px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#e8e6e1",
                }}
              >
                Was this article useful?
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "12px",
                  color: "#5a5a6a",
                }}
              >
                Your feedback helps tune your recommendations.
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => handleVote(true)}
                disabled={voteBusy}
                style={voteBtnStyle(voteState === "up", "#7ec798")}
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
                >
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                </svg>
                {voteState === "up" ? "Thanks!" : "More like this"}
              </button>
              <button
                onClick={() => handleVote(false)}
                disabled={voteBusy}
                style={voteBtnStyle(voteState === "down", "#ff8a8a")}
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
                >
                  <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
                </svg>
                {voteState === "down" ? "Got it" : "Less like this"}
              </button>
            </div>
          </div>
        )}

        {(article.content || article.summary) && article.uri && (
          <div
            style={{
              marginTop: "32px",
              paddingTop: "32px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <p style={{ color: "#5a5a6a", fontSize: "13px", margin: 0 }}>
              Originally published on {sourceName}
            </p>
            <a
              href={article.uri}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
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
              Read original article
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
          </div>
        )}

        <style>{`
          .article-content p { margin: 0 0 18px 0; }
          .article-content a { color: #c792ea; text-decoration: none; }
          .article-content a:hover { text-decoration: underline; }
          .article-content img { max-width: 100%; border-radius: 10px; margin: 20px 0; display: block; }
          .article-content figure { margin: 24px 0; }
          .article-content figcaption { font-size: 12px; color: #5a5a6a; margin-top: 8px; }
          .article-content em { font-style: italic; }
          .article-content strong { font-weight: 600; color: #e8e6e1; }
          .article-content h2, .article-content h3 { color: #e8e6e1; margin: 28px 0 14px; font-family: 'DM Sans', sans-serif; font-size: 20px; }
          .article-content ul, .article-content ol { padding-left: 24px; margin: 14px 0; }
          .article-content li { margin-bottom: 10px; }
          .article-content blockquote { border-left: 3px solid rgba(199,146,234,0.3); padding-left: 16px; margin: 20px 0; color: #8a8a9a; }
          .article-content hr { border: none; height: 1px; background: rgba(255,255,255,0.08); margin: 28px 0; }
          .article-content s, .article-content strike { color: #5a5a6a; }
        `}</style>
      </div>
    </div>
  );
}

function voteBtnStyle(active, color) {
  return {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 14px",
    borderRadius: "10px",
    border: `1px solid ${color}33`,
    background: active ? `${color}22` : `${color}0d`,
    color,
    fontSize: "13px",
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
    transition: "all 0.2s ease",
    opacity: 1,
  };
}
