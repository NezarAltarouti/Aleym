import { useState, useEffect } from "react";
import { fetchSources, fetchCategories } from "../services/aleymApi";



export default function SourceTable({ refreshKey }) {
  const [sources, setSources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [sourceCategoryMap, setSourceCategoryMap] = useState({});

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [srcData, catData] = await Promise.all([
        fetchSources(),
        fetchCategories(),
      ]);
      setSources(srcData);
      setCategories(catData);

      const catMap = {};
      await Promise.all(
        srcData.map(async (source) => {
          try {
            const res = await fetch(`/api/sources/${source.id}/categories`);
            if (res.ok) {
              const cats = await res.json();
              catMap[source.id] = cats.map((c) => c.name).join(", ") || "—";
            } else {
              catMap[source.id] = "—";
            }
          } catch {
            catMap[source.id] = "—";
          }
        })
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
  }, [refreshKey]);

  const handleDelete = async (sourceId) => {
    if (!confirm("Are you sure you want to delete this source?")) return;
    setDeletingId(sourceId);
    try {
      const res = await fetch(`/api/sources/${sourceId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      await loadData();
    } catch (err) {
      alert("Failed to delete source: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "60px 20px",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            border: "3px solid rgba(255,255,255,0.06)",
            borderTop: "3px solid #c792ea",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p style={{ color: "#5a5a6a", fontSize: "13px", margin: 0 }}>
          Loading sources…
        </p>
        <style>{`@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <p style={{ color: "#ff6464", fontSize: "14px" }}>{error}</p>
        <p style={{ color: "#5a5a6a", fontSize: "13px" }}>
          Make sure the Aleym API is running.
        </p>
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <p style={{ color: "#5a5a6a", fontSize: "15px" }}>
          No sources yet. Add one using the button on the left.
        </p>
      </div>
    );
  }

  const tableStyle = {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "16px",
    overflow: "hidden",
    backdropFilter: "blur(8px)",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
    fontSize: "14px",
    marginTop: "51px",
  };

  const thStyle = {
    textAlign: "center",
    padding: "18px 20px",
    color: "#000000",
    fontWeight: 600,
    letterSpacing: "0.5px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  };

  const tdStyle = {
    padding: "18px 20px",
    color: "#d4d4d8",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    textAlign: "center",
  };

  return (
    <table style={tableStyle}>
      <thead>
        <tr style={{ background: "linear-gradient(135deg, #c792ea, #82aaff)" }}>
          <th style={thStyle}>Source Name</th>
          <th style={thStyle}>Network</th>
          <th style={thStyle}>Enabled</th>
          <th style={thStyle}>Categories</th>
          <th style={thStyle}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {sources.map((source) => (
          <tr
            key={source.id}
            onMouseEnter={() => setHoveredRow(source.id)}
            onMouseLeave={() => setHoveredRow(null)}
            style={{
              transition: "all 0.2s ease",
              background:
                hoveredRow === source.id
                  ? "rgba(130, 170, 255, 0.06)"
                  : "transparent",
              transform:
                hoveredRow === source.id ? "scale(1.01)" : "scale(1)",
            }}
          >
            <td style={tdStyle}>
              <div>
                <div style={{ fontWeight: 500, color: "#e8e6e1" }}>
                  {source.name}
                </div>
                {source.description && (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#5a5a6a",
                      marginTop: "2px",
                    }}
                  >
                    {source.description}
                  </div>
                )}
              </div>
            </td>
            <td style={tdStyle}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  padding: "3px 10px",
                  borderRadius: "6px",
                  background:
                    source.networktype === "Tor"
                      ? "rgba(199,146,234,0.1)"
                      : "rgba(130,170,255,0.1)",
                  color:
                    source.networktype === "Tor" ? "#c792ea" : "#82aaff",
                  border: `1px solid ${
                    source.networktype === "Tor"
                      ? "rgba(199,146,234,0.15)"
                      : "rgba(130,170,255,0.15)"
                  }`,
                }}
              >
                {source.networktype || "Clear"}
              </span>
            </td>
            <td style={tdStyle}>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  display: "inline-block",
                  background: source.is_enabled ? "#4ade80" : "#ff6464",
                  boxShadow: source.is_enabled
                    ? "0 0 6px rgba(74,222,128,0.4)"
                    : "0 0 6px rgba(255,100,100,0.4)",
                }}
              />
            </td>
            <td style={tdStyle}>{sourceCategoryMap[source.id] || "—"}</td>
            <td style={tdStyle}>
              <button
                onClick={() => handleDelete(source.id)}
                disabled={deletingId === source.id}
                style={{
                  padding: "6px 14px",
                  fontSize: "12px",
                  fontWeight: 500,
                  fontFamily: "'DM Sans', sans-serif",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,100,100,0.15)",
                  background:
                    hoveredRow === source.id
                      ? "rgba(255,100,100,0.1)"
                      : "rgba(255,100,100,0.05)",
                  color: "#ff6464",
                  cursor:
                    deletingId === source.id ? "not-allowed" : "pointer",
                  transition: "all 0.15s ease",
                  opacity: deletingId === source.id ? 0.5 : 1,
                }}
              >
                {deletingId === source.id ? "Deleting…" : "Delete"}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}