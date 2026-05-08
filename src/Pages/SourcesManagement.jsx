// WITH DELETE CATEGORY

import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import Sidebar, {
  SIDEBAR_WIDTH_OPEN,
  SIDEBAR_WIDTH_CLOSED,
} from "../components/Sidebar";
import AddNewSource from "../components/AddNewSource";
import NewCategory from "../components/NewCategory";
import DeleteCategory from "../components/DeleteCategory";
import api from "../services/aleymApi";
import { useData } from "../contexts/DataContext";

function EditSourceModal({ source, onClose, onSaved }) {
  const [name, setName] = useState(source.name || "");
  const [description, setDescription] = useState(source.description || "");
  const [network, setNetwork] = useState(source.networktype || "Clear");
  const [isEnabled, setIsEnabled] = useState(source.is_enabled ?? true);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [originalCategoryId, setOriginalCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [cats, srcCats] = await Promise.all([
          api.categories.list(),
          api.sources.categories(source.id),
        ]);
        if (!alive) return;
        setCategories(cats || []);
        if (srcCats && srcCats.length > 0) {
          setSelectedCategory(srcCats[0].id);
          setOriginalCategoryId(srcCats[0].id);
        }
      } catch (err) {
        console.warn("Failed to load category data:", err);
      }
    }
    load();
    return () => { alive = false; };
  }, [source.id]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Source name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.sources.update(source.id, {
        name: name.trim(),
        description: description.trim() || null,
        network,
        is_enabled: isEnabled,
      });

      if (selectedCategory !== originalCategoryId) {
        if (originalCategoryId) {
          await api.sources
            .unlinkCategory(source.id, originalCategoryId)
            .catch((err) => console.warn("Failed to unlink old category:", err));
        }
        if (selectedCategory) {
          await api.sources
            .linkCategory(source.id, selectedCategory)
            .catch((err) => console.warn("Failed to link new category:", err));
        }
      }
      setSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => onClose(), 800);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    fontSize: "14px",
    fontFamily: "'DM Sans', sans-serif",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px",
    color: "#e8e6e1",
    outline: "none",
    boxSizing: "border-box",
  };
  const selectStyle = {
    ...inputStyle,
    appearance: "none",
    cursor: "pointer",
    paddingRight: "36px",
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236a6a7a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
  };
  const label = {
    fontSize: "13px",
    fontWeight: 500,
    color: "#b0b0c0",
    marginBottom: "6px",
    display: "block",
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1a1a22",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px",
          padding: "32px",
          width: "420px",
          maxWidth: "90vw",
          fontFamily: "'DM Sans', sans-serif",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
          animation: "fadeSlideUp 0.3s ease",
        }}
      >
        <div style={{ marginBottom: "24px" }}>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#e8e6e1",
              margin: 0,
            }}
          >
            Edit Source
          </h2>
          <p style={{ fontSize: "12px", color: "#5a5a6a", margin: "4px 0 0" }}>
            Update source configuration
          </p>
        </div>
        {success && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "10px",
              background: "rgba(74,222,128,0.08)",
              border: "1px solid rgba(74,222,128,0.2)",
              color: "#4ade80",
              fontSize: "13px",
              marginBottom: "18px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
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
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Source updated!
          </div>
        )}
        {error && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "10px",
              background: "rgba(255,100,100,0.08)",
              border: "1px solid rgba(255,100,100,0.2)",
              color: "#ff6464",
              fontSize: "13px",
              marginBottom: "18px",
            }}
          >
            {error}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={label}>Source Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              onFocus={(e) =>
                (e.target.style.borderColor = "rgba(199,146,234,0.4)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(255,255,255,0.08)")
              }
            />
          </div>
          <div>
            <label style={label}>Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              style={inputStyle}
              onFocus={(e) =>
                (e.target.style.borderColor = "rgba(199,146,234,0.4)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(255,255,255,0.08)")
              }
            />
          </div>
          <div>
            <label style={label}>Network</label>
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              style={selectStyle}
            >
              <option value="Clear">Clear Net</option>
              <option value="Tor">Tor</option>
            </select>
          </div>
          <div>
            <label style={label}>Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={selectStyle}
            >
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>Status</label>
            <div
              onClick={() => setIsEnabled(!isEnabled)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                cursor: "pointer",
                padding: "10px 14px",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "22px",
                  borderRadius: "11px",
                  background: isEnabled
                    ? "linear-gradient(135deg, #c792ea, #82aaff)"
                    : "rgba(255,255,255,0.1)",
                  position: "relative",
                  transition: "background 0.2s ease",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: "#e8e6e1",
                    position: "absolute",
                    top: "2px",
                    left: isEnabled ? "20px" : "2px",
                    transition: "left 0.2s ease",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: "14px",
                  color: isEnabled ? "#4ade80" : "#6a6a7a",
                }}
              >
                {isEnabled ? "Active" : "Disabled"}
              </span>
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            marginTop: "24px",
            paddingTop: "20px",
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <button
            onClick={onClose}
            disabled={saving}
            onMouseEnter={() => setHoveredBtn("c")}
            onMouseLeave={() => setHoveredBtn(null)}
            style={{
              padding: "10px 24px",
              fontSize: "14px",
              fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                hoveredBtn === "c"
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(255,255,255,0.03)",
              color: "#b0b0c0",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || success}
            onMouseEnter={() => setHoveredBtn("s")}
            onMouseLeave={() => setHoveredBtn(null)}
            style={{
              padding: "10px 28px",
              fontSize: "14px",
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #c792ea, #82aaff)",
              color: "#0e0e12",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
              transform:
                hoveredBtn === "s" && !saving ? "translateY(-1px)" : "none",
              boxShadow:
                hoveredBtn === "s" && !saving
                  ? "0 6px 24px rgba(199,146,234,0.3)"
                  : "none",
            }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RowActions({ source, onEdit, onDelete, isDeleting }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        btnRef.current &&
        !btnRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const reposition = () => {
      const rect = btnRef.current.getBoundingClientRect();
      const menuHeight = 90;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < menuHeight + 8;
      setMenuPos({
        top: openUpward ? rect.top - menuHeight - 4 : rect.bottom + 4,
        left: rect.right - 140,
      });
    };
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const menuHeight = 90;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < menuHeight + 8;
      setMenuPos({
        top: openUpward ? rect.top - menuHeight - 4 : rect.bottom + 4,
        left: rect.right - 140,
      });
    }
    setOpen((v) => !v);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        style={{
          background: open ? "rgba(255,255,255,0.06)" : "transparent",
          border: "none",
          borderRadius: "6px",
          padding: "4px 6px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "rgba(255,255,255,0.06)")
        }
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = "transparent";
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#6a6a7a">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {open &&
        ReactDOM.createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              background: "#1e1e28",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "10px",
              padding: "4px",
              minWidth: "140px",
              zIndex: 9999,
              boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
              animation: "fadeIn 0.12s ease",
            }}
          >
            <button
              onClick={() => {
                setOpen(false);
                onEdit(source);
              }}
              onMouseEnter={() => setHovered("edit")}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                padding: "8px 12px",
                fontSize: "13px",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
                color: "#b0b0c0",
                background:
                  hovered === "edit" ? "rgba(255,255,255,0.05)" : "transparent",
                border: "none",
                borderRadius: "7px",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#82aaff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
            <button
              onClick={() => {
                setOpen(false);
                onDelete(source.id);
              }}
              disabled={isDeleting}
              onMouseEnter={() => setHovered("del")}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                padding: "8px 12px",
                fontSize: "13px",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
                color: "#ff6464",
                background:
                  hovered === "del" ? "rgba(255,100,100,0.06)" : "transparent",
                border: "none",
                borderRadius: "7px",
                cursor: isDeleting ? "not-allowed" : "pointer",
                textAlign: "left",
                opacity: isDeleting ? 0.5 : 1,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ff6464"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}

function StatsBar({ sources }) {
  const total = sources.length;
  const active = sources.filter((s) => s.is_enabled).length;
  const disabled = total - active;
  const torCount = sources.filter((s) => s.networktype === "Tor").length;
  const clearCount = sources.filter(
    (s) => !s.networktype || s.networktype === "Clear",
  ).length;

  const stats = [
    { label: "Total", value: total, color: "#e8e6e1" },
    { label: "Active", value: active, color: "#4ade80" },
    { label: "Disabled", value: disabled, color: "#ff6464" },
    { label: "Clear Net", value: clearCount, color: "#82aaff" },
    { label: "Tor", value: torCount, color: "#c792ea" },
  ];

  return (
    <div>
      <h3
        style={{
          fontSize: "14px",
          fontWeight: 600,
          color: "#b0b0c0",
          margin: "0 0 12px 0",
          letterSpacing: "0.3px",
        }}
      >
        Sources Summary
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "1px",
          background: "rgba(255,255,255,0.04)",
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              padding: "16px 20px",
              background: "#0e0e12",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "#5a5a6a",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
              }}
            >
              {s.label}
            </span>
            <span
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: s.color,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SourcesManagement({ navigateTo }) {
  const { refreshAll } = useData();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [enableTransition, setEnableTransition] = useState(false);

  const [sources, setSources] = useState([]);
  const [sourceCategoryMap, setSourceCategoryMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [editingSource, setEditingSource] = useState(null);
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEnableTransition(true));
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleRefresh = async () => {
    await loadData();
    refreshAll();                            
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const srcData = await api.sources.list();
      setSources(srcData || []);

      const catMap = {};
      await Promise.all(
        (srcData || []).map(async (source) => {
          try {
            const cats = await api.sources.categories(source.id);
            catMap[source.id] = (cats || []).map((c) => c.name).join(", ") || "—";
          } catch {
            catMap[source.id] = "—";
          }
        }),
      );
      setSourceCategoryMap(catMap);
    } catch (err) {
      setError(err.message || "Failed to load sources");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (sourceId) => {
    if (!confirm("Are you sure you want to delete this source?")) return;
    setDeletingId(sourceId);
    try {
      await api.sources.remove(sourceId);
      await loadData();
    } catch (err) {
      alert("Failed to delete source: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const processed = sources
    .map((s, i) => ({ ...s, _originalIndex: i }))
    .filter((s) => {
      if (filterStatus === "active" && !s.is_enabled) return false;
      if (filterStatus === "disabled" && s.is_enabled) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (s.name || "").toLowerCase().includes(q);
        const descMatch = (s.description || "").toLowerCase().includes(q);
        const catMatch = (sourceCategoryMap[s.id] || "")
          .toLowerCase()
          .includes(q);
        if (!nameMatch && !descMatch && !catMatch) return false;
      }
      return true;
    })
    .sort((a, b) => {
      let av, bv;
      if (sortField === "number") {
        av = a._originalIndex;
        bv = b._originalIndex;
      } else if (sortField === "name") {
        av = a.name?.toLowerCase() || "";
        bv = b.name?.toLowerCase() || "";
      } else if (sortField === "network") {
        av = a.networktype || "";
        bv = b.networktype || "";
      } else if (sortField === "status") {
        av = a.is_enabled ? 1 : 0;
        bv = b.is_enabled ? 1 : 0;
      } else if (sortField === "category") {
        av = sourceCategoryMap[a.id] || "";
        bv = sourceCategoryMap[b.id] || "";
      } else {
        av = "";
        bv = "";
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field)
      return (
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          style={{ opacity: 0.3, marginLeft: "4px" }}
        >
          <path d="M5 2L8 5H2L5 2Z" fill="#6a6a7a" />
          <path d="M5 8L2 5H8L5 8Z" fill="#6a6a7a" />
        </svg>
      );
    return (
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        style={{ marginLeft: "4px" }}
      >
        <path
          d={sortDir === "asc" ? "M5 2L8 6H2L5 2Z" : "M5 8L2 4H8L5 8Z"}
          fill="#c792ea"
        />
      </svg>
    );
  };

  const marginLeft = sidebarOpen ? SIDEBAR_WIDTH_OPEN : SIDEBAR_WIDTH_CLOSED;

  const thStyle = {
    padding: "12px 16px",
    fontSize: "11px",
    fontWeight: 600,
    color: "#5a5a6a",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    textAlign: "left",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(255,255,255,0.02)",
  };

  const filterBtnStyle = (active) => ({
    padding: "6px 14px",
    fontSize: "12px",
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: "8px",
    border: active
      ? "1px solid rgba(199,146,234,0.25)"
      : "1px solid rgba(255,255,255,0.06)",
    background: active ? "rgba(199,146,234,0.08)" : "transparent",
    color: active ? "#c792ea" : "#5a5a6a",
    cursor: "pointer",
    transition: "all 0.15s ease",
  });

  return (
    <>
      <Sidebar
        open={sidebarOpen}
        setOpen={(val) => {
          const newVal = typeof val === "function" ? val(sidebarOpen) : val;
          localStorage.setItem("sidebarOpen", JSON.stringify(newVal));
          setSidebarOpen(newVal);
        }}
        navigateTo={navigateTo}
        disableTransition={!enableTransition}
      />

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
        <div
          style={{ padding: "60px", width: "100%", boxSizing: "border-box" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "clamp(32px, 4vw, 48px)",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 700,
                  lineHeight: 1.1,
                  margin: 0,
                  color: "#e8e6e1",
                  letterSpacing: "-0.5px",
                }}
              >
                Sources Management
              </h1>
              <p
                style={{
                  fontSize: "14px",
                  color: "#5a5a6a",
                  margin: "8px 0 0",
                }}
              >
                Manage and monitor your sources
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <DeleteCategory
                trigger={
                  <button
                    style={{
                      padding: "10px 20px",
                      fontSize: "13px",
                      fontWeight: 500,
                      fontFamily: "'DM Sans', sans-serif",
                      borderRadius: "10px",
                      border: "1px solid rgba(255,100,100,0.2)",
                      background: "rgba(255,100,100,0.05)",
                      color: "#ff6464",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                    Delete Category
                  </button>
                }
                onCategoryDeleted={handleRefresh}
              />

              <NewCategory
                trigger={
                  <button
                    style={{
                      padding: "10px 20px",
                      fontSize: "13px",
                      fontWeight: 500,
                      fontFamily: "'DM Sans', sans-serif",
                      borderRadius: "10px",
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.04)",
                      color: "#b0b0c0",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add Category
                  </button>
                }
                onCategoryAdded={handleRefresh}
              />

              <AddNewSource
                trigger={
                  <button
                    style={{
                      padding: "10px 20px",
                      fontSize: "13px",
                      fontWeight: 600,
                      fontFamily: "'DM Sans', sans-serif",
                      borderRadius: "10px",
                      border: "none",
                      background: "linear-gradient(135deg, #c792ea, #82aaff)",
                      color: "#0e0e12",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add Source
                  </button>
                }
                onSourceAdded={handleRefresh}
              />
            </div>
          </div>

          {!loading && !error && sources.length > 0 && (
            <div style={{ marginTop: "36px" }}>
              <StatsBar sources={sources} />
            </div>
          )}

          {!loading && !error && sources.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: "32px",
                marginBottom: "16px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div
                style={{ display: "flex", gap: "6px", alignItems: "center" }}
              >
                {["all", "active", "disabled"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterStatus(f)}
                    style={filterBtnStyle(filterStatus === f)}
                  >
                    {f === "all"
                      ? "All"
                      : f === "active"
                        ? "Active"
                        : "Disabled"}
                  </button>
                ))}
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <div style={{ position: "relative" }}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#5a5a6a"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                    }}
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search sources…"
                    style={{
                      padding: "8px 12px 8px 34px",
                      fontSize: "13px",
                      fontFamily: "'DM Sans', sans-serif",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: "8px",
                      color: "#e8e6e1",
                      outline: "none",
                      width: "200px",
                      transition: "border-color 0.15s ease",
                    }}
                    onFocus={(e) =>
                      (e.target.style.borderColor = "rgba(199,146,234,0.3)")
                    }
                    onBlur={(e) =>
                      (e.target.style.borderColor = "rgba(255,255,255,0.06)")
                    }
                  />
                </div>
                <span
                  style={{
                    fontSize: "12px",
                    color: "#5a5a6a",
                    whiteSpace: "nowrap",
                  }}
                >
                  {processed.length} of {sources.length} source
                  {sources.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          )}

          {loading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "80px 20px",
                gap: "16px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  border: "3px solid rgba(255,255,255,0.06)",
                  borderTop: "3px solid #c792ea",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <p style={{ color: "#5a5a6a", fontSize: "13px", margin: 0 }}>
                Loading sources…
              </p>
              <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {!loading && error && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <p
                style={{ color: "#ff6464", fontSize: "15px", fontWeight: 500 }}
              >
                Unable to load sources
              </p>
              <p style={{ color: "#5a5a6a", fontSize: "13px" }}>{error}</p>
            </div>
          )}

          {!loading && !error && sources.length === 0 && (
            <div style={{ textAlign: "center", padding: "80px 20px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "14px",
                  margin: "0 auto 16px",
                  background:
                    "linear-gradient(135deg, rgba(199,146,234,0.08), rgba(130,170,255,0.08))",
                  border: "1px solid rgba(199,146,234,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#5a5a6a"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
              </div>
              <p style={{ color: "#5a5a6a", fontSize: "15px", margin: 0 }}>
                No sources yet
              </p>
              <p
                style={{
                  color: "#3a3a4a",
                  fontSize: "13px",
                  margin: "6px 0 0",
                }}
              >
                Click "Add Source" to get started.
              </p>
            </div>
          )}

          {!loading && !error && sources.length > 0 && (
            <div
              style={{
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.06)",
                overflow: "hidden",
                background: "rgba(255,255,255,0.01)",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <thead>
                  <tr>
                    <th
                      onClick={() => handleSort("number")}
                      style={{
                        ...thStyle,
                        width: "50px",
                        textAlign: "center",
                      }}
                    >
                      <span
                        style={{ display: "inline-flex", alignItems: "center" }}
                      >
                        Number
                        <SortIcon field="number" />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort("status")}
                      style={{ ...thStyle, width: "70px", textAlign: "center" }}
                    >
                      <span
                        style={{ display: "inline-flex", alignItems: "center" }}
                      >
                        Status
                        <SortIcon field="status" />
                      </span>
                    </th>
                    <th onClick={() => handleSort("name")} style={thStyle}>
                      <span
                        style={{ display: "inline-flex", alignItems: "center" }}
                      >
                        Source
                        <SortIcon field="name" />
                      </span>
                    </th>
                    <th style={{ ...thStyle, cursor: "default" }}>
                      <span>Description</span>
                    </th>
                    <th
                      onClick={() => handleSort("network")}
                      style={{ ...thStyle, width: "120px" }}
                    >
                      <span
                        style={{ display: "inline-flex", alignItems: "center" }}
                      >
                        Network
                        <SortIcon field="network" />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort("category")}
                      style={{ ...thStyle, width: "160px" }}
                    >
                      <span
                        style={{ display: "inline-flex", alignItems: "center" }}
                      >
                        Category
                        <SortIcon field="category" />
                      </span>
                    </th>
                    <th
                      style={{ ...thStyle, width: "50px", cursor: "default" }}
                    ></th>
                  </tr>
                </thead>
                <tbody>
                  {processed.map((source) => {
                    const isHovered = hoveredRow === source.id;
                    return (
                      <tr
                        key={source.id}
                        onMouseEnter={() => setHoveredRow(source.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{
                          background: isHovered
                            ? "rgba(199,146,234,0.03)"
                            : "transparent",
                          transition: "background 0.15s ease",
                        }}
                      >
                        <td
                          style={{
                            padding: "14px 16px",
                            textAlign: "center",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                            fontSize: "12px",
                            fontWeight: 500,
                            color: "#5a5a6a",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {source._originalIndex + 1}
                        </td>
                        <td
                          style={{
                            padding: "14px 16px",
                            textAlign: "center",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                          }}
                        >
                          <div
                            title={source.is_enabled ? "Enabled" : "Disabled"}
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              margin: "0 auto",
                              cursor: "default",
                              background: source.is_enabled
                                ? "#4ade80"
                                : "#ff6464",
                              boxShadow: source.is_enabled
                                ? "0 0 6px rgba(74,222,128,0.4)"
                                : "0 0 6px rgba(255,100,100,0.4)",
                            }}
                          />
                        </td>
                        <td
                          style={{
                            padding: "14px 16px",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: 600,
                              color: "#e8e6e1",
                            }}
                          >
                            {source.name}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "14px 16px",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                          }}
                        >
                          {source.description ? (
                            <span
                              title={
                                source.description.length > 120
                                  ? source.description
                                  : undefined
                              }
                              style={{
                                fontSize: "12px",
                                color: "#6a6a7a",
                                display: "block",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {source.description.length > 120
                                ? source.description.slice(0, 120) + "…"
                                : source.description}
                            </span>
                          ) : (
                            <span
                              style={{ fontSize: "12px", color: "#3a3a4a" }}
                            >
                              —
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "14px 16px",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 600,
                              letterSpacing: "0.8px",
                              textTransform: "uppercase",
                              padding: "3px 10px",
                              borderRadius: "6px",
                              background:
                                source.networktype === "Tor"
                                  ? "rgba(199,146,234,0.1)"
                                  : "rgba(130,170,255,0.1)",
                              color:
                                source.networktype === "Tor"
                                  ? "#c792ea"
                                  : "#82aaff",
                              border: `1px solid ${source.networktype === "Tor" ? "rgba(199,146,234,0.15)" : "rgba(130,170,255,0.15)"}`,
                            }}
                          >
                            {source.networktype || "Clear"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "14px 16px",
                            fontSize: "13px",
                            color:
                              sourceCategoryMap[source.id] &&
                              sourceCategoryMap[source.id] !== "—"
                                ? "#b0b0c0"
                                : "#3a3a4a",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                          }}
                        >
                          {sourceCategoryMap[source.id] || "—"}
                        </td>
                        <td
                          style={{
                            padding: "14px 16px",
                            textAlign: "center",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                          }}
                        >
                          <RowActions
                            source={source}
                            onEdit={setEditingSource}
                            onDelete={handleDelete}
                            isDeleting={deletingId === source.id}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editingSource && (
        <EditSourceModal
          source={editingSource}
          onClose={() => setEditingSource(null)}
          onSaved={handleRefresh}
        />
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </>
  );
}