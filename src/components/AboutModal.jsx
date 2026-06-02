import { version, description } from "../../package.json";

const GITHUB_URL = "https://github.com/NezarAltarouti/Aleym"; 

export default function AboutModal({ onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1e1e26",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "20px",
          padding: "32px",
          width: "500px",
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
          fontFamily: "'DM Sans', sans-serif",
          color: "#e8e6e1",
        }}
      >
        {/* Header row: logo + name/version + github link */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #c792ea, #82aaff)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "15px",
              fontWeight: 700,
              color: "#0e0e12",
              flexShrink: 0,
            }}
          >
            A
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "16px", fontWeight: 700 }}>Aleym</div>
            <div style={{ fontSize: "12px", color: "#6a6a7a" }}>Version {version}</div>
          </div>
          
            <a href={GITHUB_URL}
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
        <p style={{ fontSize: "13px", lineHeight: 1.7, color: "#9a9aaa", margin: "0 0 24px 0" }}>
          {description}
        </p>

        {/* License section */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: "20px",
            marginBottom: "24px",
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
              
                <a href="https://www.gnu.org/licenses/"
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

        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "10px",
            background: "rgba(199,146,234,0.1)",
            border: "1px solid rgba(199,146,234,0.2)",
            borderRadius: "10px",
            color: "#c792ea",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}