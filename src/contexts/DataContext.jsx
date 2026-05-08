import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../services/aleymApi";

const DataContext = createContext();

export function DataProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [sources, setSources] = useState({});
  const [loading, setLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    try {
      const data = await api.categories.list();
      setCategories(data || []);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  }, []);

  const loadSources = useCallback(async () => {
    try {
      const categoriesData = await api.categories.list();
      const grouped = {};
      await Promise.all(
        (categoriesData || []).map(async (category) => {
          try {
            const data = await api.categories.sources(category.id);
            grouped[category.id] = data || [];
          } catch (e) {
            grouped[category.id] = [];
          }
        }),
      );
      setSources(grouped);
    } catch (error) {
      console.error("Failed to load sources:", error);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadCategories(), loadSources()]);
    setLoading(false);
  }, [loadCategories, loadSources]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshCategories = useCallback(() => {
    loadCategories();
    loadSources(); // Refresh sources too since categories might affect grouping
  }, [loadCategories, loadSources]);

  const refreshSources = useCallback(() => {
    loadSources();
  }, [loadSources]);

  const refreshAll = useCallback(() => {
    loadData();
  }, [loadData]);

  return (
    <DataContext.Provider value={{
      categories,
      sources,
      loading,
      refreshCategories,
      refreshSources,
      refreshAll,
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