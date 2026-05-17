import { useState } from "react";
import Popup from "reactjs-popup";
import api from "../services/aleymApi";

const overlayStyle = {
  background: "rgba(0,0,0,0.6)",
  backdropFilter: "blur(4px)",
};

export default function DeleteSource({ trigger, onSourceDeleted }) {
  const [hoveredBtn, setHoveredBtn] = useState(null);

  const [sources, setSources] = useState([]);
  const [sourceCategoryMap, setSourceCategoryMap] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleOpen = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setSelectedIds([]);

    try {
      const [srcData, catData] = await Promise.all([
        api.sources.list(),
        api.categories.list(),
      ]);

      setSources(srcData || []);

      const catMap = {};
      await Promise.all(
        (catData || []).map(async (cat) => {
          try {
            const catSources = await api.categories.sources(cat.id);
            (catSources || []).forEach((source) => {
              catMap[source.id] = cat.name;
            });
          } catch {
            // ignore per-category errors
          }
        })
      );
      setSourceCategoryMap(catMap);
    } catch (err) {
      setError(err.message || "Failed to load sources.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((srcId) => srcId !== id) : [...prev, id]
    );
  };

  const handleExecuteDelete = async (close) => {
    if (selectedIds.length === 0) return;
    setDeleting(true);
    setError(null);
    try {
      await Promise.all(selectedIds.map((id) => api.sources.remove(id)));
      const updated = await api.sources.list();
      setSources(updated || []);
      setSelectedIds([]);
      setSuccess(true);
      if (onSourceDeleted) onSourceDeleted();
      setTimeout(() => close(), 1000);
    } catch (err) {
      setError(err.message || "An error occurred while deleting.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Popup
      trigger={trigger}
      modal
      nested
      overlayStyle={overlayStyle}
      onOpen={handleOpen}
      contentStyle={{
        background: "transparent",
        border: "none",
        padding: 0,
        width: "auto",
      }}
    >
      {(close) => (
        <div
          style={{
            background: "#1a1a22",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            padding: "32px",
            width: "420px",
            maxWidth: "90vw",
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,100,100,0.08)",
            animation: "fadeSlideUp 0.3s ease",
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: "24px" }}>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "#e8e6e1",
                margin: 0,
                marginBottom: "4px",
              }}
            >
              Delete Sources
            </h2>
            <p style={{ fontSize: "12px", color: "#5a5a6a", margin: 0 }}>
              Select one or more sources to permanently remove them.
            </p>
          </div>

          {/* Success Status */}
          {success && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "10px",
                background: "rgba(74,222,128,0.08)",
                border: "1px solid rgba(74,222,128,0.2)",
                color: "#4ade80",
                fontSize: "13px",
                fontWeight: 500,
                marginBottom: "18px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Sources deleted successfully!
            </div>
          )}

          {/* Error Status */}
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

          {/* Checklist Area */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              maxHeight: "300px",
              overflowY: "auto",
              paddingRight: "4px",
            }}
          >
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "30px 0" }}>
                <div style={{ width: "24px", height: "24px", border: "2px solid rgba(255,255,255,0.06)", borderTop: "2px solid #ff6464", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              </div>
            ) : sources.length === 0 ? (
              <p style={{ color: "#5a5a6a", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>
                No sources available to delete.
              </p>
            ) : (
              sources.map((source) => {
                const isSelected = selectedIds.includes(source.id);
                return (
                  <div
                    key={source.id}
                    onClick={() => handleToggleSelection(source.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      padding: "12px 16px",
                      borderRadius: "10px",
                      background: isSelected ? "rgba(255,100,100,0.08)" : "rgba(255,255,255,0.02)",
                      border: "1px solid",
                      borderColor: isSelected ? "rgba(255,100,100,0.2)" : "rgba(255,255,255,0.05)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {/* Custom Checkbox Box */}
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "5px",
                        border: "2px solid",
                        borderColor: isSelected ? "#ff6464" : "#5a5a6a",
                        background: isSelected ? "#ff6464" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s ease",
                        flexShrink: 0,
                      }}
                    >
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a1a22" strokeWidth="3" strokeLinecap="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {/* Status dot */}
                      <div style={{
                        width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0,
                        background: source.is_enabled ? "#4ade80" : "#ff6464",
                      }} />
                      {/* Text */}
                      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <span style={{ fontSize: "14px", fontWeight: 500, color: isSelected ? "#ff6464" : "#e8e6e1", transition: "color 0.2s ease" }}>
                          {source.name}
                        </span>
                        <span style={{ fontSize: "11px", color: "#6a6a7a" }}>
                          {sourceCategoryMap[source.id] || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Action buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "24px",
              paddingTop: "20px",
              borderTop: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <span style={{ fontSize: "12px", color: "#6a6a7a", fontWeight: 500 }}>
              {selectedIds.length} selected
            </span>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => close()}
                onMouseEnter={() => setHoveredBtn("cancel")}
                onMouseLeave={() => setHoveredBtn(null)}
                disabled={deleting}
                style={{
                  padding: "10px 24px",
                  fontSize: "14px",
                  fontWeight: 500,
                  fontFamily: "'DM Sans', sans-serif",
                  borderRadius: "10px",
                  border: "1px solid",
                  borderColor: hoveredBtn === "cancel" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
                  background: hoveredBtn === "cancel" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                  color: "#b0b0c0",
                  cursor: deleting ? "not-allowed" : "pointer",
                  transition: "all 0.15s ease",
                  opacity: deleting ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleExecuteDelete(close)}
                onMouseEnter={() => setHoveredBtn("delete")}
                onMouseLeave={() => setHoveredBtn(null)}
                disabled={deleting || success || selectedIds.length === 0}
                style={{
                  padding: "10px 28px",
                  fontSize: "14px",
                  fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                  borderRadius: "10px",
                  background: "rgba(255,100,100,0.1)",
                  color: "#ff6464",
                  cursor: (deleting || success || selectedIds.length === 0) ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  transform: hoveredBtn === "delete" && !deleting && selectedIds.length > 0 ? "translateY(-1px)" : "translateY(0)",
                  boxShadow: hoveredBtn === "delete" && !deleting && selectedIds.length > 0 ? "0 6px 24px rgba(255,100,100,0.15)" : "none",
                  border: "1px solid rgba(255,100,100,0.2)",
                  opacity: (deleting || selectedIds.length === 0) ? 0.5 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {deleting && (
                  <div
                    style={{
                      width: "14px",
                      height: "14px",
                      border: "2px solid rgba(255,100,100,0.3)",
                      borderTop: "2px solid #ff6464",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                )}
                {deleting ? "Deleting…" : "Delete Selected"}
              </button>
            </div>
          </div>

          <style>{`
            @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
            @keyframes fadeSlideUp { 0%{opacity:0; transform:translateY(10px)} 100%{opacity:1; transform:translateY(0)} }
          `}</style>
        </div>
      )}
    </Popup>
  );
}
