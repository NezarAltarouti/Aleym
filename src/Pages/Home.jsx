import { useState, useEffect } from "react";
import Sidebar, {
  SIDEBAR_WIDTH_OPEN,
  SIDEBAR_WIDTH_CLOSED,
} from "../components/Sidebar";
import SearchBar from "../components/SearchBar";
import NewsFeed from "../components/NewsFeed";
import ViewToggle from "../components/ViewToggle";

export default function Home({ navigateTo }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem("viewMode");
    return saved || "compact";
  });

  // Disable transitions on mount so sidebar + margin don't animate on page load
  const [enableTransition, setEnableTransition] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setEnableTransition(true);
      });
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const marginLeft = sidebarOpen ? SIDEBAR_WIDTH_OPEN : SIDEBAR_WIDTH_CLOSED;

  return (
    <>
      <Sidebar
        open={sidebarOpen}
        setOpen={(val) => {
          const newVal = typeof val === "function" ? val(sidebarOpen) : val;
          localStorage.setItem("sidebarOpen", JSON.stringify(newVal));
          setSidebarOpen(newVal);
        }}
        navigateTo={(page) => {
          if (page === "home") {
            window.location.reload();
          } else {
            navigateTo(page);
          }
        }}
        disableTransition={!enableTransition}
      />

      {/* Main content area — explicit width so children always span full space */}
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
        {/* ── Search bar — always centered, never affected by content below ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
            marginTop: "20px",
          }}
        >
          <SearchBar />
        </div>

        {/* ── Page content ── */}
        <div
          style={{
            padding: "60px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* Welcome heading — no animation */}
          <h1
            style={{
              fontSize: "clamp(36px, 5vw, 56px)",
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              lineHeight: 1.1,
              margin: 0,
              background: "linear-gradient(135deg, #e8e6e1 0%, #c792ea 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Welcome Home
          </h1>

          {/* ── Section header: Cybersecurity Feed title + Toggle ── */}
          {/* Completely separate from NewsFeed — loading state cannot affect this */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "48px",
              marginBottom: "24px",
              width: "100%",
            }}
          >
            {/* Left side: icon + title */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background:
                    "linear-gradient(135deg, rgba(199,146,234,0.12), rgba(130,170,255,0.12))",
                  border: "1px solid rgba(199,146,234,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#c792ea"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <h2
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#e8e6e1",
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  Cybersecurity Feed
                </h2>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#5a5a6a",
                    margin: "2px 0 0 0",
                  }}
                >
                  Latest news — refreshes on page reload
                </p>
              </div>
            </div>

            {/* Right side: toggle pinned right */}
            <ViewToggle
              viewMode={viewMode}
              setViewMode={(mode) => {
                localStorage.setItem("viewMode", mode);
                setViewMode(mode);
              }}
            />
          </div>

          {/* ── News feed — fully independent, loading doesn't affect anything above ── */}
          <NewsFeed viewMode={viewMode} />
        </div>
      </div>
    </>
  );
}
