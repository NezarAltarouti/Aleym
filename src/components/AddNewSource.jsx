import { useState, useEffect } from "react";
import Popup from "reactjs-popup";
import api from "../services/aleymApi";

const overlayStyle = {
  background: "rgba(0,0,0,0.6)",
  backdropFilter: "blur(4px)",
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
  transition: "border-color 0.2s ease",
  boxSizing: "border-box",
};

const selectStyle = {
  ...inputStyle,
  appearance: "none",
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236a6a7a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  paddingRight: "36px",
  cursor: "pointer",
};

const labelStyle = {
  fontSize: "13px",
  fontWeight: 500,
  color: "#b0b0c0",
  marginBottom: "6px",
  display: "block",
};

const fieldGroupStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

export default function AddNewSource({ trigger, onSourceAdded }) {
  const [hoveredBtn, setHoveredBtn] = useState(null);
  const [categories, setCategories] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [network, setNetwork] = useState("Clear");
  const [fetcher, setFetcher] = useState("FeedRs");
  const [description, setDescription] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(new Set());

  // Submission state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Load categories on mount
  useEffect(() => {
    let alive = true;
    api.categories
      .list()
      .then((cats) => {
        if (alive) setCategories(cats || []);
      })
      .catch((err) => console.warn("Failed to load categories:", err));
    return () => {
      alive = false;
    };
  }, []);

  const resetForm = () => {
    setName("");
    setFeedUrl("");
    setNetwork("Clear");
    setFetcher("FeedRs");
    setDescription("");
    setSelectedCategoryIds(new Set());
    setError(null);
    setSuccess(false);
  };

  const handleSave = async (close) => {
    if (!name.trim()) {
      setError("Source name is required");
      return;
    }
    if (!feedUrl.trim()) {
      setError("Feed URL is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Step 1: Create the source via the API service
      const informant = { [fetcher]: { feed_url: feedUrl.trim() } };
      const payload = {
        name: name.trim(),
        network,
        informant,
      };
      if (description.trim()) {
        payload.description = description.trim();
      }

      const sourceId = await api.sources.create(payload);

      // Step 2: Assign category if one was selected
      if (selectedCategoryIds.size > 0 && sourceId) {
        await Promise.all(
          [...selectedCategoryIds].map((id) =>
            api.sources.linkCategory(sourceId, id).catch((err) =>
              console.warn("Source created but category assignment failed:", err)
            )
          )
        );
      }

      setSuccess(true);
      if (onSourceAdded) onSourceAdded();

      // Auto-close after brief success message
      setTimeout(() => {
        resetForm();
        close();
      }, 1000);
    } catch (err) {
      setError(err.message || "Failed to create source");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popup
      trigger={trigger}
      modal
      nested
      overlayStyle={overlayStyle}
      contentStyle={{
        background: "transparent",
        border: "none",
        padding: 0,
        width: "auto",
      }}
      onClose={resetForm}
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
            boxShadow:
              "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(199,146,234,0.08)",
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: "28px" }}>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "#e8e6e1",
                margin: 0,
                marginBottom: "4px",
              }}
            >
              Add New Source
            </h2>
            <p style={{ fontSize: "12px", color: "#5a5a6a", margin: 0 }}>
              Configure a new news source
            </p>
          </div>

          {/* Success message */}
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
              Source created successfully!
            </div>
          )}

          {/* Error message */}
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

          {/* Form fields */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "18px" }}
          >
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Source Name *</label>
              <input
                type="text"
                placeholder="e.g. The Hacker News"
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

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Feed URL *</label>
              <input
                type="text"
                placeholder="e.g. https://feeds.feedburner.com/TheHackersNews"
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
                style={inputStyle}
                onFocus={(e) =>
                  (e.target.style.borderColor = "rgba(199,146,234,0.4)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "rgba(255,255,255,0.08)")
                }
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Description</label>
              <input
                type="text"
                placeholder="Optional description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={inputStyle}
                onFocus={(e) =>
                  (e.target.style.borderColor = "rgba(199,146,234,0.4)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "rgba(255,255,255,0.08)")
                }
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Network</label>
              <select
                className="aleym-select"
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                style={selectStyle}
              >
                <option value="Clear">Clear Net</option>
                <option value="Tor">Tor</option>
              </select>
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Fetcher</label>
              <select
                className="aleym-select"
                value={fetcher}
                onChange={(e) => setFetcher(e.target.value)}
                style={selectStyle}
              >
                <option value="FeedRs">Feed (RSS/Atom)</option>
              </select>
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Categories</label>

              {/* Selected category pills */}
              {selectedCategoryIds.size > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "4px" }}>
                  {[...selectedCategoryIds].map((id) => {
                    const cat = categories.find((c) => c.id === id);
                    if (!cat) return null;
                    return (
                      <div
                        key={id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "4px 10px",
                          borderRadius: "20px",
                          background: "rgba(130,170,255,0.12)",
                          border: "1px solid rgba(130,170,255,0.25)",
                          fontSize: "12px",
                          color: "#82aaff",
                          fontWeight: 500,
                        }}
                      >
                        {cat.name}
                        <span
                          onClick={() =>
                            setSelectedCategoryIds((prev) => {
                              const next = new Set(prev);
                              next.delete(id);
                              return next;
                            })
                          }
                          style={{ cursor: "pointer", lineHeight: 1, opacity: 0.7, fontSize: "14px" }}
                        >
                          ×
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Dropdown trigger */}
              <div style={{ position: "relative" }}>
                <div
                  onClick={() => setDropdownOpen((o) => !o)}
                  style={{
                    ...inputStyle,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    userSelect: "none",
                    borderColor: dropdownOpen ? "rgba(199,146,234,0.4)" : "rgba(255,255,255,0.08)",
                  }}
                >
                  <span style={{ color: selectedCategoryIds.size === 0 ? "#5a5a6a" : "#e8e6e1", fontSize: "14px" }}>
                    {selectedCategoryIds.size === 0
                      ? "Select categories…"
                      : `${selectedCategoryIds.size} selected`}
                  </span>
                  <svg
                    width="12"
                    height="8"
                    viewBox="0 0 12 8"
                    fill="none"
                    style={{
                      flexShrink: 0,
                      transition: "transform 0.2s ease",
                      transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    <path d="M1 1.5L6 6.5L11 1.5" stroke="#6a6a7a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                {/* Dropdown menu */}
                {dropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      left: 0,
                      right: 0,
                      background: "#16161c",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "10px",
                      boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                      zIndex: 100,
                      maxHeight: "180px",
                      overflowY: "auto",
                      padding: "4px",
                    }}
                  >
                    {categories.length === 0 ? (
                      <p style={{ fontSize: "12px", color: "#5a5a6a", padding: "10px 12px", margin: 0 }}>
                        No categories available
                      </p>
                    ) : (
                      categories.map((c) => {
                        const selected = selectedCategoryIds.has(c.id);
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedCategoryIds((prev) => {
                                const next = new Set(prev);
                                selected ? next.delete(c.id) : next.add(c.id);
                                return next;
                              });
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "9px 12px",
                              borderRadius: "7px",
                              cursor: "pointer",
                              background: selected ? "rgba(130,170,255,0.08)" : "transparent",
                              transition: "background 0.15s ease",
                            }}
                          >
                            <span style={{ fontSize: "13px", color: selected ? "#82aaff" : "#b0b0c0" }}>
                              {c.name}
                            </span>
                            {selected && (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#82aaff" strokeWidth="2.5" strokeLinecap="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "28px",
              paddingTop: "20px",
              borderTop: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <button
              onClick={() => {
                resetForm();
                close();
              }}
              onMouseEnter={() => setHoveredBtn("cancel")}
              onMouseLeave={() => setHoveredBtn(null)}
              disabled={saving}
              style={{
                padding: "10px 24px",
                fontSize: "14px",
                fontWeight: 500,
                fontFamily: "'DM Sans', sans-serif",
                borderRadius: "10px",
                border: "1px solid",
                borderColor:
                  hoveredBtn === "cancel"
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(255,255,255,0.06)",
                background:
                  hoveredBtn === "cancel"
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(255,255,255,0.03)",
                color: "#b0b0c0",
                cursor: saving ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
                opacity: saving ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => handleSave(close)}
              onMouseEnter={() => setHoveredBtn("save")}
              onMouseLeave={() => setHoveredBtn(null)}
              disabled={saving || success}
              style={{
                padding: "10px 28px",
                fontSize: "14px",
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(135deg, #c792ea, #82aaff)",
                color: "#0e0e12",
                cursor: saving || success ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                transform:
                  hoveredBtn === "save" && !saving
                    ? "translateY(-1px)"
                    : "translateY(0)",
                boxShadow:
                  hoveredBtn === "save" && !saving
                    ? "0 6px 24px rgba(199,146,234,0.3)"
                    : "none",
                opacity: saving ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {saving && (
                <div
                  style={{
                    width: "14px",
                    height: "14px",
                    border: "2px solid rgba(14,14,18,0.3)",
                    borderTop: "2px solid #0e0e12",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
              )}
              {saving ? "Saving…" : "Save"}
            </button>
          </div>

          <style>{`
            @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }

            select.aleym-select {
              color-scheme: dark;
            }
            select.aleym-select option {
              background-color: #16161c;
              color: #e8e6e1;
              padding: 10px 12px;
              font-family: 'DM Sans', sans-serif;
              font-size: 14px;
            }
            select.aleym-select option:checked,
            select.aleym-select option:hover {
              background: linear-gradient(0deg, rgba(199,146,234,0.2), rgba(199,146,234,0.2)) #16161c;
              color: #e8e6e1;
            }
            select.aleym-select option:disabled {
              color: #5a5a6a;
            }
          `}</style>
        </div>
      )}
    </Popup>
  );
}
