import { useState } from "react";
import Popup from "reactjs-popup";

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

export default function NewCategory({ trigger, onCategoryAdded }) {
  const [hoveredBtn, setHoveredBtn] = useState(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Submission state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const resetForm = () => {
    setName("");
    setDescription("");
    setError(null);
    setSuccess(false);
  };

  const handleSave = async (close) => {
    if (!name.trim()) {
      setError("Category name is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const body = { name: name.trim() };
      if (description.trim()) {
        body.description = description.trim();
      }

      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Server error: ${res.status}`);
      }

      setSuccess(true);
      if (onCategoryAdded) onCategoryAdded();

      setTimeout(() => {
        resetForm();
        close();
      }, 1000);
    } catch (err) {
      setError(err.message || "Failed to create category");
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
              "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(130,170,255,0.08)",
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
              Add New Category
            </h2>
            <p style={{ fontSize: "12px", color: "#5a5a6a", margin: 0 }}>
              Create a new category for organizing sources
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
              Category created successfully!
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
              <label style={labelStyle}>Category Name *</label>
              <input
                type="text"
                placeholder="e.g. Cybersecurity"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
                onFocus={(e) =>
                  (e.target.style.borderColor = "rgba(130,170,255,0.4)")
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
                  (e.target.style.borderColor = "rgba(130,170,255,0.4)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "rgba(255,255,255,0.08)")
                }
              />
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
                background: "linear-gradient(135deg, #82aaff, #c792ea)",
                color: "#0e0e12",
                cursor: saving || success ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                transform:
                  hoveredBtn === "save" && !saving
                    ? "translateY(-1px)"
                    : "translateY(0)",
                boxShadow:
                  hoveredBtn === "save" && !saving
                    ? "0 6px 24px rgba(130,170,255,0.3)"
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

          <style>{`@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`}</style>
        </div>
      )}
    </Popup>
  );
}
