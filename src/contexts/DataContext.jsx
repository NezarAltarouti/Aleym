import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../services/aleymApi";

const DataContext = createContext();

export function DataProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [sources, setSources] = useState({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Single categories fetch shared by both
      const categoriesData = await api.categories.list();

      // Deduplicate categories by id
      const seen = new Set();
      const uniqueCategories = (categoriesData || []).filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });
      setCategories(uniqueCategories);

      // Fetch sources per category
      const grouped = {};
      await Promise.all(
        uniqueCategories.map(async (category) => {
          try {
            const data = await api.categories.sources(category.id);
            // Deduplicate sources within each category
            const seenSrc = new Set();
            grouped[category.id] = (data || []).filter((s) => {
              if (seenSrc.has(s.id)) return false;
              seenSrc.add(s.id);
              return true;
            });
          } catch (e) {
            grouped[category.id] = [];
          }
        }),
      );
      setSources(grouped);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <DataContext.Provider value={{
      categories,
      sources,
      loading,
      refreshCategories: loadData,
      refreshSources: loadData,
      refreshAll: loadData,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}