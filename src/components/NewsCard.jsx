import { useState } from "react";

/**
 * NewsCardGrid — displays a single news article in a square card layout.
 * Props:
 *   - title, publishedAt, url, source, description
 *   - content: raw content from NewsAPI (may be truncated)
 *   - author: article author
 *   - urlToImage: hero image URL
 *   - index: number (for staggered animation)
 */
export default function NewsCardGrid({
  title,
  publishedAt,
  url,
  source,
  description,
  content,
  author,
  urlToImage,
  index = 0,
}) {
  const [hovered, setHovered] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState(null);

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

  const delay = Math.min(index * 0.06, 1.2);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setHoveredBtn(null);
      }}
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        opacity: 0,
        animation: `fadeSlideUp 0.5s ease forwards ${delay}s`,
      }}
    >
      <div
        style={{
          background: hovered
            ? "linear-gradient(135deg, rgba(199,146,234,0.06) 0%, rgba(130,170,255,0.06) 100%)"
            : "rgba(255,255,255,0.02)",
          border: "1px solid",
          borderColor: hovered
            ? "rgba(199,146,234,0.2)"
            : "rgba(255,255,255,0.06)",
          borderRadius: "16px",
          padding: "24px",
          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: hovered ? "translateY(-4px)" : "translateY(0)",
          boxShadow: hovered
            ? "0 12px 40px rgba(199,146,234,0.1), 0 4px 12px rgba(0,0,0,0.3)"
            : "0 1px 4px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minHeight: "240px",
          height: "100%",
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
                color: "#82aaff",
                background: "rgba(130,170,255,0.08)",
                border: "1px solid rgba(130,170,255,0.12)",
                borderRadius: "6px",
                padding: "3px 10px",
              }}
            >
              {source || "News"}
            </div>

            {/* Button group */}
            <div style={{ display: "flex", gap: "6px" }}>
              {/* Arrow / source button */}
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
                  <div
                    style={{
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
                    }}
                  >
                    Redirect to source
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
              color: hovered ? "#e8e6e1" : "#c8c6c1",
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
          {description && (
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
              {description}
            </p>
          )}
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
          {/* Calendar icon */}
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
        </div>
      </div>
    </div>
  );
}
