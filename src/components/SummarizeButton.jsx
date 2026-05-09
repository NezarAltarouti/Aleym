import { useState } from "react";
import { useOllama } from "../contexts/OllamaContext";

export default function SummarizeButton({
  articleId,
  onSummarize,
  iconBtnStyle,
  tooltipStyle,
  strokeFor,
}) {
  const [hovered, setHovered] = useState(false);
  const { status } = useOllama();

  const handleClick = (e) => {
    e.stopPropagation();
    if (typeof onSummarize === "function" && articleId) {
      onSummarize(articleId);
    }
  };

  const tooltip =
    status === "available"
      ? "AI Summary"
      : status === "checking"
        ? "AI Summary (checking…)"
        : status === "no-model"
          ? "AI Summary — no models installed"
          : "AI Summary — Ollama not installed";

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-label={tooltip}
        onClick={handleClick}
        style={iconBtnStyle(
          hovered,
          false,
          "linear-gradient(135deg, #ffcb6b, #f78c6c)",
        )}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke={strokeFor(hovered, false)}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2v4" />
          <path d="M12 18v4" />
          <path d="m4.93 4.93 2.83 2.83" />
          <path d="m16.24 16.24 2.83 2.83" />
          <path d="M2 12h4" />
          <path d="M18 12h4" />
          <path d="m4.93 19.07 2.83-2.83" />
          <path d="m16.24 7.76 2.83-2.83" />
        </svg>

        {status !== "available" && status !== "checking" && (
          <span
            style={{
              position: "absolute",
              top: "2px",
              right: "2px",
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#ff8a8a",
              boxShadow: "0 0 0 2px #15151b",
            }}
          />
        )}
      </button>
      {hovered && <div style={tooltipStyle}>{tooltip}</div>}
    </div>
  );
}
