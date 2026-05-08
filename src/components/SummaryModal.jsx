import { useState, useEffect, useRef } from "react";
import api from "../services/aleymApi";
import ollama from "../services/OllamaService2";
import { useOllama } from "../contexts/OllamaContext";

export default function SummaryModal({ articleId, onClose }) {
  const [article, setArticle] = useState(null);
  const [sourceName, setSourceName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [language, setLanguage] = useState(null); // null = picker shown, "en" | "ar" = chosen
  const [summary, setSummary] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [summaryDone, setSummaryDone] = useState(false);

  // Cache availability shown on the language picker
  const [enCached, setEnCached] = useState(false);
  const [arCached, setArCached] = useState(false);

  const abortRef = useRef(null);

  // Ollama status and recheck function
  const { status: ollamaStatus, recheck } = useOllama();

  // Effect 1: Load article when modal opens. Don't summarize yet — wait for language pick.
  useEffect(() => {
    if (!articleId) return;
    let cancelled = false;

    setLoading(true);
    setError(null);
    setArticle(null);
    setSourceName("");
    setLanguage(null);
    setSummary("");
    setSummaryDone(false);
    setSummaryError(null);
    setSummarizing(false);

    // Check what's already cached for the picker badges
    setEnCached(ollama.hasCachedSummary(articleId, "en"));
    setArCached(ollama.hasCachedSummary(articleId, "ar"));

    async function loadArticle() {
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
        setSourceName(src?.name ?? "Unknown");
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err.message || "Failed to load article");
        setLoading(false);
      }
    }

    loadArticle();
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  // Effect 2: When language is picked AND article is loaded, fetch / stream summary.
  useEffect(() => {
    if (!articleId || !language || !article) return;

    // Don't even try to summarize if Ollama isn't available
    if (ollamaStatus !== "available") return;

    let cancelled = false;
    const controller = new AbortController();
    abortRef.current = controller;

    setSummary("");
    setSummaryDone(false);
    setSummaryError(null);

    async function runSummary() {
      // 1) Cache hit?
      const cached = ollama.getCachedSummary(articleId, language);
      if (cached) {
        if (cancelled) return;
        setSummary(cached.summary);
        setSummaryDone(true);
        return;
      }

      // 2) Cache miss — stream from Ollama
      setSummarizing(true);
      let streamed = "";
      try {
        await ollama.summarizeStream(
          {
            title: article.title,
            content: article.content || "",
            description: article.summary || "",
            source: sourceName,
          },
          (chunk) => {
            if (cancelled) return;
            streamed += chunk;
            setSummary((prev) => prev + chunk);
          },
          controller.signal,
          language,
        );
        if (cancelled) return;

        if (streamed.trim()) {
          ollama.setCachedSummary(articleId, streamed.trim(), language);
          // Refresh the badge state in case the user goes back to the picker
          if (language === "en") setEnCached(true);
          else setArCached(true);
        }
        setSummaryDone(true);
      } catch (err) {
        if (cancelled || err.name === "AbortError") return;
        setSummaryError(err.message || "Failed to generate summary");
      } finally {
        if (!cancelled) setSummarizing(false);
      }
    }

    runSummary();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [articleId, language, article, sourceName, ollamaStatus]);

  // Escape closes the modal (unchanged)
  useEffect(() => {
    if (!articleId) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [articleId, onClose]);

  if (!articleId) return null;

  const isArabic = language === "ar";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        animation: "modalFadeIn 0.2s ease",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#15151b",
          border: "1px solid rgba(255,203,107,0.15)",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "560px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow:
            "0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(255,203,107,0.05)",
          animation: "modalSlideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 12px",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "1px",
              textTransform: "uppercase",
              borderRadius: "6px",
              background: "rgba(255,203,107,0.1)",
              border: "1px solid rgba(255,203,107,0.2)",
              color: "#ffcb6b",
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
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
            AI Summary
          </div>

          <button
            onClick={onClose}
            aria-label="Close summary"
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
              fontSize: "16px",
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
            &#10005;
          </button>
        </div>

        {/* Body — scrollable */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
          {/* Loading article */}
          {loading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                padding: "40px 0",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  border: "3px solid rgba(255,255,255,0.06)",
                  borderTop: "3px solid #ffcb6b",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <p style={{ color: "#5a5a6a", fontSize: "13px", margin: 0 }}>
                Loading article…
              </p>
            </div>
          )}

          {/* Article load error */}
          {error && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <p
                style={{
                  color: "#ff8a8a",
                  fontSize: "14px",
                  margin: "0 0 4px 0",
                  fontWeight: 500,
                }}
              >
                Unable to load article
              </p>
              <p style={{ color: "#5a5a6a", fontSize: "12px", margin: 0 }}>
                {error}
              </p>
            </div>
          )}

          {/* PHASE 0.5 — Ollama Checking State */}
          {!loading &&
            !error &&
            article &&
            ollamaStatus === "checking" &&
            language === null && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "12px",
                  padding: "30px 0",
                }}
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    border: "2px solid rgba(255,255,255,0.06)",
                    borderTop: "2px solid #ffcb6b",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <p style={{ color: "#5a5a6a", fontSize: "12px", margin: 0 }}>
                  Checking Ollama…
                </p>
              </div>
            )}

          {/* PHASE 0 — Ollama not available: install prompt */}
          {!loading &&
            !error &&
            article &&
            ollamaStatus !== "available" &&
            ollamaStatus !== "checking" &&
            language === null && (
              <OllamaInstallPrompt
                status={ollamaStatus}
                onRecheck={recheck}
                model={ollama.model}
              />
            )}

          {/* PHASE 1 — Language picker (only if Ollama is ready) */}
          {!loading &&
            !error &&
            article &&
            ollamaStatus === "available" &&
            language === null && (
              <div style={{ padding: "8px 0" }}>
                <h2
                  style={{
                    fontSize: "16px",
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 700,
                    color: "#e8e6e1",
                    margin: "0 0 6px 0",
                    textAlign: "center",
                  }}
                >
                  Choose summary language
                </h2>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#6a6a7a",
                    textAlign: "center",
                    margin: "0 0 24px 0",
                  }}
                >
                  اختر لغة الملخص
                </p>

                <div style={{ display: "flex", gap: "12px" }}>
                  <LanguageButton
                    label="English"
                    sublabel="Generate in English"
                    cached={enCached}
                    onClick={() => setLanguage("en")}
                  />
                  <LanguageButton
                    label="العربية"
                    sublabel="إنشاء باللغة العربية"
                    cached={arCached}
                    onClick={() => setLanguage("ar")}
                    rtl
                  />
                </div>
              </div>
            )}

          {/* PHASE 2 / 3 — Summary view */}
          {!loading && !error && article && language !== null && (
            <>
              {/* Source */}
              {sourceName && (
                <div
                  style={{
                    display: "inline-block",
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                    color: "#c792ea",
                    background: "rgba(199,146,234,0.08)",
                    border: "1px solid rgba(199,146,234,0.12)",
                    borderRadius: "6px",
                    padding: "3px 10px",
                    marginBottom: "14px",
                  }}
                >
                  {sourceName}
                </div>
              )}

              {/* Title — keep in original language */}
              <h2
                style={{
                  fontSize: "18px",
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700,
                  lineHeight: 1.3,
                  color: "#e8e6e1",
                  margin: "0 0 20px 0",
                }}
              >
                {article.title}
              </h2>

              <div
                style={{
                  height: "1px",
                  background:
                    "linear-gradient(90deg, rgba(255,203,107,0.4), transparent)",
                  marginBottom: "20px",
                }}
              />

              {/* Summary */}
              {summary && (
                <p
                  dir={isArabic ? "rtl" : "ltr"}
                  style={{
                    fontSize: "15px",
                    lineHeight: 1.85,
                    color: "#c8c6c1",
                    fontFamily: isArabic
                      ? "'Noto Naskh Arabic', 'Amiri', serif"
                      : "'Source Serif 4', serif",
                    margin: 0,
                    letterSpacing: isArabic ? "0" : "0.2px",
                    textAlign: isArabic ? "right" : "left",
                  }}
                >
                  {summary}
                  {summarizing && (
                    <span
                      style={{
                        display: "inline-block",
                        width: "7px",
                        height: "16px",
                        background: "#ffcb6b",
                        marginLeft: "2px",
                        verticalAlign: "text-bottom",
                        animation: "blink 1s steps(2) infinite",
                      }}
                    />
                  )}
                </p>
              )}

              {/* Initial summarizing state */}
              {!summary && summarizing && !summaryError && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    color: "#5a5a6a",
                    fontSize: "13px",
                    fontStyle: "italic",
                  }}
                >
                  <div
                    style={{
                      width: "14px",
                      height: "14px",
                      border: "2px solid rgba(255,203,107,0.2)",
                      borderTop: "2px solid #ffcb6b",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  {isArabic ? `جاري إنشاء الملخص` : `Generating summary`}
                </div>
              )}

              {/* Summary error */}
              {summaryError && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "10px",
                    background: "rgba(255,100,100,0.06)",
                    border: "1px solid rgba(255,100,100,0.15)",
                  }}
                >
                  <p
                    style={{
                      color: "#ff8a8a",
                      fontSize: "13px",
                      margin: "0 0 4px 0",
                      fontWeight: 500,
                    }}
                  >
                    Could not generate summary
                  </p>
                  <p style={{ color: "#8a5a5a", fontSize: "12px", margin: 0 }}>
                    {summaryError}
                  </p>
                </div>
              )}

              {/* Done footer + back-to-language link */}
              {summaryDone && (
                <div
                  style={{
                    marginTop: "20px",
                    paddingTop: "14px",
                    borderTop: "1px solid rgba(255,255,255,0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <button
                    onClick={() => setLanguage(null)}
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#8a8a9a",
                      fontSize: "11px",
                      padding: "5px 10px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    ← Change language
                  </button>
                  <p
                    style={{
                      fontSize: "10px",
                      color: "#3a3a4a",
                      margin: 0,
                      letterSpacing: "0.5px",
                    }}
                  >
                    Generated locally by {ollama.model} via Ollama
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        @keyframes blink { 0%{opacity:1} 50%{opacity:0} }
        @keyframes modalFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

/** Small helper component for the two language buttons. */
function LanguageButton({ label, sublabel, cached, onClick, rtl = false }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      dir={rtl ? "rtl" : "ltr"}
      style={{
        flex: 1,
        padding: "20px 16px",
        background: hover ? "rgba(255,203,107,0.08)" : "rgba(255,255,255,0.02)",
        border: hover
          ? "1px solid rgba(255,203,107,0.35)"
          : "1px solid rgba(255,255,255,0.08)",
        borderRadius: "12px",
        color: "#e8e6e1",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        transition: "all 0.15s ease",
        position: "relative",
        fontFamily: "inherit",
      }}
    >
      <span
        style={{
          fontSize: "16px",
          fontWeight: 600,
          fontFamily: rtl
            ? "'Noto Naskh Arabic', 'Amiri', serif"
            : "'Playfair Display', serif",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: "11px", color: "#6a6a7a" }}>{sublabel}</span>
      {cached && (
        <span
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            fontSize: "9px",
            fontWeight: 600,
            color: "#7dd87d",
            background: "rgba(125,216,125,0.1)",
            border: "1px solid rgba(125,216,125,0.2)",
            borderRadius: "4px",
            padding: "2px 6px",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
          }}
        >
          ✓ cached
        </span>
      )}
    </button>
  );
}

/** Shown when Ollama isn't reachable or the required model isn't installed. */
function OllamaInstallPrompt({ status, onRecheck, model }) {
  const [rechecking, setRechecking] = useState(false);

  const handleRecheck = async () => {
    setRechecking(true);
    await onRecheck();
    setRechecking(false);
  };

  const isMissingModel = status === "no-model";

  return (
    <div style={{ padding: "8px 4px", textAlign: "center" }}>
      {/* Icon */}
      <div
        style={{
          width: "56px",
          height: "56px",
          margin: "0 auto 16px",
          borderRadius: "14px",
          background: "rgba(255,203,107,0.08)",
          border: "1px solid rgba(255,203,107,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffcb6b",
        }}
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <h2
        style={{
          fontSize: "17px",
          fontFamily: "'Playfair Display', serif",
          fontWeight: 700,
          color: "#e8e6e1",
          margin: "0 0 8px 0",
        }}
      >
        {isMissingModel
          ? `Model "${model}" is not installed`
          : "Ollama is not installed"}
      </h2>

      <p
        style={{
          fontSize: "13px",
          color: "#8a8a9a",
          lineHeight: 1.6,
          margin: "0 0 18px 0",
        }}
      >
        {isMissingModel
          ? `Ollama is running, but the ${model} model isn't downloaded yet. Pull it with the command below.`
          : `AI summarization runs locally via Ollama. To use this feature, install Ollama and pull the ${model} model.`}
      </p>

      {/* Install steps */}
      <div
        style={{
          textAlign: "left",
          background: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "10px",
          padding: "14px 16px",
          margin: "0 0 18px 0",
        }}
      >
        {!isMissingModel && (
          <>
            <p
              style={{
                fontSize: "11px",
                color: "#8a8a9a",
                margin: "0 0 6px 0",
                fontWeight: 600,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              Step 1 — Install Ollama
            </p>
            <p
              style={{
                fontSize: "12px",
                color: "#c8c6c1",
                margin: "0 0 14px 0",
              }}
            >
              Download from{" "}
              <a
                href="https://ollama.com/download"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#ffcb6b", textDecoration: "underline" }}
              >
                ollama.com/download
              </a>
            </p>
          </>
        )}

        <p
          style={{
            fontSize: "11px",
            color: "#8a8a9a",
            margin: "0 0 6px 0",
            fontWeight: 600,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
          }}
        >
          {isMissingModel
            ? "Run this command"
            : `Step 2 — Pull the ${model} model`}
        </p>
        <code
          style={{
            display: "block",
            fontSize: "12px",
            color: "#ffcb6b",
            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
            background: "rgba(255,203,107,0.05)",
            border: "1px solid rgba(255,203,107,0.15)",
            borderRadius: "6px",
            padding: "8px 10px",
          }}
        >
          ollama pull {model}
        </code>
      </div>

      {/* Recheck button */}
      <button
        onClick={handleRecheck}
        disabled={rechecking}
        style={{
          padding: "10px 20px",
          fontSize: "13px",
          fontWeight: 600,
          color: "#15151b",
          background: rechecking
            ? "rgba(255,203,107,0.5)"
            : "linear-gradient(135deg, #ffcb6b, #f78c6c)",
          border: "none",
          borderRadius: "8px",
          cursor: rechecking ? "wait" : "pointer",
          fontFamily: "inherit",
          transition: "all 0.15s ease",
        }}
      >
        {rechecking ? "Checking…" : "I've installed it — check again"}
      </button>
    </div>
  );
}
