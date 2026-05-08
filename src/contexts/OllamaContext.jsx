import { createContext, useContext } from "react";
import useOllamaStatus from "../hooks/useOllamaStatus";

const OllamaContext = createContext(null);

export function OllamaProvider({ children }) {
  const value = useOllamaStatus();
  return (
    <OllamaContext.Provider value={value}>{children}</OllamaContext.Provider>
  );
}

export function useOllama() {
  const ctx = useContext(OllamaContext);
  if (!ctx) {
    throw new Error("useOllama must be used inside <OllamaProvider>");
  }
  return ctx;
}