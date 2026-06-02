import { useState, useEffect, useCallback } from "react";
import {
  getCookie,
  setCookie,
  deleteCookie,
  TUTORIAL_COOKIE,
} from "../services/cookies";

// Tutorial images — drop these into src/assets/tutorial/
import telegramImg from "../assets/tutorial/telegram-channel.png";
import rssFooterImg from "../assets/tutorial/rss-footer-icon.png";
import googleSearchImg from "../assets/tutorial/google-rss-search.png";

// ---------------------------------------------------------------------------
// Theme (mirrors AlyemTheme so the component is fully drop-in / zero-dependency).
// If you'd rather use your shared theme, replace this block with:
//   import { AlyemTheme as T } from "../theme/AlyemTheme";
// ---------------------------------------------------------------------------
const T = {
  colors: {
    bgMain: "#1e1e26",
    bgInput: "#0e0e12",
    borderSubtle: "rgba(255, 255, 255, 0.06)",
    borderLight: "rgba(255, 255, 255, 0.1)",
    textPrimary: "#e8e6e1",
    textSecondary: "#c8c6c1",
    textMuted: "#7a7a8a",
    textHeader: "#6a6a7a",
    accent: "#c792ea",
    accentLight: "#d8b6f0",
    accentBgSubtle: "rgba(199, 146, 234, 0.10)",
    accentBorderSubtle: "rgba(199, 146, 234, 0.22)",
    accentGradient: "linear-gradient(135deg, #c792ea, #82aaff)",
  },
  effects: {
    shadow: "0 16px 48px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.35)",
  },
  radius: { card: "12px", button: "8px", pill: "999px" },
  font: "'DM Sans', sans-serif",
};

// ---------------------------------------------------------------------------
// Slide content
// ---------------------------------------------------------------------------
const SLIDES = [
  {
    eyebrow: "Getting started",
    title: "Welcome to Alyem",
    body: (
      <>
        Alyem gathers articles from the sources you choose into a single feed.
        This short tour explains the core concepts <b>sources</b>,{" "}
        <b>labels</b>, <b>categories</b> and <b>fetchers</b> and shows you how
        to find feeds to add. Use the buttons below to move at your own pace.
      </>
    ),
  },
  {
    eyebrow: "Concept",
    title: "Source",
    body: (
      <>
        A <b>source</b> is an information provider that publishes articles.
        Alyem accepts sources in the form of <b>RSS feeds</b>, <b>Atom feeds</b>{" "}
        and <b>Telegram channels</b>. These sources can live on the clearnet or
        on the Tor network.
      </>
    ),
  },
  {
    eyebrow: "Concept",
    title: "Label",
    body: (
      <>
        A <b>label</b> is a tag used to organize articles by a specific topic or
        keyword. The same label can be applied to multiple articles. Labels are
        also used to filter articles so they are easier to find.
      </>
    ),
  },
  {
    eyebrow: "Concept",
    title: "Category",
    body: (
      <>
        A <b>category</b> is a grouped collection of sources. It is used to
        organize and filter the different sources you follow.
      </>
    ),
  },
  {
    eyebrow: "Concept",
    title: "Fetchers",
    body: "Fetchers are the workers that pull new articles into Alyem. There are three:",
    list: [
      {
        name: "Telegram Fetcher",
        desc: "monitors and scrapes data from Telegram chats, groups or channels.",
      },
      {
        name: "RSS Fetcher",
        desc: "is a web crawler designed to find and pull standard XML text files from websites.",
      },
      {
        name: "Atom Fetcher",
        desc: "is a web crawler used to find and pull files in the Atom Syndication Format.",
      },
    ],
  },
  {
    eyebrow: "Adding a source",
    title: "Find a Telegram channel",
    body: (
      <>
        To add a Telegram source, you need the channel's <b>username</b> the{" "}
        <b>handle</b> shown directly under the channel name with out the @ symbol. Open the channel,
        copy its handle (e.g. <code>thehackernews</code>) and paste it into
        Alyem when using the Telegram fetcher.
      </>
    ),
    image: { src: telegramImg, caption: "The handle sits right under the channel name." },
  },
  {
    eyebrow: "Finding a feed",
    title: "Look for the RSS icon",
    body: (
      <>
        Many websites link their feed in the page <b>footer</b>, alongside their
        social links. Look for the <b>RSS icon</b> a dot with two radiating
        arcs then copy its link into Alyem as an RSS or Atom source.
      </>
    ),
    image: {
      src: rssFooterImg,
      caption: "The RSS icon usually sits among the footer's social icons.",
    },
  },
  {
    eyebrow: "Finding a feed",
    title: "Search with Google operators",
    body: (
      <>
        If a site doesn't surface its feed, search for it. Google's advanced
        operators narrow results down to feed files, this is an example of an advanced search query that hunts for RSS feeds:{" "}
      </>
    ),
    code: "inurl:rss filetype:xml",
    after: (
      <>
        Add a site name to target a specific publisher (e.g.{" "}
        <code>inurl:rss filetype:xml bmj</code>). Swap <code>rss</code> for{" "}
        <code>atom</code> to hunt for Atom feeds instead.
      </>
    ),
    image: {
      src: googleSearchImg,
      caption: "Searching inurl:rss filetype:xml surfaces feed URLs directly.",
    },
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
/**
 * Onboarding tutorial popup.
 *
 * Auto-opens on first launch (unless the "don't show again" cookie is set).
 *
 * Props:
 *  - forceOpen (bool):  open the tour on demand, e.g. a "View tutorial" button
 *                       in Settings. Ignores the cookie while true.
 *  - onClose (fn):      called whenever the popup closes.
 */
export default function TutorialPopup({ forceOpen = false, onClose }) {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const [dontShow, setDontShow] = useState(false);

  const last = SLIDES.length - 1;
  const slide = SLIDES[index];

  // Decide whether to open on mount / when forceOpen changes.
  useEffect(() => {
    if (forceOpen) {
      setIndex(0);
      // reflect existing cookie state in the checkbox
      setDontShow(getCookie(TUTORIAL_COOKIE) === "1");
      setVisible(true);
    } else if (getCookie(TUTORIAL_COOKIE) !== "1") {
      setVisible(true);
    }
  }, [forceOpen]);

  const close = useCallback(() => {
    setVisible(false);
    onClose?.();
  }, [onClose]);

  // Persist the checkbox immediately so the choice survives any close path.
  const toggleDontShow = (checked) => {
    setDontShow(checked);
    if (checked) setCookie(TUTORIAL_COOKIE, "1");
    else deleteCookie(TUTORIAL_COOKIE);
  };

  const next = () => (index === last ? close() : setIndex((i) => i + 1));
  const back = () => setIndex((i) => Math.max(0, i - 1));

  // Keyboard navigation.
  useEffect(() => {
    if (!visible) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, index]);

  if (!visible) return null;

  const c = T.colors;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Alyem tutorial"
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "rgba(8,8,12,0.66)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        animation: "tutFade 0.18s ease",
        fontFamily: T.font,
      }}
    >
      <style>{`
        @keyframes tutFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes tutPop {
          from { opacity: 0; transform: translateY(14px) scale(0.985) }
          to   { opacity: 1; transform: translateY(0) scale(1) }
        }
        @keyframes tutSlide {
          from { opacity: 0; transform: translateX(14px) }
          to   { opacity: 1; transform: translateX(0) }
        }
        .tut-btn { font-family: inherit; cursor: pointer; border-radius: ${T.radius.button};
          font-size: 14px; font-weight: 600; padding: 10px 20px; transition:
          background .15s ease, border-color .15s ease, color .15s ease, opacity .15s ease, transform .1s ease; }
        .tut-btn:active { transform: translateY(1px); }
        .tut-primary { color: #16121c; border: none; background: ${c.accentGradient};
          box-shadow: 0 4px 14px rgba(199,146,234,0.28); }
        .tut-primary:hover { filter: brightness(1.07); }
        .tut-ghost { background: transparent; color: ${c.textSecondary};
          border: 1px solid ${c.borderLight}; }
        .tut-ghost:hover { background: rgba(255,255,255,0.06); color: ${c.textPrimary}; }
        .tut-ghost:disabled { opacity: 0; pointer-events: none; }
        .tut-x { flex: 0 0 auto; width: 30px; height: 30px;
          display: grid; place-items: center; border-radius: 8px; cursor: pointer;
          color: ${c.textMuted}; background: rgba(255,255,255,0.04);
          border: 1px solid ${c.borderSubtle}; padding: 0;
          transition: background .15s ease, color .15s ease, border-color .15s ease, transform .1s ease; }
        .tut-x:hover { background: ${c.accentBgSubtle}; color: ${c.accentLight};
          border-color: ${c.accentBorderSubtle}; }
        .tut-x:active { transform: scale(0.92); }
        .tut-check { display: inline-flex; align-items: center; gap: 9px; cursor: pointer;
          color: ${c.textMuted}; font-size: 13px; user-select: none; }
        .tut-check:hover { color: ${c.textSecondary}; }
        .tut-check input { position: absolute; opacity: 0; width: 0; height: 0; }
        .tut-box { width: 17px; height: 17px; border-radius: 5px; border: 1.5px solid ${c.borderLight};
          display: grid; place-items: center; transition: all .15s ease; flex: 0 0 auto; }
        .tut-check input:checked + .tut-box { background: ${c.accent}; border-color: ${c.accent}; }
        .tut-check input:focus-visible + .tut-box { box-shadow: 0 0 0 3px ${c.accentBgSubtle}; }
        .tut-body code { font-family: 'IBM Plex Mono', monospace; font-size: 0.86em;
          background: ${c.bgInput}; border: 1px solid ${c.borderSubtle}; padding: 1px 6px;
          border-radius: 5px; color: ${c.accentLight}; }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "min(580px, 100%)",
          maxHeight: "calc(100vh - 40px)",
          display: "flex",
          flexDirection: "column",
          background: c.bgMain,
          border: `1px solid ${c.borderLight}`,
          borderRadius: T.radius.card,
          boxShadow: T.effects.shadow,
          animation: "tutPop 0.28s cubic-bezier(0.16,1,0.3,1)",
          overflow: "hidden",
        }}
      >
        {/* Top bar: close button, right-aligned */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "10px 12px",
            borderBottom: `1px solid ${c.borderSubtle}`,
          }}
        >
          <button className="tut-x" aria-label="Close tutorial" onClick={close}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M2 2L12 12M12 2L2 12"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Progress bars */}
        <div style={{ display: "flex", gap: 6, padding: "16px 24px 0" }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to step ${i + 1}`}
              onClick={() => setIndex(i)}
              style={{
                height: 4,
                flex: 1,
                border: "none",
                cursor: "pointer",
                padding: 0,
                borderRadius: 999,
                background: i <= index ? c.accent : c.borderLight,
                opacity: i <= index ? 1 : 0.6,
                transition: "background .25s ease, opacity .25s ease",
              }}
            />
          ))}
        </div>

        {/* Scrollable content */}
        <div
          style={{
            padding: "22px 28px 8px",
            overflowY: "auto",
            flex: 1,
          }}
        >
          <div key={index} style={{ animation: "tutSlide 0.26s ease" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: c.accent,
                marginBottom: 8,
              }}
            >
              {slide.eyebrow}
            </div>

            <h2
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: c.textPrimary,
                margin: "0 0 12px",
                lineHeight: 1.2,
              }}
            >
              {slide.title}
            </h2>

            <div
              className="tut-body"
              style={{
                fontSize: 15,
                lineHeight: 1.62,
                color: c.textSecondary,
              }}
            >
              {slide.body}
            </div>

            {/* Fetcher list */}
            {slide.list && (
              <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                {slide.list.map((item) => (
                  <div
                    key={item.name}
                    style={{
                      background: c.bgInput,
                      border: `1px solid ${c.borderSubtle}`,
                      borderRadius: 10,
                      padding: "12px 14px",
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: c.textSecondary,
                    }}
                  >
                    <span style={{ color: c.accentLight, fontWeight: 600 }}>
                      {item.name}
                    </span>{" "}
                   {item.desc}
                  </div>
                ))}
              </div>
            )}

            {/* Code block (search operators) */}
            {slide.code && (
              <div
                style={{
                  marginTop: 14,
                  background: c.bgInput,
                  border: `1px solid ${c.accentBorderSubtle}`,
                  borderRadius: 8,
                  padding: "12px 14px",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 14,
                  color: c.accentLight,
                  letterSpacing: "0.02em",
                }}
              >
                {slide.code}
              </div>
            )}

            {slide.after && (
              <div
                className="tut-body"
                style={{
                  marginTop: 12,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: c.textMuted,
                }}
              >
                {slide.after}
              </div>
            )}

            {/* Illustration */}
            {slide.image && (
              <figure style={{ margin: "18px 0 4px" }}>
                <img
                  src={slide.image.src}
                  alt={slide.image.caption}
                  style={{
                    width: "100%",
                    display: "block",
                    borderRadius: 10,
                    border: `1px solid ${c.borderSubtle}`,
                    background: c.bgInput,
                  }}
                />
                <figcaption
                  style={{
                    marginTop: 8,
                    fontSize: 12.5,
                    color: c.textMuted,
                    textAlign: "center",
                  }}
                >
                  {slide.image.caption}
                </figcaption>
              </figure>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "16px 24px 20px",
            borderTop: `1px solid ${c.borderSubtle}`,
          }}
        >
          <label className="tut-check">
            <input
              type="checkbox"
              checked={dontShow}
              onChange={(e) => toggleDontShow(e.target.checked)}
            />
            <span className="tut-box">
              {dontShow && (
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2.5 6.2L5 8.5L9.5 3.5"
                    stroke="#16121c"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            Don't show this again
          </label>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="tut-btn tut-ghost"
              onClick={back}
              disabled={index === 0}
            >
              Back
            </button>
            <button className="tut-btn tut-primary" onClick={next}>
              {index === last ? "Get started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
