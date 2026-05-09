import { useState, useEffect, useRef } from "react";
import api from "../services/aleymApi";
import SummarizeButton from "./SummarizeButton";

// NO ANIMATION (NO SLIDE)

/**
 * Strip HTML tags and decode entities from a string,
 * returning clean plain text suitable for display in a card preview.
 */
function stripHtml(html) {
  if (!html || typeof html !== "string") return "";
  // Use the browser's parser to safely extract text content
  const doc = new DOMParser().parseFromString(html, "text/html");
  const text = doc.body.textContent || "";
  // Collapse whitespace (newlines, tabs, multiple spaces) into single spaces
  return text.replace(/\s+/g, " ").trim();
}

/**
 * NewsCardGrid — displays a single news article in a square card layout.
 * Props:
 *   - id: string (UUID) — required for feedback / read-state actions
 *   - title, publishedAt, url, source, description
 *   - content: raw content from NewsAPI (may be truncated)
 *   - author: article author
 *   - urlToImage: hero image URL
 *   - isRead: boolean — current read state from the API
 *   - onReadChange: (newIsRead: boolean) => void — parent callback when read flag toggles
 *   - onSummarize: (articleId: string) => void — callback to open AI summary view
 *   - index: number (for staggered animation)
 *
 * VOTING BEHAVIOR:
 *   - Click upvote/downvote once to vote
 *   - Click the same button again to UNDO (clear the vote)
 *   - Click the opposite button to switch votes
 *
 * LAYOUT:
 *   - AI Summarize and Redirect buttons remain visible outside the kebab menu
 *   - Upvote, Downvote, and Read/Unread are grouped inside the "⋮" dropdown menu
 */
export default function NewsCardGrid({
  id,
  title,
  publishedAt,
  url,
  source,
  description,
  content,
  author,
  urlToImage,
  isRead = false,
  onReadChange,
  onSummarize,
  index = 0,
}) {
  const [hovered, setHovered] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState(null);

  // ---- Kebab menu state ----
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  // ---- Vote state (persisted via localStorage) ----
  // null = no vote, true = upvoted, false = downvoted
  const [vote, setVote] = useState(() => {
    if (!id) return null;
    try {
      const stored = localStorage.getItem(`aleym:vote:${id}`);
      if (stored === "up") return true;
      if (stored === "down") return false;
      return null;
    } catch {
      return null;
    }
  });

  // Track voting in progress to prevent double-clicks
  const [voteBusy, setVoteBusy] = useState(false);

  // Listen for vote changes from other components (e.g. ArticlePage)
  useEffect(() => {
    if (!id) return;

    const handleVoteChange = (e) => {
      // Only update if this event is for THIS article
      if (e.detail?.articleId !== id) return;

      const newVote = e.detail.vote;
      // Convert string format ("up"/"down"/null) to boolean format
      if (newVote === "up") setVote(true);
      else if (newVote === "down") setVote(false);
      else setVote(null);
    };

    window.addEventListener("aleym:vote-changed", handleVoteChange);
    return () => {
      window.removeEventListener("aleym:vote-changed", handleVoteChange);
    };
  }, [id]);

  // ---- Read state (mirrors API for optimistic toggling) ----
  const [readState, setReadState] = useState(isRead);
  const [readBusy, setReadBusy] = useState(false);

  const date = new Date(publishedAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // ---- Action handlers ----

  /**
   * Enhanced vote handler with toggle/undo logic
   * - First click: sets the vote (up or down)
   * - Second click on same button: clears the vote (undo)
   * - Click opposite button: switches the vote
   */
  const sendVote = (isUpVote) => {
    if (!id || voteBusy) return;

    // Capture previous vote BEFORE updating, for error recovery
    const previousVote = vote;

    // Determine new vote state: if clicking same button, toggle off (undo)
    const isUndo = previousVote === isUpVote;
    const newVote = isUndo ? null : isUpVote;

    setVoteBusy(true);
    setVote(newVote); // Optimistic UI update

    // Persist to localStorage immediately
    try {
      if (newVote === null) {
        localStorage.removeItem(`aleym:vote:${id}`);
      } else {
        localStorage.setItem(`aleym:vote:${id}`, newVote ? "up" : "down");
      }
    } catch {}

    // Notify other components (article page) about the vote change
    // Convert boolean → string format for consistency
    const voteString = newVote === null ? null : newVote ? "up" : "down";
    window.dispatchEvent(
      new CustomEvent("aleym:vote-changed", {
        detail: { articleId: id, vote: voteString },
      }),
    );

    // Choose API call based on whether this is an undo or a vote
    // If your API has a dedicated "remove vote" endpoint, use it here.
    // Otherwise, we skip the API call for undo to avoid sending invalid data.
    let apiPromise;

    if (isUndo) {
      // Try to call a dedicated removeVote endpoint if it exists,
      // otherwise just resolve locally (UI undo only)
      if (api.feedback && typeof api.feedback.removeVote === "function") {
        apiPromise = api.feedback.removeVote({
          news: id,
          done_at: Math.floor(Date.now() / 1000),
        });
      } else {
        // No backend support for undo — UI-only undo
        apiPromise = Promise.resolve();
      }
    } else {
      apiPromise = api.feedback.explicitVote({
        news: id,
        done_at: Math.floor(Date.now() / 1000),
        is_up_vote: newVote,
      });
    }

    apiPromise
      .catch((err) => {
        console.warn("[NewsCardGrid] vote failed:", err);
        // Revert UI to the captured previous vote
        setVote(previousVote);
        // Also revert localStorage
        try {
          if (previousVote === null) {
            localStorage.removeItem(`aleym:vote:${id}`);
          } else {
            localStorage.setItem(
              `aleym:vote:${id}`,
              previousVote ? "up" : "down",
            );
          }
        } catch {}

        // Notify others about the revert
        const revertVoteString =
          previousVote === null ? null : previousVote ? "up" : "down";
        window.dispatchEvent(
          new CustomEvent("aleym:vote-changed", {
            detail: { articleId: id, vote: revertVoteString },
          }),
        );
      })
      .finally(() => setVoteBusy(false));
  };

  const writeReadState = (next) => {
    if (!id || readBusy) return;
    setReadBusy(true);
    setReadState(next);
    api.articles
      .setRead(id, next)
      .then(() => {
        if (typeof onReadChange === "function") onReadChange(next);
      })
      .catch((err) => {
        console.warn("[NewsCardGrid] setRead failed:", err);
        setReadState(!next);
      })
      .finally(() => setReadBusy(false));
  };

  const toggleRead = () => writeReadState(!readState);

  const handleCardClick = (e) => {
    if (e.target.closest("button")) return;
    if (e.target.closest("a")) return;
    if (readState) return;
    writeReadState(true);
  };

  // Shared style helpers
  const iconBtnStyle = (isHover, isActive, activeGradient) => ({
    width: "32px",
    height: "32px",
    borderRadius: "10px",
    background: isActive
      ? activeGradient
      : isHover
        ? "rgba(255,255,255,0.08)"
        : "rgba(255,255,255,0.04)",
    border: "1px solid",
    borderColor: isActive
      ? "transparent"
      : isHover
        ? "rgba(255,255,255,0.12)"
        : "rgba(255,255,255,0.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    padding: 0,
  });

  const tooltipStyle = {
    position: "absolute",
    bottom: "calc(100% + 8px)",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#1e1e26",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    padding: "6px 12px",
    fontSize: "12px",
    color: "#e8e6e1",
    whiteSpace: "nowrap",
    zIndex: 10,
    boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
    pointerEvents: "none",
  };

  const strokeFor = (isHover, isActive) =>
    isActive ? "#0e0e12" : isHover ? "#e8e6e1" : "#6a6a7a";

  // Style for menu items inside the kebab dropdown
  const menuItemStyle = (isHover, isActive, activeColor) => ({
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    padding: "8px 12px",
    background: isHover ? "rgba(255,255,255,0.06)" : "transparent",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    color: isActive ? activeColor : isHover ? "#e8e6e1" : "#c8c6c1",
    fontSize: "13px",
    fontWeight: 500,
    textAlign: "left",
    transition: "all 0.15s ease",
    fontFamily: "inherit",
  });

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setHoveredBtn(null);
      }}
      onClick={handleCardClick}
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          background: readState
            ? "rgba(255,255,255,0.01)"
            : hovered
              ? "linear-gradient(135deg, rgba(199,146,234,0.06) 0%, rgba(130,170,255,0.06) 100%)"
              : "rgba(255,255,255,0.02)",
          border: "1px solid",
          borderColor: readState
            ? "rgba(255,255,255,0.03)"
            : hovered
              ? "rgba(199,146,234,0.2)"
              : "rgba(255,255,255,0.06)",
          borderRadius: "16px",
          padding: "24px",
          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          transform:
            hovered && !readState ? "translateY(-4px)" : "translateY(0)",
          boxShadow:
            hovered && !readState
              ? "0 12px 40px rgba(199,146,234,0.1), 0 4px 12px rgba(0,0,0,0.3)"
              : "0 1px 4px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minHeight: "240px",
          height: "100%",
          opacity: readState ? 0.55 : 1,
          filter: readState ? "grayscale(0.6)" : "none",
        }}
      >
        {/* Top section */}
        <div>
          {/* Source badge + button row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                display: "inline-block",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                color: readState ? "#6a6a7a" : "#82aaff",
                background: readState
                  ? "rgba(255,255,255,0.03)"
                  : "rgba(130,170,255,0.08)",
                border: "1px solid",
                borderColor: readState
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(130,170,255,0.12)",
                borderRadius: "6px",
                padding: "3px 10px",
                transition: "all 0.25s ease",
              }}
            >
              {source || "News"}
            </div>

            {/* Button group */}
            <div style={{ display: "flex", gap: "6px" }}>
              {/* ---- AI Summarize (kept visible) ---- */}
              <SummarizeButton
                articleId={id}
                onSummarize={onSummarize}
                iconBtnStyle={iconBtnStyle}
                tooltipStyle={tooltipStyle}
                strokeFor={strokeFor}
              />

              {/* ---- Source link (kept visible) ---- */}
              <div
                style={{ position: "relative" }}
                onMouseEnter={() => setHoveredBtn("source")}
                onMouseLeave={() => setHoveredBtn(null)}
              >
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", textDecoration: "none" }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "10px",
                      background:
                        hoveredBtn === "source"
                          ? "linear-gradient(135deg, #c792ea, #82aaff)"
                          : "rgba(255,255,255,0.04)",
                      border: "1px solid",
                      borderColor:
                        hoveredBtn === "source"
                          ? "transparent"
                          : "rgba(255,255,255,0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={hoveredBtn === "source" ? "#0e0e12" : "#6a6a7a"}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transition: "stroke 0.2s ease, transform 0.2s ease",
                        transform:
                          hoveredBtn === "source"
                            ? "translateX(2px)"
                            : "translateX(0)",
                      }}
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </div>
                </a>
                {hoveredBtn === "source" && (
                  <div style={tooltipStyle}>Redirect to source</div>
                )}
              </div>

              {/* ---- Kebab menu (groups upvote / downvote / read) ---- */}
              <div
                ref={menuRef}
                style={{ position: "relative" }}
                onMouseEnter={() => setHoveredBtn("more")}
                onMouseLeave={() => setHoveredBtn(null)}
              >
                <button
                  type="button"
                  aria-label="More actions"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen((v) => !v);
                  }}
                  style={iconBtnStyle(
                    hoveredBtn === "more" || menuOpen,
                    menuOpen,
                    "linear-gradient(135deg, #c792ea, #82aaff)",
                  )}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={strokeFor(
                      hoveredBtn === "more" || menuOpen,
                      menuOpen,
                    )}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="5" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="12" cy="19" r="1.5" />
                  </svg>
                </button>

                {/* Tooltip (hidden when menu is open) */}
                {hoveredBtn === "more" && !menuOpen && (
                  <div style={tooltipStyle}>More actions</div>
                )}

                {/* Dropdown menu */}
                {menuOpen && (
                  <div
                    role="menu"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      minWidth: "180px",
                      background: "#1e1e26",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      padding: "6px",
                      boxShadow:
                        "0 12px 40px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)",
                      zIndex: 20,
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                  >
                    {/* Upvote menu item */}
                    <button
                      type="button"
                      role="menuitem"
                      aria-pressed={vote === true}
                      disabled={voteBusy}
                      onMouseEnter={() => setHoveredBtn("menu-up")}
                      onMouseLeave={() => setHoveredBtn(null)}
                      onClick={() => sendVote(true)}
                      style={menuItemStyle(
                        hoveredBtn === "menu-up",
                        vote === true,
                        "#82d982",
                      )}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill={vote === true ? "#82d982" : "none"}
                        stroke={vote === true ? "#82d982" : "currentColor"}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M7 10v12" />
                        <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7V10l4.34-7.66A1.5 1.5 0 0 1 14 3.5l1 2.38Z" />
                      </svg>
                      <span>{vote === true ? "Remove upvote" : "Upvote"}</span>
                    </button>

                    {/* Downvote menu item */}
                    <button
                      type="button"
                      role="menuitem"
                      aria-pressed={vote === false}
                      disabled={voteBusy}
                      onMouseEnter={() => setHoveredBtn("menu-down")}
                      onMouseLeave={() => setHoveredBtn(null)}
                      onClick={() => sendVote(false)}
                      style={menuItemStyle(
                        hoveredBtn === "menu-down",
                        vote === false,
                        "#ff8a8a",
                      )}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill={vote === false ? "#ff8a8a" : "none"}
                        stroke={vote === false ? "#ff8a8a" : "currentColor"}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17 14V2" />
                        <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H17v12l-4.34 7.66A1.5 1.5 0 0 1 10 20.5l-1-2.38Z" />
                      </svg>
                      <span>
                        {vote === false ? "Remove downvote" : "Downvote"}
                      </span>
                    </button>

                    {/* Divider */}
                    <div
                      style={{
                        height: "1px",
                        background: "rgba(255,255,255,0.06)",
                        margin: "4px 6px",
                      }}
                    />

                    {/* Read / Unread menu item */}
                    <button
                      type="button"
                      role="menuitem"
                      aria-pressed={readState}
                      disabled={readBusy}
                      onMouseEnter={() => setHoveredBtn("menu-read")}
                      onMouseLeave={() => setHoveredBtn(null)}
                      onClick={toggleRead}
                      style={menuItemStyle(
                        hoveredBtn === "menu-read",
                        readState,
                        "#c792ea",
                      )}
                    >
                      {readState ? (
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#c792ea"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 8v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8" />
                          <path d="m3 8 9-6 9 6" />
                          <path d="m3 8 9 6 9-6" />
                        </svg>
                      ) : (
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="3" y="5" width="18" height="14" rx="2" />
                          <path d="m3 7 9 6 9-6" />
                        </svg>
                      )}
                      <span>
                        {readState ? "Mark as unread" : "Mark as read"}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Title */}
          <h3
            style={{
              fontSize: "15px",
              fontWeight: 600,
              lineHeight: 1.45,
              color: readState ? "#7a7a8a" : hovered ? "#e8e6e1" : "#c8c6c1",
              margin: 0,
              transition: "color 0.2s ease",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {title}
          </h3>

          {/* Description */}
          {(() => {
            const cleanDescription = stripHtml(description);
            return cleanDescription ? (
              <p
                style={{
                  fontSize: "12px",
                  lineHeight: 1.5,
                  color: "#6a6a7a",
                  margin: "10px 0 0 0",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {cleanDescription}
              </p>
            ) : null;
          })()}
        </div>

        {/* Bottom: Date row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "16px",
            paddingTop: "14px",
            borderTop: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <svg
            width="13"
            height="13"
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
          <span style={{ fontSize: "11px", color: "#5a5a6a", fontWeight: 500 }}>
            {formattedDate}
          </span>
          <span style={{ fontSize: "11px", color: "#3a3a4a" }}>•</span>
          <span style={{ fontSize: "11px", color: "#5a5a6a" }}>
            {formattedTime}
          </span>

          {readState && (
            <span
              style={{
                marginLeft: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "1px",
                textTransform: "uppercase",
                color: "#82d982",
                background: "rgba(130,217,130,0.1)",
                border: "1px solid rgba(130,217,130,0.25)",
                borderRadius: "4px",
                padding: "3px 8px",
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#82d982"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Read
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
