import { useState, useEffect } from "react";
import Sidebar, {
  SIDEBAR_WIDTH_OPEN,
  SIDEBAR_WIDTH_CLOSED,
  SIDEBAR_STATE_KEY,
} from "../components/Sidebar";
// Service module for the Aleym backend. Adjust the path if your aleymapi.js
// lives somewhere other than the project src root.
import api from "../services/aleymApi";

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
// Sections
// ---------------------------------------------------------------------------
// When `SECTIONS.length > 1`, a section selector pane renders on the left.
// For now there's only Labels, so the page goes straight to its content.

const SECTIONS = [
  {
    key: "labels",
    label: "Labels",
    description:
      "Create your labels to organize articles by topic, priority, or anything else that helps you find things later.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
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

  const sidebarWidth = sidebarOpen ? SIDEBAR_WIDTH_OPEN : SIDEBAR_WIDTH_CLOSED;
  const active = SECTIONS.find((s) => s.key === activeSection) || SECTIONS[0];
  const showSectionNav = SECTIONS.length > 1;

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
          <div style={{ display: "flex", gap: "40px", alignItems: "flex-start" }}>
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
                  return (
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
                        color: isActive ? "#c792ea" : isHover ? "#e8e6e1" : "#9a9aab",
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
              <SectionHeader title={active.label} subtitle={active.description} />
              {activeSection === "labels" && <LabelsSection />}
            </main>
          </div>
        </div>
      </div>
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
      const newId = await api.labels.create({ name: trimmed, description: desc });
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
        prev.map((l) => (l.id === id ? { ...l, ...payload } : l))
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
  const [editDescription, setEditDescription] = useState(label.description || "");

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
        transition: "background 0.15s ease, opacity 0.15s ease, border-color 0.15s ease",
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
        borderColor: hover ? "rgba(130,170,255,0.30)" : "rgba(255,255,255,0.08)",
        background: hover ? "rgba(130,170,255,0.10)" : "transparent",
        cursor: "pointer",
        padding: 0,
        transition:
          "background 0.15s ease, border-color 0.15s ease",
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
        borderColor: hover ? "rgba(255,107,107,0.45)" : "rgba(255,107,107,0.18)",
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
        transition: "background 0.15s ease, transform 0.1s ease, opacity 0.15s ease",
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