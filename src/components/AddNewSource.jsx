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

export default function AddNewSource({ trigger }) {
  const [hoveredBtn, setHoveredBtn] = useState(null);

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
            boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(199,146,234,0.08)",
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

          {/* Form fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Source Name</label>
              <input
                type="text"
                placeholder="Enter a source name"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "rgba(199,146,234,0.4)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Source ID or URL</label>
              <input
                type="text"
                placeholder="Enter the source ID or URL"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "rgba(199,146,234,0.4)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Networking Method</label>
              <select style={selectStyle}>
                <option value="tor">Tor</option>
                <option value="clearNet">Clear Net</option>
              </select>
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Used Fetcher</label>
              <select style={selectStyle}>
                <option value="Atom">Atom Fetcher</option>
                <option value="RSS">RSS Fetcher</option>
              </select>
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Category</label>
              <select style={selectStyle}>
                <option value="Cyber">Cybersecurity</option>
              </select>
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
              onClick={close}
              onMouseEnter={() => setHoveredBtn("cancel")}
              onMouseLeave={() => setHoveredBtn(null)}
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
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Cancel
            </button>
            <button
              onMouseEnter={() => setHoveredBtn("save")}
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
                cursor: "pointer",
                transition: "all 0.2s ease",
                transform:
                  hoveredBtn === "save" ? "translateY(-1px)" : "translateY(0)",
                boxShadow:
                  hoveredBtn === "save"
                    ? "0 6px 24px rgba(199,146,234,0.3)"
                    : "none",
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </Popup>
  );
}