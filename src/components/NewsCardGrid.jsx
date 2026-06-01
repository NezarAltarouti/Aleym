import { useState, useEffect, useRef } from "react";
import api from "../services/aleymApi";
import { useArticleLabels, LabelContextMenu } from "../components/ArticleLabels";


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
  navigateTo, // optional: lets the label menu jump to Settings
  index = 0,
}) {
  const [hovered, setHovered] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState(null);

  // ---- Kebab menu state ----
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const labels = useArticleLabels(id);
  const [labelMenu, setLabelMenu] = useState(null); // { x, y } | null

  const handleContextMenu = (e) => {
    if (!id) return;
    e.preventDefault();
    setMenuOpen(false); // close the kebab menu if it was open
    setLabelMenu({ x: e.clientX, y: e.clientY });
  };

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

  const [voteBusy, setVoteBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    const handleVoteChange = (e) => {
      if (e.detail?.articleId !== id) return;
      const newVote = e.detail.vote;
      if (newVote === "up") setVote(true);
      else if (newVote === "down") setVote(false);
      else setVote(null);
    };
    window.addEventListener("aleym:vote-changed", handleVoteChange);
    return () => {
      window.removeEventListener("aleym:vote-changed", handleVoteChange);
    };
  }, [id]);

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

  const sendVote = (isUpVote) => {
    if (!id || voteBusy) return;
    const previousVote = vote;
    const isUndo = previousVote === isUpVote;
    const newVote = isUndo ? null : isUpVote;

    setVoteBusy(true);
    setVote(newVote);

    try {
      if (newVote === null) {
        localStorage.removeItem(`aleym:vote:${id}`);
      } else {
        localStorage.setItem(`aleym:vote:${id}`, newVote ? "up" : "down");
      }
    } catch {}

    const voteString = newVote === null ? null : newVote ? "up" : "down";
    window.dispatchEvent(
      new CustomEvent("aleym:vote-changed", {
        detail: { articleId: id, vote: voteString },
      }),
    );

    let apiPromise;
    if (isUndo) {
      if (api.feedback && typeof api.feedback.removeVote === "function") {
        apiPromise = api.feedback.removeVote({
          news: id,
          done_at: Math.floor(Date.now() / 1000),
        });
      } else {
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
        setVote(previousVote);
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
      onContextMenu={handleContextMenu}
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
        <div>
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
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flexShrink: 1,
              }}
            >
              {source || "News"}
            </div>

            <div
              style={{
                display: "flex",
                gap: "6px",
                flexShrink: 0,
                marginLeft: "8px",
              }}
            >
              <div
                ref={menuRef}
                style={{ position: "relative" }}
                onMouseEnter={() => setHoveredBtn("more")}
                onMouseLeave={() => setHoveredBtn(null)}
              >
                <button
                  type="button"
                  aria-label="Action"
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

                {hoveredBtn === "more" && !menuOpen && (
                  <div style={tooltipStyle}>Actions</div>
                )}

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
                    {/* ---- AI Summarize ---- */}
                    <button
                      type="button"
                      role="menuitem"
                      onMouseEnter={() => setHoveredBtn("menu-summarize")}
                      onMouseLeave={() => setHoveredBtn(null)}
                      onClick={() => {
                        setMenuOpen(false);
                        if (typeof onSummarize === "function") onSummarize(id);
                      }}
                      style={menuItemStyle(
                        hoveredBtn === "menu-summarize",
                        false,
                        "#c792ea",
                      )}
                    >
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
                        <path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15.5 10.1 10.9 5.5 9l4.6-1.4L12 3z" />
                        <path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" />
                      </svg>
                      <span>AI Summarize</span>
                    </button>

                    {/* ---- Source link ---- */}
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      role="menuitem"
                      onMouseEnter={() => setHoveredBtn("menu-source")}
                      onMouseLeave={() => setHoveredBtn(null)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        ...menuItemStyle(
                          hoveredBtn === "menu-source",
                          false,
                          "#82aaff",
                        ),
                        textDecoration: "none",
                      }}
                    >
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
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                      <span>Open source</span>
                    </a>

                    {/* ---- Assign labels (opens the right-click menu) ---- */}
                    <button
                      type="button"
                      role="menuitem"
                      onMouseEnter={() => setHoveredBtn("menu-labels")}
                      onMouseLeave={() => setHoveredBtn(null)}
                      onClick={(e) => {
                        // Anchor the label menu to this kebab item.
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuOpen(false);
                        setLabelMenu({ x: rect.left, y: rect.bottom + 4 });
                      }}
                      style={menuItemStyle(
                        hoveredBtn === "menu-labels",
                        false,
                        "#c792ea",
                      )}
                    >
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
                        <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                        <line x1="7" y1="7" x2="7.01" y2="7" />
                      </svg>
                      <span>Labels</span>
                    </button>

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

                    <div
                      style={{
                        height: "1px",
                        background: "rgba(255,255,255,0.06)",
                        margin: "4px 6px",
                      }}
                    />

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
            {stripHtml(title)}
          </h3>

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

      {/* ---- Right-click label menu (grid: Assign / Assigned chooser) ---- */}
      {labelMenu && (
        <LabelContextMenu
          labels={labels}
          variant="grid"
          x={labelMenu.x}
          y={labelMenu.y}
          onClose={() => setLabelMenu(null)}
          navigateTo={navigateTo}
        />
      )}
    </div>
  );
}