import { useState, useEffect, useRef, Fragment } from "react";
import Sidebar, {
  SIDEBAR_WIDTH_OPEN,
  SIDEBAR_WIDTH_CLOSED,
  SIDEBAR_STATE_KEY,
} from "../components/Sidebar";
import TutorialPopup from "../components/TutorialPopup";
// Service module for the Aleym backend. Adjust the path if your aleymapi.js
// lives somewhere other than the project src root.
import api from "../services/aleymApi";
import {version, description} from "../../package.json";

const GITHUB_URL = "https://github.com/NezarAltarouti/Aleym";

// ---------------------------------------------------------------------------
// Read the sidebar's last open/closed state so navigating to Settings doesn't
// force it open. Sidebar writes this key whenever its `open` prop changes.
// ---------------------------------------------------------------------------
function readSidebarOpen() {
  try {
    const raw = localStorage.getItem(SIDEBAR_STATE_KEY);
    if (raw === null) return true; // default to open the very first time
    return JSON.parse(raw) === true;
  } catch {
    return true;
  }
}

// ---------------------------------------------------------------------------
// Sections (tabs)
// ---------------------------------------------------------------------------
// The left rail always renders one button per entry here. Adding more objects
// to this array automatically adds more tabs, each opening its own content on
// the right.

const SECTIONS = [
  {
    key: "labels",
    label: "Labels",
    description:
      "Create your labels to organize articles by topic, priority, or anything else that helps you find things later.",
    icon: (
      <svg
        width="18"
        height="18"
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
    ),
  },
  {
    key: "configuration",
    label: "Configuration",
    description:
      "Tune the scheduler that decides how often each source is fetched and how feedback signals are weighted.",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="17" y1="16" x2="23" y2="16" />
      </svg>
    ),
  },
  {
    key: "about",
    label: "About",
    description:
      "Version information, license details, and links for Aleym .",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
];

// ---------------------------------------------------------------------------
// Settings page
// ---------------------------------------------------------------------------

export default function Settings({ navigateTo }) {
  // Initialize from the persisted value rather than hardcoding `true`.
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen);
  const [activeSection, setActiveSection] = useState(SECTIONS[0].key);
  const [hovered, setHovered] = useState(null);
  // Controls the on-demand tutorial launcher in the section rail.
  const [tutorialOpen, setTutorialOpen] = useState(false);

  const sidebarWidth = sidebarOpen ? SIDEBAR_WIDTH_OPEN : SIDEBAR_WIDTH_CLOSED;
  const active = SECTIONS.find((s) => s.key === activeSection) || SECTIONS[0];
  // Always show the left tab rail (even with a single section). Built to scale
  // as more tabs get added to SECTIONS later.
  const showSectionNav = SECTIONS.length >= 1;


  return (
    <>
      <Sidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        navigateTo={navigateTo}
      />

      <div
        style={{
          marginLeft: `${sidebarWidth}px`,
          minHeight: "100vh",
          background: "#0e0e12",
          color: "#e8e6e1",
          fontFamily: "'DM Sans', sans-serif",
          transition: "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div
          style={{
            maxWidth: showSectionNav ? "1100px" : "860px",
            margin: "0 auto",
            padding: "48px 40px 80px",
          }}
        >
          {/* ---- Page header ---- */}
          <header style={{ marginBottom: "40px" }}>
            <p
              style={{
                fontSize: "11px",
                letterSpacing: "2px",
                textTransform: "uppercase",
                color: "#5a5a6a",
                marginBottom: "10px",
              }}
            >
              Preferences
            </p>
            <h1
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(32px, 4vw, 48px)",
                lineHeight: 1.1,
                letterSpacing: "-0.5px",
                color: "#e8e6e1",
                marginBottom: "10px",
              }}
            >
              Settings
            </h1>
            <p
              style={{
                fontSize: "15px",
                color: "#7a7a8a",
                maxWidth: "560px",
                lineHeight: 1.6,
              }}
            >
              Manage your preferences and customize how Aleym works for you.
            </p>
          </header>

          {/* ---- Body ---- */}
          <div
            style={{ display: "flex", gap: "40px", alignItems: "flex-start" }}
          >
            {showSectionNav && (
              <aside
                style={{
                  width: "240px",
                  flexShrink: 0,
                  position: "sticky",
                  top: "32px",
                }}
              >
                {SECTIONS.map((section) => {
                  const isActive = section.key === activeSection;
                  const isHover = hovered === `section-${section.key}`;
                  const sectionButton = (
                    <button
                      key={section.key}
                      onClick={() => setActiveSection(section.key)}
                      onMouseEnter={() => setHovered(`section-${section.key}`)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px 14px",
                        marginBottom: "4px",
                        background: isActive
                          ? "rgba(199,146,234,0.10)"
                          : isHover
                            ? "rgba(255,255,255,0.03)"
                            : "transparent",
                        border: "1px solid",
                        borderColor: isActive
                          ? "rgba(199,146,234,0.22)"
                          : isHover
                            ? "rgba(255,255,255,0.06)"
                            : "transparent",
                        borderRadius: "10px",
                        color: isActive
                          ? "#c792ea"
                          : isHover
                            ? "#e8e6e1"
                            : "#9a9aab",
                        fontSize: "14px",
                        fontWeight: isActive ? 600 : 500,
                        fontFamily: "inherit",
                        cursor: "pointer",
                        textAlign: "left",
                        transition:
                          "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
                      }}
                    >
                      <span
                        style={{
                          width: "18px",
                          height: "18px",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {section.icon}
                      </span>
                      <span style={{ flex: 1 }}>{section.label}</span>
                    </button>
                  );

                  // Inject a standalone "Tutorial" launcher directly above the
                  // About entry. Unlike the section tabs, it doesn't switch
                  // content it opens the tour on demand, ignoring the
                  // "Don't show this again" checkmark.
                  if (section.key === "about") {
                    const isTutorialHover = hovered === "tutorial";
                    return (
                      <Fragment key={section.key}>
                        <button
                          onClick={() => setTutorialOpen(true)}
                          onMouseEnter={() => setHovered("tutorial")}
                          onMouseLeave={() => setHovered(null)}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "12px 14px",
                            marginBottom: "4px",
                            background: isTutorialHover
                              ? "rgba(255,255,255,0.03)"
                              : "transparent",
                            border: "1px solid",
                            borderColor: isTutorialHover
                              ? "rgba(255,255,255,0.06)"
                              : "transparent",
                            borderRadius: "10px",
                            color: isTutorialHover ? "#e8e6e1" : "#9a9aab",
                            fontSize: "14px",
                            fontWeight: 500,
                            fontFamily: "inherit",
                            cursor: "pointer",
                            textAlign: "left",
                            transition:
                              "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
                          }}
                        >
                          <span
                            style={{
                              width: "18px",
                              height: "18px",
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                            </svg>
                          </span>
                          <span style={{ flex: 1 }}>Tutorial</span>
                        </button>
                        {sectionButton}
                      </Fragment>
                    );
                  }

                  return sectionButton;
                })}
              </aside>
            )}

            {/* ---- Content ---- */}
            <main
              style={{
                flex: 1,
                minWidth: 0,
                background: "#131318",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "16px",
                padding: "32px 36px",
                animation: "fadeIn 0.25s ease",
              }}
              key={activeSection}
            >
              <SectionHeader
                title={active.label}
                subtitle={active.description}
              />
              {activeSection === "labels" && <LabelsSection />}
              {activeSection === "configuration" && <ConfigurationSection />}
              {activeSection === "about" && <AboutSection />}
            </main>
          </div>
        </div>
      </div>

      {/* On-demand tour. Mounted only while open so closing it can't
          re-trigger the popup's auto-open effect. forceOpen makes it ignore
          the "Don't show this again" cookie. */}
      {tutorialOpen && (
        <TutorialPopup forceOpen onClose={() => setTutorialOpen(false)} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Reusable bits
// ---------------------------------------------------------------------------

function SectionHeader({ title, subtitle }) {
  return (
    <div
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        paddingBottom: "20px",
        marginBottom: "24px",
      }}
    >
      <h2
        style={{
          fontSize: "22px",
          fontWeight: 600,
          color: "#e8e6e1",
          marginBottom: "6px",
          letterSpacing: "-0.2px",
        }}
      >
        {title}
      </h2>
      <p style={{ fontSize: "13.5px", color: "#7a7a8a", lineHeight: 1.5 }}>
        {subtitle}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Labels section — wired to api.labels (list / create / update / remove).
// ---------------------------------------------------------------------------

function LabelsSection() {
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [searchHover, setSearchHover] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [savingId, setSavingId] = useState(null);

  // ---- Load on mount ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.labels.list();
        if (!cancelled) setLabels(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load labels.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Create ----
  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    setError(null);
    try {
      const desc = description.trim() ? description.trim() : null;
      const newId = await api.labels.create({
        name: trimmed,
        description: desc,
      });
      const id = typeof newId === "string" ? newId : String(newId);
      setLabels((prev) => [...prev, { id, name: trimmed, description: desc }]);
      setName("");
      setDescription("");
      setShowCreate(false);
    } catch (e) {
      setError(e?.message || "Failed to create label.");
    } finally {
      setCreating(false);
    }
  };

  // ---- Update ----
  // Assumes `api.labels.update(id, { name, description })` exists. If your
  // backend uses a different signature (e.g. `update({ id, name, ... })`),
  // adjust the call below to match.
  const handleUpdate = async (id, nextName, nextDescription) => {
    const trimmedName = (nextName || "").trim();
    const trimmedDesc = (nextDescription || "").trim();
    if (!trimmedName || savingId) return;
    setSavingId(id);
    setError(null);
    try {
      const payload = {
        name: trimmedName,
        description: trimmedDesc ? trimmedDesc : null,
      };
      await api.labels.update(id, payload);
      setLabels((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...payload } : l)),
      );
      setEditingId(null);
    } catch (e) {
      setError(e?.message || "Failed to update label.");
    } finally {
      setSavingId(null);
    }
  };

  // ---- Delete ----
  const handleDelete = async (id) => {
    if (deletingId) return;
    setDeletingId(id);
    setError(null);
    try {
      await api.labels.remove(id);
      setLabels((prev) => prev.filter((l) => l.id !== id));
    } catch (e) {
      setError(e?.message || "Failed to delete label.");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const term = search.trim().toLowerCase();
  const filtered = term
    ? labels.filter((l) => (l.name || "").toLowerCase().includes(term))
    : labels;

  const openCreate = () => {
    setShowCreate(true);
    setError(null);
  };

  return (
    <div>
      {/* ---- Toolbar ---- */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: showCreate ? "16px" : "24px",
          alignItems: "center",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 14px",
            background: "#0e0e12",
            border: "1px solid",
            borderColor: searchHover
              ? "rgba(130,170,255,0.25)"
              : "rgba(255,255,255,0.06)",
            borderRadius: "10px",
            transition: "border-color 0.15s ease",
          }}
          onMouseEnter={() => setSearchHover(true)}
          onMouseLeave={() => setSearchHover(false)}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6a6a7a"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search labels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#e8e6e1",
              fontSize: "13.5px",
              fontFamily: "inherit",
            }}
          />
        </div>

        <PrimaryButton
          onClick={() => (showCreate ? setShowCreate(false) : openCreate())}
          label={showCreate ? "Close" : "New label"}
          plus={!showCreate}
        />
      </div>

      {/* ---- Create panel ---- */}
      {showCreate && (
        <div
          style={{
            background: "#0e0e12",
            border: "1px solid rgba(199,146,234,0.18)",
            borderRadius: "12px",
            padding: "18px",
            marginBottom: "24px",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <label style={fieldLabelStyle}>Name</label>
          <input
            autoFocus
            type="text"
            placeholder="e.g. Read later"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            style={textInputStyle}
          />

          <label style={{ ...fieldLabelStyle, marginTop: "14px" }}>
            Description <span style={{ color: "#5a5a6a" }}>(optional)</span>
          </label>
          <input
            type="text"
            placeholder="What this label is for"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            style={textInputStyle}
          />

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "18px",
              justifyContent: "flex-end",
            }}
          >
            <GhostButton
              onClick={() => {
                setShowCreate(false);
                setName("");
                setDescription("");
              }}
              label="Cancel"
            />
            <PrimaryButton
              onClick={handleCreate}
              label={creating ? "Creating…" : "Create label"}
              disabled={!name.trim() || creating}
            />
          </div>
        </div>
      )}

      {/* ---- Action error banner ---- */}
      {error && labels.length > 0 && (
        <div
          style={{
            background: "rgba(255,107,107,0.08)",
            border: "1px solid rgba(255,107,107,0.25)",
            borderRadius: "10px",
            padding: "10px 14px",
            marginBottom: "16px",
            fontSize: "13px",
            color: "#ff9b9b",
          }}
        >
          {error}
        </div>
      )}

      {/* ---- Content states ---- */}
      {/* Empty-state card removed per spec — when there are no labels the
          toolbar above is the only thing shown. */}
      {loading ? (
        <CenteredNote text="Loading labels…" />
      ) : error && labels.length === 0 ? (
        <CenteredNote text={error} tone="error" />
      ) : labels.length === 0 ? null : filtered.length === 0 ? (
        <CenteredNote text={`No labels match “${search.trim()}”.`} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map((label) => (
            <LabelRow
              key={label.id}
              label={label}
              editing={editingId === label.id}
              saving={savingId === label.id}
              confirming={confirmDeleteId === label.id}
              deleting={deletingId === label.id}
              onAskDelete={() => {
                setEditingId(null);
                setConfirmDeleteId(label.id);
              }}
              onCancelDelete={() => setConfirmDeleteId(null)}
              onConfirmDelete={() => handleDelete(label.id)}
              onStartEdit={() => {
                setConfirmDeleteId(null);
                setEditingId(label.id);
              }}
              onCancelEdit={() => setEditingId(null)}
              onSaveEdit={(nextName, nextDescription) =>
                handleUpdate(label.id, nextName, nextDescription)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Configuration section — wired to api.config (get / update).
// ---------------------------------------------------------------------------
//
// Focus is the scheduler block, which is what's meant to be tuned. To stay
// safe against the server's serde-default behavior (omitted top-level fields
// like `network` / `paths` reset to defaults), we fetch the *whole* config on
// mount, edit only `scheduler`, and send the merged whole config back on save.
// That preserves network/paths exactly as they were.

// Mirrors the Rust `Scheduler::default()` impl in config.rs.
const SCHEDULER_DEFAULTS = Object.freeze({
  min_fetch_interval: 900,
  max_fetch_interval: 14400,
  short_term_cutoff_time: 86400,
  long_term_cutoff_time: 2592000,
  fetch_freshness_bias: 0.2,
  signals_count_limit: 1000,
  publication_window_new_items_count_threshold: 15,
});

// Field metadata drives the rendered form. `kind` controls parsing/validation:
//   "seconds" -> non-negative integer, shown with a humanized hint
//   "int"     -> non-negative integer
//   "float"   -> decimal within [min, max]
const SCHEDULER_FIELDS = [
  {
    key: "min_fetch_interval",
    label: "Minimum fetch interval",
    kind: "seconds",
    min: 0,
    step: 60,
    help: "Shortest delay the scheduler will wait before fetching the same source again.",
  },
  {
    key: "max_fetch_interval",
    label: "Maximum fetch interval",
    kind: "seconds",
    min: 0,
    step: 60,
    help: "Longest the scheduler will let a source go without a fetch.",
  },
  {
    key: "short_term_cutoff_time",
    label: "Short-term cutoff",
    kind: "seconds",
    min: 0,
    step: 3600,
    help: "Window used when weighting recent (short-term) feedback signals.",
  },
  {
    key: "long_term_cutoff_time",
    label: "Long-term cutoff",
    kind: "seconds",
    min: 0,
    step: 86400,
    help: "Window used when weighting older (long-term) feedback signals.",
  },
  {
    key: "fetch_freshness_bias",
    label: "Fetch freshness bias",
    kind: "float",
    min: 0,
    max: 1,
    step: 0.05,
    help: "How strongly fresh items are favored when scheduling fetches. 0 = none, 1 = maximum.",
  },
  {
    key: "signals_count_limit",
    label: "Signals count limit",
    kind: "int",
    min: 0,
    step: 100,
    help: "Maximum number of user-feedback signals considered per computation.",
  },
  {
    key: "publication_window_new_items_count_threshold",
    label: "Publication window threshold",
    kind: "int",
    min: 0,
    step: 1,
    help: "New-item count that triggers a tighter publication-window estimate.",
  },
];

function humanizeSeconds(total) {
  const s = Number(total);
  if (!Number.isFinite(s) || s < 0) return "";
  if (s === 0) return "0s";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (sec) parts.push(`${sec}s`);
  return parts.join(" ");
}

function validateSchedulerField(field, rawValue) {
  const v = String(rawValue).trim();
  if (v === "") return "Required.";
  const num = Number(v);
  if (!Number.isFinite(num)) return "Must be a number.";
  if (field.kind === "float") {
    if (field.min != null && num < field.min) return `Must be ≥ ${field.min}.`;
    if (field.max != null && num > field.max) return `Must be ≤ ${field.max}.`;
  } else {
    if (!Number.isInteger(num)) return "Must be a whole number.";
    if (field.min != null && num < field.min) return `Must be ≥ ${field.min}.`;
  }
  return null;
}

function coerceSchedulerValue(field, rawValue) {
  const num = Number(String(rawValue).trim());
  return field.kind === "float" ? num : Math.trunc(num);
}

// Turn a scheduler object into the string-keyed map the inputs are bound to.
function schedulerToFormValues(sched) {
  const out = {};
  for (const field of SCHEDULER_FIELDS) {
    const raw =
      sched && sched[field.key] != null
        ? sched[field.key]
        : SCHEDULER_DEFAULTS[field.key];
    out[field.key] = String(raw);
  }
  return out;
}

function ConfigurationSection() {
  // Full config kept verbatim so we can re-merge network/paths on save.
  const [config, setConfig] = useState(null);
  const [original, setOriginal] = useState({}); // last-saved scheduler form values
  const [values, setValues] = useState({}); // current scheduler form values (strings)

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState(false);

  const savedTimer = useRef(null);

  // ---- Load on mount ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const cfg = await api.config.get();
        if (cancelled) return;
        
        // MAPPING FIX: The backend currently sends a flat ConfigQuery object 
        // with min/max fetch intervals instead of the fully nested config.
        const sched = { ...SCHEDULER_DEFAULTS };
        if (cfg) {
          // Map flat structure (used by current API)
          if (cfg.min_fetch_interval != null) sched.min_fetch_interval = cfg.min_fetch_interval;
          if (cfg.max_fetch_interval != null) sched.max_fetch_interval = cfg.max_fetch_interval;
          
          // Map nested structure (if API gets updated to return full config struct later)
          if (cfg.scheduler) {
            Object.assign(sched, cfg.scheduler);
          }
        }
        
        const form = schedulerToFormValues(sched);
        setConfig(cfg || {});
        setOriginal(form);
        setValues(form);
      } catch (e) {
        if (!cancelled)
          setLoadError(e?.message || "Failed to load configuration.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Clear any pending "Saved" flash timer on unmount.
  useEffect(() => () => clearTimeout(savedTimer.current), []);

  const setField = (key, val) => {
    setSaved(false);
    setSaveError(null);
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  // Per-field validation errors.
  const fieldErrors = {};
  for (const field of SCHEDULER_FIELDS) {
    const err = validateSchedulerField(field, values[field.key]);
    if (err) fieldErrors[field.key] = err;
  }
  const hasErrors = Object.keys(fieldErrors).length > 0;

  // Soft, non-blocking ordering warnings.
  const warnings = [];
  if (!hasErrors) {
    const minI = Number(values.min_fetch_interval);
    const maxI = Number(values.max_fetch_interval);
    const shortC = Number(values.short_term_cutoff_time);
    const longC = Number(values.long_term_cutoff_time);
    if (Number.isFinite(minI) && Number.isFinite(maxI) && minI > maxI) {
      warnings.push("Minimum fetch interval is larger than the maximum.");
    }
    if (Number.isFinite(shortC) && Number.isFinite(longC) && shortC > longC) {
      warnings.push("Short-term cutoff is larger than the long-term cutoff.");
    }
  }

  const dirty = SCHEDULER_FIELDS.some((f) => values[f.key] !== original[f.key]);
  const canSave = !!config && dirty && !hasErrors && !saving;

  const handleResetDefaults = () => {
    setSaved(false);
    setSaveError(null);
    const form = {};
    for (const field of SCHEDULER_FIELDS) {
      form[field.key] = String(SCHEDULER_DEFAULTS[field.key]);
    }
    setValues(form);
  };

  const handleRevert = () => {
    setSaved(false);
    setSaveError(null);
    setValues(original);
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);

    // Build the coerced scheduler object.
    const nextScheduler = { ...(config.scheduler || {}) };
    for (const field of SCHEDULER_FIELDS) {
      nextScheduler[field.key] = coerceSchedulerValue(field, values[field.key]);
    }

    // MAPPING FIX: Merge into the full config so network/paths are preserved as-is.
    // We also hoist min_fetch_interval & max_fetch_interval to the root level 
    // since the Rust backend `update_config` parses a flat `ConfigQuery` struct.
    const payload = { 
      ...config, 
      scheduler: nextScheduler,
      min_fetch_interval: nextScheduler.min_fetch_interval,
      max_fetch_interval: nextScheduler.max_fetch_interval,
    };

    try {
      await api.config.update(payload);
      setConfig(payload);
      const form = schedulerToFormValues(nextScheduler);
      setOriginal(form);
      setValues(form);
      setSaved(true);
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 4000);
    } catch (e) {
      setSaveError(e?.message || "Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CenteredNote text="Loading configuration…" />;
  if (loadError) return <CenteredNote text={loadError} tone="error" />;

  return (
    <div>
      {/* ---- Restart-required notice ---- */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "flex-start",
          background: "rgba(130,170,255,0.07)",
          border: "1px solid rgba(130,170,255,0.20)",
          borderRadius: "10px",
          padding: "12px 14px",
          marginBottom: "22px",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#82aaff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0, marginTop: "1px" }}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <p
          style={{
            fontSize: "13px",
            color: "#a9bdf0",
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          These settings are written to the server config file. Restart the
          server for changes to take effect.
        </p>
      </div>

      {/* ---- Read-only context (preserved on save) ---- */}
      {config && (config.network || config.paths) && (
        <ReadonlyConfigSummary network={config.network} paths={config.paths} />
      )}

      {/* ---- Scheduler heading ---- */}
      <div
        style={{
          fontSize: "12px",
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          color: "#5a5a6a",
          margin: "4px 0 16px",
        }}
      >
        Scheduler
      </div>

      {/* ---- Fields ---- */}
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        {SCHEDULER_FIELDS.map((field) => (
          <ConfigNumberField
            key={field.key}
            field={field}
            value={values[field.key] ?? ""}
            error={fieldErrors[field.key]}
            onChange={(v) => setField(field.key, v)}
          />
        ))}
      </div>

      {/* ---- Soft warnings ---- */}
      {warnings.length > 0 && (
        <div
          style={{
            background: "rgba(255,193,94,0.07)",
            border: "1px solid rgba(255,193,94,0.22)",
            borderRadius: "10px",
            padding: "10px 14px",
            marginTop: "18px",
            fontSize: "13px",
            color: "#e7c07a",
            lineHeight: 1.5,
          }}
        >
          {warnings.map((w, i) => (
            <div key={i}>⚠ {w}</div>
          ))}
        </div>
      )}

      {/* ---- Save error ---- */}
      {saveError && (
        <div
          style={{
            background: "rgba(255,107,107,0.08)",
            border: "1px solid rgba(255,107,107,0.25)",
            borderRadius: "10px",
            padding: "10px 14px",
            marginTop: "18px",
            fontSize: "13px",
            color: "#ff9b9b",
          }}
        >
          {saveError}
        </div>
      )}

      {/* ---- Footer actions ---- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginTop: "26px",
          paddingTop: "20px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <GhostButton onClick={handleResetDefaults} label="Reset to defaults" />
        {dirty && <GhostButton onClick={handleRevert} label="Revert changes" />}

        <div style={{ flex: 1 }} />

        {saved && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              color: "#7ddf9b",
              fontWeight: 500,
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#7ddf9b"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Saved — restart to apply
          </span>
        )}

        <PrimaryButton
          onClick={handleSave}
          label={saving ? "Saving…" : "Save changes"}
          disabled={!canSave}
        />
      </div>
    </div>
  );
}

// Single labeled number input with help text, optional humanized hint, and
// inline validation error.
function ConfigNumberField({ field, value, error, onChange }) {
  const [focus, setFocus] = useState(false);
  const showHumanized = field.kind === "seconds";
  const human = showHumanized ? humanizeSeconds(value) : "";

  return (
    <div>
      <label style={fieldLabelStyle}>{field.label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <input
          type="number"
          inputMode={field.kind === "float" ? "decimal" : "numeric"}
          min={field.min}
          max={field.max}
          step={field.step}
          value={value}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onChange={(e) => onChange(e.target.value)}
          style={{
            ...textInputStyle,
            width: "200px",
            flexShrink: 0,
            borderColor: error
              ? "rgba(255,107,107,0.45)"
              : focus
                ? "rgba(199,146,234,0.40)"
                : "rgba(255,255,255,0.08)",
          }}
        />
        {showHumanized && human && (
          <span
            style={{
              fontSize: "12.5px",
              color: "#7a7a8a",
              whiteSpace: "nowrap",
            }}
          >
            ≈ {human}
          </span>
        )}
      </div>
      {error ? (
        <p style={{ fontSize: "12px", color: "#ff9b9b", margin: "6px 0 0" }}>
          {error}
        </p>
      ) : (
        <p
          style={{
            fontSize: "12px",
            color: "#6a6a7a",
            margin: "6px 0 0",
            lineHeight: 1.5,
          }}
        >
          {field.help}
        </p>
      )}
    </div>
  );
}

// Compact, read-only view of the network/paths blocks so the user can see
// what else lives in the config (and trust it's left untouched on save).
function ReadonlyConfigSummary({ network, paths }) {
  const rows = [];
  if (network) {
    if (network.host != null) rows.push(["Host", String(network.host)]);
    if (network.port != null) rows.push(["Port", String(network.port)]);
    if (network.tor_proxy_port != null)
      rows.push(["Tor proxy port", String(network.tor_proxy_port)]);
  }
  if (paths && paths.db_file != null)
    rows.push(["Database file", String(paths.db_file)]);
  if (rows.length === 0) return null;

  return (
    <div
      style={{
        background: "#0e0e12",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "12px",
        padding: "16px 18px",
        marginBottom: "24px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          color: "#5a5a6a",
          marginBottom: "12px",
        }}
      >
        Network &amp; paths
        <span
          style={{
            textTransform: "none",
            letterSpacing: 0,
            color: "#5a5a6a",
            fontWeight: 400,
          }}
        >
          {"  ·  read-only here"}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {rows.map(([k, v]) => (
          <div
            key={k}
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "baseline",
              fontSize: "13px",
            }}
          >
            <span style={{ width: "130px", flexShrink: 0, color: "#7a7a8a" }}>
              {k}
            </span>
            <span
              style={{
                color: "#c8c8d4",
                fontFamily: "ui-monospace, 'SFMono-Regular', Menlo, monospace",
                fontSize: "12.5px",
                wordBreak: "break-all",
              }}
            >
              {v}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Label row
// ---------------------------------------------------------------------------

function LabelRow({
  label,
  editing,
  saving,
  confirming,
  deleting,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
}) {
  const [hover, setHover] = useState(false);
  const [editName, setEditName] = useState(label.name || "");
  const [editDescription, setEditDescription] = useState(
    label.description || "",
  );

  // Reset draft values whenever we (re)enter edit mode or the underlying
  // label changes. Keeps stale text from leaking across rows.
  useEffect(() => {
    if (editing) {
      setEditName(label.name || "");
      setEditDescription(label.description || "");
    }
  }, [editing, label.name, label.description]);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: editing ? "stretch" : "center",
        gap: "12px",
        padding: editing ? "16px" : "12px 14px",
        background: editing
          ? "#0e0e12"
          : hover
            ? "rgba(255,255,255,0.02)"
            : "#0e0e12",
        border: "1px solid",
        borderColor: editing
          ? "rgba(199,146,234,0.22)"
          : "rgba(255,255,255,0.06)",
        borderRadius: "10px",
        opacity: deleting ? 0.5 : 1,
        transition:
          "background 0.15s ease, opacity 0.15s ease, border-color 0.15s ease",
      }}
    >
      {editing ? (
        // ---- Edit mode ----
        <div style={{ flex: 1, minWidth: 0 }}>
          <label style={fieldLabelStyle}>Name</label>
          <input
            autoFocus
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveEdit(editName, editDescription);
              if (e.key === "Escape") onCancelEdit();
            }}
            style={textInputStyle}
          />

          <label style={{ ...fieldLabelStyle, marginTop: "12px" }}>
            Description <span style={{ color: "#5a5a6a" }}>(optional)</span>
          </label>
          <input
            type="text"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveEdit(editName, editDescription);
              if (e.key === "Escape") onCancelEdit();
            }}
            style={textInputStyle}
          />

          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "14px",
              justifyContent: "flex-end",
            }}
          >
            <GhostButton onClick={onCancelEdit} label="Cancel" />
            <PrimaryButton
              onClick={() => onSaveEdit(editName, editDescription)}
              label={saving ? "Saving…" : "Save"}
              disabled={!editName.trim() || saving}
            />
          </div>
        </div>
      ) : (
        // ---- Display mode ----
        <>
          <span
            style={{
              width: "9px",
              height: "9px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #c792ea, #82aaff)",
              flexShrink: 0,
            }}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "#e8e6e1",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {label.name}
            </div>
            {label.description && (
              <div
                style={{
                  fontSize: "12.5px",
                  color: "#7a7a8a",
                  marginTop: "2px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {label.description}
              </div>
            )}
          </div>

          {/* Two-click delete confirm OR action buttons */}
          {confirming ? (
            <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
              <button
                onClick={onConfirmDelete}
                disabled={deleting}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,107,107,0.35)",
                  background: "rgba(255,107,107,0.12)",
                  color: "#ff8b8b",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: deleting ? "default" : "pointer",
                }}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button
                onClick={onCancelDelete}
                disabled={deleting}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "transparent",
                  color: "#9a9aab",
                  fontSize: "12.5px",
                  fontWeight: 500,
                  fontFamily: "inherit",
                  cursor: deleting ? "default" : "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
              <EditButton onClick={onStartEdit} labelName={label.name} />
              <RemoveButton onClick={onAskDelete} labelName={label.name} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit + Remove buttons (always visible, with native tooltips)
// ---------------------------------------------------------------------------

function EditButton({ onClick, labelName }) {
  const [hover, setHover] = useState(false);
  // Resting tone for the pencil icon — neutral light gray that reads clearly
  // against the row background. Brightens to soft blue on hover.
  const iconColor = hover ? "#a8c2ff" : "#c8c8d4";
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={`Edit ${labelName}`}
      title="Edit label"
      style={{
        width: "34px",
        height: "34px",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "8px",
        border: "1px solid",
        borderColor: hover
          ? "rgba(130,170,255,0.30)"
          : "rgba(255,255,255,0.08)",
        background: hover ? "rgba(130,170,255,0.10)" : "transparent",
        cursor: "pointer",
        padding: 0,
        transition: "background 0.15s ease, border-color 0.15s ease",
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={iconColor}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ display: "block", pointerEvents: "none" }}
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
      </svg>
    </button>
  );
}

function RemoveButton({ onClick, labelName }) {
  const [hover, setHover] = useState(false);
  // Red at rest, brighter red on hover — never gray.
  const iconColor = hover ? "#ff6b6b" : "#ff8b8b";
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={`Remove ${labelName}`}
      title="Remove label"
      style={{
        width: "34px",
        height: "34px",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "8px",
        border: "1px solid",
        borderColor: hover
          ? "rgba(255,107,107,0.45)"
          : "rgba(255,107,107,0.18)",
        background: hover ? "rgba(255,107,107,0.12)" : "transparent",
        cursor: "pointer",
        padding: 0,
        transition: "background 0.15s ease, border-color 0.15s ease",
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={iconColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ display: "block", pointerEvents: "none" }}
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}

function AboutSection() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* App identity */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #c792ea, #82aaff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            fontWeight: 700,
            color: "#0e0e12",
            flexShrink: 0,
          }}
        >
          A
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#e8e6e1" }}>Aleym</div>
          <div style={{ fontSize: "12px", color: "#6a6a7a", marginTop: "2px" }}>Version {version}</div>
        </div>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            color: "#82aaff",
            textDecoration: "none",
            background: "rgba(130,170,255,0.08)",
            border: "1px solid rgba(130,170,255,0.15)",
            borderRadius: "8px",
            padding: "6px 12px",
            flexShrink: 0,
            transition: "background 0.15s ease",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          GitHub
        </a>
      </div>

      {/* Description */}
      <p style={{ fontSize: "13px", lineHeight: 1.7, color: "#9a9aaa", margin: 0 }}>
        {description}
      </p>

      {/* License */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: "20px",
        }}
      >
        <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "12px", color: "#e8e6e1" }}>
          License
        </div>
        <div
          style={{
            fontSize: "12px",
            lineHeight: 1.8,
            color: "#6a6a7a",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <p style={{ margin: 0 }}>
            This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, version 3 of the License only.
          </p>
          <p style={{ margin: 0 }}>
            This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
          </p>
          <p style={{ margin: 0 }}>
            You should have received a copy of the GNU Affero General Public License along with this program. If not, see{" "}
            <a
              href="https://www.gnu.org/licenses/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#82aaff" }}
            >
              https://www.gnu.org/licenses/
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small shared UI helpers
// ---------------------------------------------------------------------------

function PrimaryButton({ onClick, label, plus = false, disabled = false }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 18px",
        background: disabled
          ? "rgba(199,146,234,0.25)"
          : hover
            ? "linear-gradient(135deg, #d4a3f0, #93b6ff)"
            : "linear-gradient(135deg, #c792ea, #82aaff)",
        border: "none",
        borderRadius: "10px",
        color: "#0e0e12",
        fontSize: "13.5px",
        fontWeight: 600,
        fontFamily: "inherit",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
        whiteSpace: "nowrap",
        transition:
          "background 0.15s ease, transform 0.1s ease, opacity 0.15s ease",
        transform: hover && !disabled ? "translateY(-1px)" : "translateY(0)",
      }}
    >
      {plus && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      )}
      {label}
    </button>
  );
}

function GhostButton({ onClick, label }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "10px 18px",
        background: hover ? "rgba(255,255,255,0.05)" : "transparent",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "10px",
        color: "#b0b0c0",
        fontSize: "13.5px",
        fontWeight: 500,
        fontFamily: "inherit",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "background 0.15s ease, color 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}

function CenteredNote({ text, tone }) {
  return (
    <div
      style={{
        background: "#0e0e12",
        border: "1px dashed rgba(255,255,255,0.08)",
        borderRadius: "14px",
        padding: "40px 24px",
        textAlign: "center",
        fontSize: "13.5px",
        lineHeight: 1.6,
        color: tone === "error" ? "#ff9b9b" : "#7a7a8a",
      }}
    >
      {text}
    </div>
  );
}

const fieldLabelStyle = {
  display: "block",
  fontSize: "12px",
  fontWeight: 500,
  color: "#9a9aab",
  marginBottom: "6px",
};

const textInputStyle = {
  width: "100%",
  padding: "10px 12px",
  background: "#131318",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "8px",
  color: "#e8e6e1",
  fontSize: "13.5px",
  fontFamily: "inherit",
  outline: "none",
};