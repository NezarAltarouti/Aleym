import { useState, useEffect } from "react";
import { useData } from "../contexts/DataContext";

const SIDEBAR_WIDTH_OPEN = 260;
const SIDEBAR_WIDTH_CLOSED = 72;

const navItems = [
  {
    key: "aleym",
    label: "Aleym Feed",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    key: "foryou",
    label: "For You",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    key: "sources",
    label: "Sources Management",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
  },
];

const EMPTY_ARRAY = [];

export default function Sidebar({
  open,
  setOpen,
  navigateTo,
  selectedCategoryIds = EMPTY_ARRAY,
  selectedSourceIds = EMPTY_ARRAY,
  disableTransition = false,
}) {
  const [hovered, setHovered] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [selectedSources, setSelectedSources] = useState(new Set());
  const { categories, sources, loading } = useData();

  const width = open ? SIDEBAR_WIDTH_OPEN : SIDEBAR_WIDTH_CLOSED;
  const PADDING_X = 16;
  const ICON_AREA = 40;
  const transition = disableTransition ? "none" : "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)";

  useEffect(() => {
    const categorySet = new Set(Array.isArray(selectedCategoryIds) ? selectedCategoryIds : selectedCategoryIds ? [selectedCategoryIds] : []);
    const sourceSet = new Set(Array.isArray(selectedSourceIds) ? selectedSourceIds : selectedSourceIds ? [selectedSourceIds] : []);

    setSelectedCategories(categorySet);
    setSelectedSources(sourceSet);

    const expanded = {};
    categories.forEach((category) => {
      const hasSelectedSource = (sources[category.id] || []).some((source) => sourceSet.has(source.id));
      expanded[category.id] = categorySet.has(category.id) || hasSelectedSource;
    });
    setExpandedCategories(expanded);
  }, [selectedCategoryIds, selectedSourceIds, categories, sources]);

  const navigateToFeed = () => {
    navigateTo("aleym", {
      categoryIds: Array.from(selectedCategories),
      sourceIds: Array.from(selectedSources),
    });
  };

  const toggleCategorySelection = (categoryId) => {
    const newSet = new Set(selectedCategories);
    if (newSet.has(categoryId)) newSet.delete(categoryId);
    else newSet.add(categoryId);
    setSelectedCategories(newSet);

    navigateTo("aleym", {
      categoryIds: Array.from(newSet),
      sourceIds: Array.from(selectedSources),
    });
  };

  const toggleSourceSelection = (sourceId) => {
    const newSet = new Set(selectedSources);
    if (newSet.has(sourceId)) newSet.delete(sourceId);
    else newSet.add(sourceId);
    setSelectedSources(newSet);

    navigateTo("aleym", {
      categoryIds: Array.from(selectedCategories),
      sourceIds: Array.from(newSet),
    });
  };

  const getSourcesForCategory = (categoryId) => {
    return sources[categoryId] || [];
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: `${width}px`,
        height: "100vh",
        background: "#131318",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        transition,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'DM Sans', sans-serif",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: `20px ${PADDING_X}px`,
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          minHeight: "68px",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: open ? "90px" : `${ICON_AREA}px`,
            height: `${ICON_AREA}px`,
            borderRadius: "12px",
            background: "linear-gradient(135deg, #c792ea, #82aaff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "15px",
            fontWeight: 700,
            color: "#0e0e12",
            flexShrink: 0,
            cursor: "pointer",
            transition,
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
          onClick={() => setOpen(!open)}
        >
          {open ? "Alyem" : "A"}
        </div>

        <span
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "#e8e6e1",
            whiteSpace: "nowrap",
            overflow: "hidden",
            opacity: open ? 1 : 0,
            transition: "opacity 0.2s ease",
            flex: 1,
            minWidth: 0,
          }}
        >
          News & More
        </span>

        <button
          onClick={() => setOpen(!open)}
          style={{
            width: "0px",
            height: "0px",
            overflow: "hidden",
            opacity: 0,
            padding: 0,
            border: "none",
            position: "absolute",
          }}
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
        />
      </div>

      <nav style={{ padding: `16px ${PADDING_X}px`, flex: 1 }}>
        <p
          style={{
            fontSize: "11px",
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: "#5a5a6a",
            paddingLeft: "10px",
            marginBottom: "8px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            opacity: open ? 1 : 0,
            height: open ? "20px" : "0px",
            marginTop: 0,
            transition: "opacity 0.2s ease, height 0.3s ease, margin 0.3s ease",
          }}
        >
          Navigation
        </p>

        {navItems.map((item) => {
          const isHovered = hovered === item.key;

          return (
            <div key={item.key} style={{ position: "relative", marginBottom: "4px" }}>
              <button
                onClick={() => {
                  if (item.key === "aleym") {
                    navigateToFeed();
                  } else {
                    navigateTo(item.key);
                  }
                }}
                onMouseEnter={() => setHovered(item.key)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  width: "100%",
                  height: "44px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: `0 10px`,
                  background: isHovered ? "rgba(199,146,234,0.08)" : "transparent",
                  border: "1px solid",
                  borderColor: isHovered ? "rgba(199,146,234,0.15)" : "transparent",
                  borderRadius: "10px",
                  color: isHovered ? "#c792ea" : "#b0b0c0",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
                  textAlign: "left",
                  fontFamily: "inherit",
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    width: "20px",
                    height: "20px",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {item.icon}
                </span>
                <span
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    opacity: open ? 1 : 0,
                    transition: "opacity 0.2s ease",
                    minWidth: 0,
                  }}
                >
                  {item.label}
                </span>
              </button>

              {!open && isHovered && (
                <div
                  style={{
                    position: "fixed",
                    left: `${SIDEBAR_WIDTH_CLOSED + 8}px`,
                    background: "#1e1e26",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    padding: "7px 14px",
                    fontSize: "13px",
                    color: "#e8e6e1",
                    whiteSpace: "nowrap",
                    zIndex: 300,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                    pointerEvents: "none",
                  }}
                >
                  {item.label}
                </div>
              )}
            </div>
          );
        })}

        {open && !loading && categories.length > 0 && (
          <>
            <p
              style={{
                fontSize: "11px",
                letterSpacing: "2px",
                textTransform: "uppercase",
                color: "#5a5a6a",
                paddingLeft: "10px",
                marginBottom: "8px",
                marginTop: "16px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                opacity: open ? 1 : 0,
                height: open ? "20px" : "0px",
                transition: "opacity 0.2s ease, height 0.3s ease, margin 0.3s ease",
              }}
            >
              Categories
            </p>

            {categories.map((category) => {
              const isExpanded = expandedCategories[category.id];
              const categorySources = getSourcesForCategory(category.id);
              const categoryHovered = hovered === `category-${category.id}`;
              const isSelected = selectedCategories.has(category.id);

              return (
                <div key={category.id} style={{ marginBottom: "4px" }}>
                  <button
                    onClick={() => {
                      toggleCategorySelection(category.id);
                      toggleCategory(category.id);
                    }}
                    onMouseEnter={() => setHovered(`category-${category.id}`)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      width: "100%",
                      height: "40px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "0 10px",
                      background: isSelected
                        ? "rgba(130,170,255,0.12)"
                        : categoryHovered
                        ? "rgba(130,170,255,0.08)"
                        : "transparent",
                      border: "1px solid",
                      borderColor: isSelected
                        ? "rgba(130,170,255,0.25)"
                        : categoryHovered
                        ? "rgba(130,170,255,0.15)"
                        : "transparent",
                      borderRadius: "8px",
                      color: isSelected ? "#82aaff" : categoryHovered ? "#82aaff" : "#7a7a8a",
                      fontSize: "13px",
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
                      textAlign: "left",
                      fontFamily: "inherit",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        width: "16px",
                        height: "16px",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "transform 0.2s ease",
                        transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                        opacity: open ? 1 : 0,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </span>

                    <span
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        opacity: open ? 1 : 0,
                        transition: "opacity 0.2s ease",
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      {category.name}
                    </span>

                    {open && (
                      <span
                        style={{
                          fontSize: "11px",
                          background: "rgba(199,146,234,0.15)",
                          color: "#c792ea",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          flexShrink: 0,
                          opacity: open ? 1 : 0,
                          transition: "opacity 0.2s ease",
                        }}
                      >
                        {categorySources.length}
                      </span>
                    )}
                  </button>

                  {isExpanded && categorySources.length > 0 && (
                    <div
                      style={{
                        marginTop: "4px",
                        marginLeft: "16px",
                        borderLeft: "1px solid rgba(255,255,255,0.05)",
                        paddingLeft: "8px",
                        maxHeight: "300px",
                        overflowY: "auto",
                      }}
                    >
                      {categorySources.map((source) => {
                        const sourceHovered = hovered === `source-${source.id}`;
                        const isSelectedSource = selectedSources.has(source.id);
                        return (
                          <button
                            key={`${category.id}-${source.id}`}
                            onClick={() => toggleSourceSelection(source.id)}
                            onMouseEnter={() => setHovered(`source-${source.id}`)}
                            onMouseLeave={() => setHovered(null)}
                            style={{
                              width: "100%",
                              height: "32px",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "0 10px",
                              background: isSelectedSource
                                ? "rgba(199,146,234,0.12)"
                                : sourceHovered
                                ? "rgba(199,146,234,0.08)"
                                : "transparent",
                              border: "1px solid",
                              borderColor: isSelectedSource
                                ? "rgba(199,146,234,0.25)"
                                : sourceHovered
                                ? "rgba(199,146,234,0.12)"
                                : "transparent",
                              borderRadius: "6px",
                              color: isSelectedSource ? "#c792ea" : sourceHovered ? "#c792ea" : "#8a8a9a",
                              fontSize: "12px",
                              fontWeight: 400,
                              cursor: "pointer",
                              transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
                              textAlign: "left",
                              fontFamily: "inherit",
                              overflow: "hidden",
                              marginBottom: "2px",
                            }}
                          >
                            <span
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                background: isSelectedSource ? "#c792ea" : sourceHovered ? "#c792ea" : "#6a6a7a",
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                opacity: open ? 1 : 0,
                                transition: "opacity 0.2s ease",
                                minWidth: 0,
                              }}
                            >
                              {source.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {!open && categoryHovered && (
                    <div
                      style={{
                        position: "fixed",
                        left: `${SIDEBAR_WIDTH_CLOSED + 8}px`,
                        background: "#1e1e26",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        padding: "7px 14px",
                        fontSize: "12px",
                        color: "#e8e6e1",
                        whiteSpace: "nowrap",
                        zIndex: 300,
                        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                        pointerEvents: "none",
                      }}
                    >
                      {category.name} ({categorySources.length})
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </nav>

      <div
        style={{
          padding: `12px ${PADDING_X}px`,
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <button
          onClick={() => setOpen(!open)}
          onMouseEnter={() => setHovered("toggle")}
          onMouseLeave={() => setHovered(null)}
          style={{
            width: "100%",
            height: "44px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "0 10px",
            background: hovered === "toggle" ? "rgba(255,255,255,0.05)" : "transparent",
            border: "1px solid",
            borderColor: hovered === "toggle" ? "rgba(255,255,255,0.08)" : "transparent",
            borderRadius: "10px",
            color: hovered === "toggle" ? "#e8e6e1" : "#6a6a7a",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
            transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
            textAlign: "left",
            fontFamily: "inherit",
            overflow: "hidden",
          }}
        >
          <span
            style={{
              width: "20px",
              height: "20px",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: open ? "rotate(0deg)" : "rotate(180deg)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="11 17 6 12 11 7" />
              <polyline points="18 17 13 12 18 7" />
            </svg>
          </span>
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              opacity: open ? 1 : 0,
              transition: "opacity 0.2s ease",
              minWidth: 0,
            }}
          >
            Collapse
          </span>
        </button>
      </div>
    </div>
  );
}

export { SIDEBAR_WIDTH_OPEN, SIDEBAR_WIDTH_CLOSED };
