import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import api from "../services/aleymApi";

export function useArticleLabels(articleId) {
  const [allLabels, setAllLabels] = useState([]);
  const [assignedLabels, setAssignedLabels] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const assignedIds = useMemo(
    () => new Set(assignedLabels.map((l) => l.id)),
    [assignedLabels],
  );

  const loadAll = useCallback(async () => {
    setLoadingAll(true);
    setError(null);
    try {
      const data = await api.labels.list();
      setAllLabels(Array.isArray(data) ? data : []);
      setAllLoaded(true);
    } catch (e) {
      setError(e?.message || "Failed to load labels.");
    } finally {
      setLoadingAll(false);
    }
  }, []);

  const loadAssigned = useCallback(async () => {
    if (!articleId) return;
    setLoadingAssigned(true);
    setError(null);
    try {
      const data = await api.articles.labels(articleId);
      setAssignedLabels(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Failed to load article labels.");
    } finally {
      setLoadingAssigned(false);
    }
  }, [articleId]);

  const toggle = useCallback(
    async (label) => {
      if (!articleId || busyId) return;
      const id = label.id;
      const wasAssigned = assignedIds.has(id);

      setBusyId(id);
      setError(null);
      setAssignedLabels((prev) =>
        wasAssigned ? prev.filter((l) => l.id !== id) : [...prev, label],
      );

      try {
        if (wasAssigned) await api.articles.unlinkLabel(articleId, id);
        else await api.articles.linkLabel(articleId, id);
      } catch (e) {
        setAssignedLabels((prev) =>
          wasAssigned ? [...prev, label] : prev.filter((l) => l.id !== id),
        );
        setError(e?.message || "Failed to update label.");
      } finally {
        setBusyId(null);
      }
    },
    [articleId, assignedIds, busyId],
  );

  return {
    allLabels,
    assignedLabels,
    assignedIds,
    loadingAll,
    loadingAssigned,
    allLoaded,
    error,
    busyId,
    loadAll,
    loadAssigned,
    toggle,
  };
}


export function LabelChips({ labels, max = 0, style }) {
  if (!labels || labels.length === 0) return null;

  const shown = max > 0 ? labels.slice(0, max) : labels;
  const extra = max > 0 ? Math.max(0, labels.length - shown.length) : 0;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "6px",
        ...style,
      }}
    >
      {shown.map((l) => (
        <span key={l.id} title={l.description || l.name} style={chipStyle}>
          <span style={chipDotStyle} />
          {l.name}
        </span>
      ))}
      {extra > 0 && (
        <span style={{ ...chipStyle, color: "#9a9aab" }}>+{extra}</span>
      )}
    </div>
  );
}

const chipStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  maxWidth: "180px",
  padding: "3px 9px",
  background: "rgba(199,146,234,0.10)",
  border: "1px solid rgba(199,146,234,0.22)",
  borderRadius: "999px",
  color: "#d8b6f0",
  fontSize: "11px",
  fontWeight: 500,
  lineHeight: 1.4,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const chipDotStyle = {
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  flexShrink: 0,
  background: "linear-gradient(135deg, #c792ea, #82aaff)",
};


export function LabelContextMenu({
  labels,
  variant = "grid",
  x,
  y,
  onClose,
}) {
  const menuRef = useRef(null);
  const [view, setView] = useState(variant === "grid" ? "root" : "assign");
  const [pos, setPos] = useState({ left: x, top: y });
  const [search, setSearch] = useState("");

  useEffect(() => {
    labels.loadAll();
    labels.loadAssigned();
  }, []);

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    let left = x;
    let top = y;
    if (left + rect.width + pad > window.innerWidth)
      left = window.innerWidth - rect.width - pad;
    if (top + rect.height + pad > window.innerHeight)
      top = window.innerHeight - rect.height - pad;
    setPos({ left: Math.max(pad, left), top: Math.max(pad, top) });
  }, [x, y, view, labels.allLabels.length, labels.assignedLabels.length]);

  useEffect(() => {
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    const onScroll = () => onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onClose]);

  const term = search.trim().toLowerCase();
  const filteredAll = term
    ? labels.allLabels.filter((l) =>
        (l.name || "").toLowerCase().includes(term),
      )
    : labels.allLabels;

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        left: `${pos.left}px`,
        top: `${pos.top}px`,
        zIndex: 9999,
        width: "256px",
        background: "#1e1e26",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "12px",
        padding: "6px",
        boxShadow: "0 16px 48px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.35)",
        fontFamily: "'DM Sans', sans-serif",
        color: "#e8e6e1",
        animation: "fadeIn 0.12s ease",
      }}
    >
      {view === "root" && (
        <RootView
          assignedCount={labels.assignedLabels.length}
          onAssign={() => setView("assign")}
          onDisplay={() => setView("display")}
        />
      )}

      {view === "assign" && (
        <AssignView
          variant={variant}
          labels={labels}
          filtered={filteredAll}
          search={search}
          setSearch={setSearch}
          onBack={variant === "grid" ? () => setView("root") : null}
        />
      )}

      {view === "display" && (
        <DisplayView labels={labels} onBack={() => setView("root")} />
      )}
    </div>
  );

  return createPortal(menu, document.body);
}

function RootView({ assignedCount, onAssign, onDisplay }) {
  return (
    <>
      <MenuTitle>Labels</MenuTitle>
      <MenuButton label="Assign labels" onClick={onAssign} />
      <MenuButton
        label="Assigned labels"
        onClick={onDisplay}
        trailing={
          assignedCount > 0 ? (
            <span style={countBadgeStyle}>{assignedCount}</span>
          ) : null
        }
      />
    </>
  );
}

function AssignView({ variant, labels, filtered, search, setSearch, onBack }) {
  const showSearch = labels.allLabels.length > 6;

  return (
    <>
      <MenuHeader title="Assign labels" onBack={onBack} />

      {labels.error && <MenuError text={labels.error} />}

      {showSearch && (
        <input
          autoFocus
          type="text"
          placeholder="Search labels…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={searchInputStyle}
        />
      )}

      {labels.loadingAll && !labels.allLoaded ? (
        <MenuNote text="Loading labels…" />
      ) : labels.allLabels.length === 0 ? (
        <EmptyBlock
          title="No labels yet"
          subtitle="Create labels in Settings to start tagging."
        />
      ) : filtered.length === 0 ? (
        <MenuNote text="No labels match your search." />
      ) : (
        <div style={scrollAreaStyle}>
          {filtered.map((label) => {
            const assigned = labels.assignedIds.has(label.id);
            const busy = labels.busyId === label.id;
            return (
              <PickRow
                key={label.id}
                label={label}
                assigned={assigned}
                busy={busy}
                onClick={() => labels.toggle(label)}
              />
            );
          })}
        </div>
      )}
    </>
  );
}

function DisplayView({ labels, onBack }) {
  return (
    <>
      <MenuHeader title="Assigned labels" onBack={onBack} />

      {labels.error && <MenuError text={labels.error} />}

      {labels.loadingAssigned && labels.assignedLabels.length === 0 ? (
        <MenuNote text="Loading…" />
      ) : labels.assignedLabels.length === 0 ? (
        <EmptyBlock
          title="No labels assigned"
          subtitle="Open “Assign labels” to add some."
        />
      ) : (
        <div style={scrollAreaStyle}>
          {labels.assignedLabels.map((label) => {
            const busy = labels.busyId === label.id;
            return (
              <AssignedRow
                key={label.id}
                label={label}
                busy={busy}
                onRemove={() => labels.toggle(label)}
              />
            );
          })}
        </div>
      )}
    </>
  );
}

function PickRow({ label, assigned, busy, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={assigned}
      disabled={busy}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        width: "100%",
        padding: "8px 10px",
        background: hover ? "rgba(255,255,255,0.06)" : "transparent",
        border: "none",
        borderRadius: "8px",
        cursor: busy ? "default" : "pointer",
        opacity: busy ? 0.6 : 1,
        fontFamily: "inherit",
        textAlign: "left",
        transition: "background 0.12s ease",
      }}
    >
      <span style={rowDotStyle} />
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: "13px",
          fontWeight: assigned ? 600 : 500,
          color: assigned ? "#e8e6e1" : "#c8c6c1",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label.name}
      </span>
      <span
        style={{
          width: "18px",
          height: "18px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: assigned ? "#c792ea" : "transparent",
        }}
      >
        <CheckIcon />
      </span>
    </button>
  );
}

function AssignedRow({ label, busy, onRemove }) {
  const [hover, setHover] = useState(false);
  const [xHover, setXHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        width: "100%",
        padding: "7px 8px 7px 10px",
        background: hover ? "rgba(255,255,255,0.04)" : "transparent",
        borderRadius: "8px",
        opacity: busy ? 0.5 : 1,
        transition: "background 0.12s ease",
      }}
    >
      <span style={rowDotStyle} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "#e8e6e1",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label.name}
        </div>
      </div>
      <button
        type="button"
        aria-label={`Unassign ${label.name}`}
        title="Unassign"
        disabled={busy}
        onClick={onRemove}
        onMouseEnter={() => setXHover(true)}
        onMouseLeave={() => setXHover(false)}
        style={{
          width: "26px",
          height: "26px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "7px",
          border: "1px solid",
          borderColor: xHover
            ? "rgba(255,107,107,0.4)"
            : "rgba(255,107,107,0.16)",
          background: xHover ? "rgba(255,107,107,0.12)" : "transparent",
          cursor: busy ? "default" : "pointer",
          padding: 0,
          transition: "background 0.12s ease, border-color 0.12s ease",
        }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke={xHover ? "#ff6b6b" : "#ff8b8b"}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ display: "block", pointerEvents: "none" }}
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

function MenuTitle({ children }) {
  return (
    <div
      style={{
        fontSize: "10.5px",
        fontWeight: 700,
        letterSpacing: "1.2px",
        textTransform: "uppercase",
        color: "#6a6a7a",
        padding: "8px 10px 6px",
      }}
    >
      {children}
    </div>
  );
}

function MenuHeader({ title, onBack }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 8px 8px",
        marginBottom: "2px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {onBack && (
        <button
          type="button"
          aria-label="Back"
          onClick={onBack}
          style={{
            width: "24px",
            height: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            borderRadius: "6px",
            color: "#9a9aab",
            cursor: "pointer",
            padding: 0,
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
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}
      <span style={{ fontSize: "13px", fontWeight: 600, color: "#e8e6e1" }}>
        {title}
      </span>
    </div>
  );
}

function MenuButton({ label, onClick, trailing }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        width: "100%",
        padding: "9px 10px",
        background: hover ? "rgba(255,255,255,0.06)" : "transparent",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        color: hover ? "#e8e6e1" : "#c8c6c1",
        fontSize: "13px",
        fontWeight: 500,
        fontFamily: "inherit",
        textAlign: "left",
        transition: "background 0.12s ease, color 0.12s ease",
      }}
    >
      {/* Text only — no leading icon, no chevron. Counter (trailing) stays. */}
      <span style={{ flex: 1 }}>{label}</span>
      {trailing}
    </button>
  );
}

function MenuNote({ text }) {
  return (
    <div
      style={{
        padding: "16px 10px",
        textAlign: "center",
        fontSize: "12.5px",
        color: "#7a7a8a",
      }}
    >
      {text}
    </div>
  );
}

function MenuError({ text }) {
  return (
    <div
      style={{
        margin: "4px 4px 6px",
        padding: "7px 10px",
        background: "rgba(255,107,107,0.08)",
        border: "1px solid rgba(255,107,107,0.22)",
        borderRadius: "8px",
        fontSize: "12px",
        color: "#ff9b9b",
      }}
    >
      {text}
    </div>
  );
}

function EmptyBlock({ title, subtitle }) {
  return (
    <div style={{ padding: "10px 12px 12px", textAlign: "center" }}>
      <div
        style={{
          fontSize: "12.5px",
          fontWeight: 600,
          color: "#e8e6e1",
          marginBottom: "3px",
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: "11.5px", color: "#7a7a8a", lineHeight: 1.45 }}>
        {subtitle}
      </div>
    </div>
  );
}

const rowDotStyle = {
  width: "9px",
  height: "9px",
  borderRadius: "50%",
  flexShrink: 0,
  background: "linear-gradient(135deg, #c792ea, #82aaff)",
};

const countBadgeStyle = {
  minWidth: "18px",
  height: "18px",
  padding: "0 6px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  background: "rgba(199,146,234,0.15)",
  border: "1px solid rgba(199,146,234,0.25)",
  color: "#d8b6f0",
  fontSize: "11px",
  fontWeight: 600,
};

const scrollAreaStyle = {
  maxHeight: "260px",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "1px",
  paddingTop: "2px",
};

const searchInputStyle = {
  width: "100%",
  margin: "2px 0 6px",
  padding: "7px 10px",
  background: "#0e0e12",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "8px",
  color: "#e8e6e1",
  fontSize: "12.5px",
  fontFamily: "inherit",
  outline: "none",
};

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
