import { useState, useEffect } from "react";
import Sidebar, {
  SIDEBAR_WIDTH_OPEN,
  SIDEBAR_WIDTH_CLOSED,
} from "../components/Sidebar";
import AddNewSource from "../components/AddNewSource";
import NewCategory from "../components/NewCategory";
import { fetchSources, fetchCategories } from "../services/aleymApi";

// ── Edit Modal ──
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
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    async function load() {
      try {
        const catRes = await fetch("/api/categories");
        if (catRes.ok) setCategories(await catRes.json());

        const srcCatRes = await fetch(`/api/sources/${source.id}/categories`);
        if (srcCatRes.ok) {
          const cats = await srcCatRes.json();
          if (cats.length > 0) {
            setSelectedCategory(cats[0].id);
            setOriginalCategoryId(cats[0].id);
          }
        }
      } catch {}
    }
    load();
  }, [source.id]);

  const handleSave = async () => {
    if (!name.trim()) { setError("Source name is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/sources/${source.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          network,
          is_enabled: isEnabled,
        }),
      });
      if (!res.ok) { const t = await res.text(); throw new Error(t || `Error: ${res.status}`); }

      if (selectedCategory !== originalCategoryId) {
        if (originalCategoryId) {
          await fetch(`/api/sources/${source.id}/categories/${originalCategoryId}`, { method: "DELETE" }).catch(() => {});
        }
        if (selectedCategory) {
          await fetch(`/api/sources/${source.id}/categories/${selectedCategory}`, { method: "POST" }).catch(() => {});
        }
      }

      setSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => onClose(), 800);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px", fontSize: "14px",
    fontFamily: "'DM Sans', sans-serif", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px",
    color: "#e8e6e1", outline: "none", boxSizing: "border-box",
  };
  const selectStyle = {
    ...inputStyle, appearance: "none", cursor: "pointer", paddingRight: "36px",
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236a6a7a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
  };
  const label = { fontSize: "13px", fontWeight: 500, color: "#b0b0c0", marginBottom: "6px", display: "block" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.2s ease" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#1a1a22", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "32px", width: "420px", maxWidth: "90vw", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 24px 80px rgba(0,0,0,0.5)", animation: "fadeSlideUp 0.3s ease" }}>
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#e8e6e1", margin: 0 }}>Edit Source</h2>
          <p style={{ fontSize: "12px", color: "#5a5a6a", margin: "4px 0 0" }}>Update source configuration</p>
        </div>

        {success && <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80", fontSize: "13px", marginBottom: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
          Source updated!
        </div>}
        {error && <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(255,100,100,0.08)", border: "1px solid rgba(255,100,100,0.2)", color: "#ff6464", fontSize: "13px", marginBottom: "18px" }}>{error}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div><label style={label}>Source Name *</label><input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} onFocus={(e) => (e.target.style.borderColor = "rgba(199,146,234,0.4)")} onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")} /></div>

          <div><label style={label}>Description</label><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" style={inputStyle} onFocus={(e) => (e.target.style.borderColor = "rgba(199,146,234,0.4)")} onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")} /></div>

          <div><label style={label}>Network</label><select value={network} onChange={(e) => setNetwork(e.target.value)} style={selectStyle}><option value="Clear">Clear Net</option><option value="Tor">Tor</option></select></div>

          <div>
            <label style={label}>Category</label>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={selectStyle}>
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={label}>Status</label>
            <div onClick={() => setIsEnabled(!isEnabled)} style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", padding: "10px 14px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ width: "40px", height: "22px", borderRadius: "11px", background: isEnabled ? "linear-gradient(135deg, #c792ea, #82aaff)" : "rgba(255,255,255,0.1)", position: "relative", transition: "background 0.2s ease", flexShrink: 0 }}>
                <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#e8e6e1", position: "absolute", top: "2px", left: isEnabled ? "20px" : "2px", transition: "left 0.2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
              </div>
              <span style={{ fontSize: "14px", color: isEnabled ? "#4ade80" : "#6a6a7a" }}>{isEnabled ? "Active" : "Disabled"}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <button onClick={onClose} disabled={saving} onMouseEnter={() => setHoveredBtn("c")} onMouseLeave={() => setHoveredBtn(null)} style={{ padding: "10px 24px", fontSize: "14px", fontWeight: 500, fontFamily: "'DM Sans', sans-serif", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", background: hoveredBtn === "c" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)", color: "#b0b0c0", cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || success} onMouseEnter={() => setHoveredBtn("s")} onMouseLeave={() => setHoveredBtn(null)} style={{ padding: "10px 28px", fontSize: "14px", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #c792ea, #82aaff)", color: "#0e0e12", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, transform: hoveredBtn === "s" && !saving ? "translateY(-1px)" : "none", boxShadow: hoveredBtn === "s" && !saving ? "0 6px 24px rgba(199,146,234,0.3)" : "none" }}>{saving ? "Saving…" : "Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──
export default function SourcesManagement({ navigateTo }) {
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

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEnableTransition(true));
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const srcData = await fetchSources();
      setSources(srcData);
      const catMap = {};
      await Promise.all(
        srcData.map(async (source) => {
          try {
            const res = await fetch(`/api/sources/${source.id}/categories`);
            if (res.ok) {
              const cats = await res.json();
              catMap[source.id] = cats.map((c) => c.name).join(", ") || "—";
            } else { catMap[source.id] = "—"; }
          } catch { catMap[source.id] = "—"; }
        })
      );
      setSourceCategoryMap(catMap);
    } catch (err) { setError(err.message || "Failed to load sources"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (sourceId) => {
    if (!confirm("Are you sure you want to delete this source?")) return;
    setDeletingId(sourceId);
    try {
      const res = await fetch(`/api/sources/${sourceId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      await loadData();
    } catch (err) { alert("Failed to delete source: " + err.message); }
    finally { setDeletingId(null); }
  };

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
        <div style={{ padding: "60px", width: "100%", boxSizing: "border-box" }}>
          {/* Page heading */}
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

          {/* Section header with action buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "48px",
              marginBottom: "32px",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px", height: "36px", borderRadius: "10px",
                  background: "linear-gradient(135deg, rgba(199,146,234,0.12), rgba(130,170,255,0.12))",
                  border: "1px solid rgba(199,146,234,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c792ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
              </div>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#e8e6e1", margin: 0 }}>
                  Your Sources
                </h2>
                <p style={{ fontSize: "12px", color: "#5a5a6a", margin: "2px 0 0" }}>
                  {sources.length} source{sources.length !== 1 ? "s" : ""} configured
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <AddNewSource
                trigger={
                  <button
                    style={{
                      padding: "10px 20px", fontSize: "13px", fontWeight: 600,
                      fontFamily: "'DM Sans', sans-serif", borderRadius: "10px",
                      border: "none", background: "linear-gradient(135deg, #c792ea, #82aaff)",
                      color: "#0e0e12", cursor: "pointer", transition: "all 0.2s ease",
                      display: "flex", alignItems: "center", gap: "8px",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add Source
                  </button>
                }
                onSourceAdded={loadData}
              />
              <NewCategory
                trigger={
                  <button
                    style={{
                      padding: "10px 20px", fontSize: "13px", fontWeight: 500,
                      fontFamily: "'DM Sans', sans-serif", borderRadius: "10px",
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.04)", color: "#b0b0c0",
                      cursor: "pointer", transition: "all 0.2s ease",
                      display: "flex", alignItems: "center", gap: "8px",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add Category
                  </button>
                }
                onCategoryAdded={loadData}
              />
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 20px", gap: "16px" }}>
              <div style={{ width: "40px", height: "40px", border: "3px solid rgba(255,255,255,0.06)", borderTop: "3px solid #c792ea", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <p style={{ color: "#5a5a6a", fontSize: "13px", margin: 0 }}>Loading sources…</p>
              <style>{`@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`}</style>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <p style={{ color: "#ff6464", fontSize: "15px", fontWeight: 500 }}>Unable to load sources</p>
              <p style={{ color: "#5a5a6a", fontSize: "13px" }}>{error}</p>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && sources.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <p style={{ color: "#5a5a6a", fontSize: "15px" }}>No sources yet. Click "Add Source" to get started.</p>
            </div>
          )}

          {/* Sources as cards */}
          {!loading && !error && sources.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {sources.map((source) => {
                const isHovered = hoveredRow === source.id;
                return (
                  <div
                    key={source.id}
                    onMouseEnter={() => setHoveredRow(source.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      background: isHovered
                        ? "linear-gradient(135deg, rgba(199,146,234,0.04), rgba(130,170,255,0.04))"
                        : "rgba(255,255,255,0.02)",
                      border: "1px solid",
                      borderColor: isHovered ? "rgba(199,146,234,0.15)" : "rgba(255,255,255,0.06)",
                      borderRadius: "14px",
                      padding: "20px 24px",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "20px",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
                        <div style={{
                          width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
                          background: source.is_enabled ? "#4ade80" : "#ff6464",
                          boxShadow: source.is_enabled ? "0 0 6px rgba(74,222,128,0.4)" : "0 0 6px rgba(255,100,100,0.4)",
                        }} />
                        <span style={{ fontSize: "15px", fontWeight: 600, color: "#e8e6e1" }}>
                          {source.name}
                        </span>
                        <span style={{
                          fontSize: "10px", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase",
                          padding: "2px 8px", borderRadius: "5px",
                          background: source.networktype === "Tor" ? "rgba(199,146,234,0.1)" : "rgba(130,170,255,0.1)",
                          color: source.networktype === "Tor" ? "#c792ea" : "#82aaff",
                          border: `1px solid ${source.networktype === "Tor" ? "rgba(199,146,234,0.15)" : "rgba(130,170,255,0.15)"}`,
                        }}>
                          {source.networktype || "Clear"}
                        </span>
                        {sourceCategoryMap[source.id] && sourceCategoryMap[source.id] !== "—" && (
                          <span style={{
                            fontSize: "10px", fontWeight: 500, padding: "2px 8px", borderRadius: "5px",
                            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                            color: "#6a6a7a",
                          }}>
                            {sourceCategoryMap[source.id]}
                          </span>
                        )}
                      </div>
                      {source.description && (
                        <p style={{ fontSize: "12px", color: "#5a5a6a", margin: 0, paddingLeft: "18px" }}>
                          {source.description}
                        </p>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                      <button
                        onClick={() => setEditingSource(source)}
                        style={{
                          padding: "7px 16px", fontSize: "12px", fontWeight: 500,
                          fontFamily: "'DM Sans', sans-serif", borderRadius: "8px",
                          border: "1px solid rgba(130,170,255,0.15)",
                          background: isHovered ? "rgba(130,170,255,0.1)" : "rgba(130,170,255,0.05)",
                          color: "#82aaff", cursor: "pointer", transition: "all 0.15s ease",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(source.id)}
                        disabled={deletingId === source.id}
                        style={{
                          padding: "7px 16px", fontSize: "12px", fontWeight: 500,
                          fontFamily: "'DM Sans', sans-serif", borderRadius: "8px",
                          border: "1px solid rgba(255,100,100,0.15)",
                          background: isHovered ? "rgba(255,100,100,0.1)" : "rgba(255,100,100,0.05)",
                          color: "#ff6464", cursor: deletingId === source.id ? "not-allowed" : "pointer",
                          transition: "all 0.15s ease", opacity: deletingId === source.id ? 0.5 : 1,
                        }}
                      >
                        {deletingId === source.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editingSource && (
        <EditSourceModal
          source={editingSource}
          onClose={() => setEditingSource(null)}
          onSaved={loadData}
        />
      )}
    </>
  );
}