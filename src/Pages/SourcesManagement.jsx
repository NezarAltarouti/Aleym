import { useState } from "react";
import AddNewSource from "../components/AddNewSource";
import NewCategory from "../components/NewCategory";
import SourceTable from "../components/SourceTable";

export default function SourcesManagement({ navigateTo }) {
  const [hovered, setHovered] = useState(null);

  const buttonBase = {
    border: "none",
    borderRadius: "12px",
    padding: "14px 36px",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  };

  const primaryStyle = (key) => ({
    ...buttonBase,
    background: "linear-gradient(135deg, #c792ea, #82aaff)",
    color: "#0e0e12",
    transform: hovered === key ? "translateY(-2px)" : "translateY(0)",
    boxShadow:
      hovered === key ? "0 8px 30px rgba(199,146,234,0.3)" : "none",
  });

  const outlineStyle = (key) => ({
    ...buttonBase,
    background:
      hovered === key ? "rgba(199,146,234,0.08)" : "rgba(255,255,255,0.03)",
    color: hovered === key ? "#c792ea" : "#b0b0c0",
    border: "1px solid",
    borderColor:
      hovered === key ? "rgba(199,146,234,0.3)" : "rgba(255,255,255,0.08)",
    transform: hovered === key ? "translateY(-2px)" : "translateY(0)",
    boxShadow:
      hovered === key ? "0 8px 30px rgba(199,146,234,0.15)" : "none",
  });

  return (
     <div
    style={{
      minHeight: "100vh",
      background: "#0e0e12",
      color: "#e8e6e1",
      fontFamily: "'DM Sans', sans-serif",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      marginTop: "200px",
      gap: "200px",
      padding: "60px",
      animation: "fadeSlideUp 0.6s ease forwards 0.1s",
    }}
  >
    {/* LEFT SIDE */}
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minWidth: "280px",
        marginbottom: "50px",
        paddingLeft: "20px",
        paddingRight: "20px",
      }}
    >
      {/* Page Title */}
      <p
        style={{
          fontSize: "13px",
          letterSpacing: "3px",
          textTransform: "uppercase",
          color: "#82aaff",
          marginBottom: "40px",
        }}
      >
        Sources Management
      </p>

      {/* Left Side Buttons */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          width: "100%",
        }}
      >
        {/* Go Back to Home */}
        <button
          onClick={() => navigateTo("home")}
          onMouseEnter={() => setHovered("back")}
          onMouseLeave={() => setHovered(null)}
          style={primaryStyle("back")}
        >
          ← Back to Home
        </button>
        {/* Add New Source */}
        <AddNewSource
          trigger={
            <button
              onMouseEnter={() => setHovered("source")}
              onMouseLeave={() => setHovered(null)}
              style={outlineStyle("source")}
            >
              Add New Source
            </button>
          }
        />
        {/* Add New Category */}
        <NewCategory
          trigger={
            <button
              onMouseEnter={() => setHovered("category")}
              onMouseLeave={() => setHovered(null)}
              style={outlineStyle("category")}
            >
              Add New Category
            </button>
          }
        />
      </div>
    </div>

    {/* Sources Table */}
    <div style={{ flex: 1 }}>
      <SourceTable />
    </div>
  </div>
  );
}